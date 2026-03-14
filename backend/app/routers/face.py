"""Face enrollment, facepay, and charge-by-face endpoints."""
from fastapi import APIRouter, Header, HTTPException, Depends
from app.db import get_supabase
from app.models.schemas import EnrollFaceRequest, FacePayRequest, ChargeByFaceRequest
from app.services.embedding import parse_embedding, cosine_similarity
from app.services.payment import initiate_payment

router = APIRouter(tags=["face"])


def require_user_id(x_user_id: str | None = Header(None, alias="x-user-id")) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    return x_user_id


def require_merchant(
    x_merchant_id: str | None = Header(None, alias="x-merchant-id"),
    x_merchant_api_key: str | None = Header(None, alias="x-merchant-api-key"),
) -> tuple[str, str]:
    if not x_merchant_id or not x_merchant_api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing x-merchant-id or x-merchant-api-key header",
        )
    return x_merchant_id, x_merchant_api_key


@router.post("/enroll-face")
async def enroll_face(
    body: EnrollFaceRequest,
    user_id: str = Depends(require_user_id),
):
    """Enroll face embedding for customer."""
    supabase = get_supabase()
    r = supabase.table("user_profiles").select("id").eq(
        "external_user_id", user_id
    ).execute()
    profile = r.data[0] if r.data else None
    if not profile:
        ins = (
            supabase.table("user_profiles")
            .insert({"external_user_id": user_id, "phone_number": "pending"})
            .execute()
        )
        profile = ins.data[0] if ins.data else None
        if not profile:
            raise HTTPException(status_code=500, detail="Failed to create profile")
    profile_id = profile["id"]
    embedding_str = "[" + ",".join(str(x) for x in body.embedding) + "]"
    supabase.table("face_embeddings").delete().eq("user_id", profile_id).execute()
    ins = (
        supabase.table("face_embeddings")
        .insert({"user_id": profile_id, "embedding": embedding_str})
        .execute()
    )
    row = ins.data[0] if ins.data else {}
    return {"id": row.get("id")}


@router.post("/facepay")
async def facepay(
    body: FacePayRequest,
    user_id: str = Depends(require_user_id),
):
    """Pay by face (customer-initiated)."""
    supabase = get_supabase()
    r = supabase.table("user_profiles").select(
        "id, account_balance, phone_number"
    ).eq("external_user_id", user_id).execute()
    profile = r.data[0] if r.data else None
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    embs = (
        supabase.table("face_embeddings")
        .select("user_id, embedding")
        .eq("user_id", profile["id"])
        .execute()
    )
    user_emb = embs.data[0]["embedding"] if embs.data else None
    if not user_emb:
        raise HTTPException(status_code=400, detail="Face not enrolled")
    u = parse_embedding(user_emb)
    q = [float(x) for x in body.embedding]
    sim = cosine_similarity(u, q)
    if sim < 0.6:
        raise HTTPException(
            status_code=403,
            detail="Face match failed - identity not confirmed",
        )
    pending = (
        supabase.table("transactions")
        .select("amount")
        .eq("user_id", profile["id"])
        .eq("status", "PENDING")
        .execute()
    )
    pending_sum = sum(float(t["amount"]) for t in (pending.data or []))
    available = float(profile["account_balance"]) - pending_sum
    if available < body.amount:
        raise HTTPException(
            status_code=400,
            detail="Insufficient balance",
            extra={"available": available},
        )
    wallet = (
        supabase.table("wallets")
        .select("id, provider_wallet_id, provider")
        .eq("user_id", profile["id"])
        .limit(1)
        .execute()
    )
    w = wallet.data[0] if wallet.data else None
    phone = (w["provider_wallet_id"] if w else None) or profile.get("phone_number")
    if not phone or phone == "pending":
        raise HTTPException(
            status_code=400,
            detail="No wallet linked - add a wallet first",
        )
    tx_ins = (
        supabase.table("transactions")
        .insert(
            {
                "user_id": profile["id"],
                "wallet_id": w["id"] if w else None,
                "merchant_id": None,
                "amount": body.amount,
                "currency": body.currency,
                "status": "PENDING",
            }
        )
        .execute()
    )
    tx = tx_ins.data[0] if tx_ins.data else {}
    charge_id, provider, err = await initiate_payment(
        body.amount,
        phone,
        body.currency,
        str(tx["id"]),
        w.get("provider") if w else None,
    )
    if err or not charge_id:
        supabase.table("transactions").update({"status": "FAILED"}).eq(
            "id", tx["id"]
        ).execute()
        raise HTTPException(
            status_code=502,
            detail=f"Payment initiation failed: {err}",
        )
    update = (
        {"snippe_charge_id": charge_id, "payment_provider": "snippe"}
        if provider == "snippe"
        else {"tembo_transaction_id": charge_id, "payment_provider": "tembo"}
    )
    supabase.table("transactions").update(update).eq("id", tx["id"]).execute()
    return {
        **tx,
        "charge_id": charge_id,
        "payment_provider": provider,
        "message": "Enter PIN on your phone to complete payment",
    }


@router.post("/charge-by-face")
async def charge_by_face(
    body: ChargeByFaceRequest,
    creds: tuple[str, str] = Depends(require_merchant),
):
    """Charge customer by face (merchant-initiated)."""
    merchant_id, api_key = creds
    supabase = get_supabase()
    m = (
        supabase.table("merchants")
        .select("id")
        .eq("id", merchant_id)
        .eq("api_key", api_key)
        .execute()
    )
    if not m.data:
        raise HTTPException(status_code=401, detail="Invalid merchant credentials")
    embedding_str = "[" + ",".join(str(x) for x in body.embedding) + "]"
    try:
        match = supabase.rpc(
            "match_face_embedding",
            {
                "query_embedding": embedding_str,
                "match_threshold": 0.6,
                "match_count": 1,
            },
        ).execute()
    except Exception:
        match = None
    matched_user_id = None
    if match and match.data and len(match.data) > 0:
        matched_user_id = match.data[0].get("user_id")
    if not matched_user_id:
        all_embs = supabase.table("face_embeddings").select("user_id, embedding").execute()
        q = [float(x) for x in body.embedding]
        best_sim = 0.6
        for row in all_embs.data or []:
            u = parse_embedding(row["embedding"])
            sim = cosine_similarity(u, q)
            if sim > best_sim:
                best_sim = sim
                matched_user_id = row["user_id"]
    if not matched_user_id:
        raise HTTPException(status_code=404, detail="No matching face found")
    profile = (
        supabase.table("user_profiles")
        .select("id, account_balance, phone_number")
        .eq("id", matched_user_id)
        .execute()
    )
    p = profile.data[0] if profile.data else None
    if not p:
        raise HTTPException(status_code=404, detail="User not found")
    pending = (
        supabase.table("transactions")
        .select("amount")
        .eq("user_id", p["id"])
        .eq("status", "PENDING")
        .execute()
    )
    pending_sum = sum(float(t["amount"]) for t in (pending.data or []))
    available = float(p["account_balance"]) - pending_sum
    if available < body.amount:
        raise HTTPException(
            status_code=400,
            detail="Customer has insufficient balance",
            extra={"available": available},
        )
    wallet = (
        supabase.table("wallets")
        .select("id, provider_wallet_id, provider")
        .eq("user_id", p["id"])
        .limit(1)
        .execute()
    )
    w = wallet.data[0] if wallet.data else None
    phone = (w["provider_wallet_id"] if w else None) or p.get("phone_number")
    if not phone or phone == "pending":
        raise HTTPException(
            status_code=400,
            detail="Customer has no wallet linked",
        )
    tx_ins = (
        supabase.table("transactions")
        .insert(
            {
                "user_id": p["id"],
                "wallet_id": w["id"] if w else None,
                "merchant_id": m.data[0]["id"],
                "amount": body.amount,
                "currency": body.currency,
                "status": "PENDING",
                "reference": body.reference,
            }
        )
        .execute()
    )
    tx = tx_ins.data[0] if tx_ins.data else {}
    charge_id, provider, err = await initiate_payment(
        body.amount,
        phone,
        body.currency,
        str(tx["id"]),
        w.get("provider") if w else None,
    )
    if err or not charge_id:
        supabase.table("transactions").update({"status": "FAILED"}).eq(
            "id", tx["id"]
        ).execute()
        raise HTTPException(
            status_code=502,
            detail=f"Payment initiation failed: {err}",
        )
    update = (
        {"snippe_charge_id": charge_id, "payment_provider": "snippe"}
        if provider == "snippe"
        else {"tembo_transaction_id": charge_id, "payment_provider": "tembo"}
    )
    supabase.table("transactions").update(update).eq("id", tx["id"]).execute()
    return {
        **tx,
        "charge_id": charge_id,
        "payment_provider": provider,
        "message": "Customer is entering PIN on their phone",
    }
