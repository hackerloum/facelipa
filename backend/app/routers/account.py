"""Account summary and deposit endpoints."""
from fastapi import APIRouter, Header, HTTPException, Depends
from app.db import get_supabase
from app.models.schemas import DepositRequest

router = APIRouter(tags=["account"])


def require_user_id(x_user_id: str | None = Header(None, alias="x-user-id")) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    return x_user_id


@router.get("/account-summary")
async def account_summary(
    user_id: str = Depends(require_user_id),
):
    """Get balance, wallets, and recent transactions."""
    supabase = get_supabase()
    r = supabase.table("user_profiles").select("id, account_balance").eq(
        "external_user_id", user_id
    ).execute()
    profile = r.data[0] if r.data else None
    balance = float(profile["account_balance"]) if profile else 0
    profile_id = profile["id"] if profile else None
    wallets = []
    transactions = []
    if profile_id:
        w = supabase.table("wallets").select("*").eq("user_id", profile_id).execute()
        wallets = w.data or []
        t = (
            supabase.table("transactions")
            .select("*")
            .eq("user_id", profile_id)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        transactions = t.data or []
    return {"balance": balance, "wallets": wallets, "transactions": transactions}


@router.post("/deposit")
async def deposit(
    body: DepositRequest,
    user_id: str = Depends(require_user_id),
):
    """Deposit funds (dev only)."""
    supabase = get_supabase()
    r = supabase.table("user_profiles").select("id, account_balance").eq(
        "external_user_id", user_id
    ).execute()
    profile = r.data[0] if r.data else None
    if not profile:
        ins = (
            supabase.table("user_profiles")
            .insert(
                {
                    "external_user_id": user_id,
                    "phone_number": "pending",
                    "account_balance": body.amount,
                }
            )
            .execute()
        )
        new = ins.data[0] if ins.data else {}
        return {"balance": float(new.get("account_balance", body.amount))}
    new_balance = float(profile["account_balance"]) + body.amount
    supabase.table("user_profiles").update(
        {"account_balance": new_balance}
    ).eq("id", profile["id"]).execute()
    return {"balance": new_balance}
