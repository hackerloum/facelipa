"""Payment provider integration - Snippe and Tembo."""
import httpx
from app.config import settings

PROVIDER_TO_CHANNEL = {
    "airtel": "TZ-AIRTEL-C2B",
    "tigo": "TZ-TIGO-C2B",
    "mixx": "TZ-TIGO-C2B",
    "halopesa": "TZ-HALOTEL-C2B",
    "halotel": "TZ-HALOTEL-C2B",
}


def _normalize_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit()).lstrip("0")
    return f"255{digits}" if not digits.startswith("255") else digits


def _infer_tembo_channel(phone: str, provider: str | None) -> str:
    p = (provider or "").lower()
    if p in PROVIDER_TO_CHANNEL:
        return PROVIDER_TO_CHANNEL[p]
    digits = phone.replace("255", "", 1) if phone.startswith("255") else phone
    if digits.startswith("78") or digits.startswith("68"):
        return "TZ-AIRTEL-C2B"
    if digits.startswith("71") or digits.startswith("65"):
        return "TZ-TIGO-C2B"
    if digits.startswith("62"):
        return "TZ-HALOTEL-C2B"
    return "TZ-AIRTEL-C2B"


async def create_snippe_charge(
    amount: float, phone: str, currency: str = "TZS"
) -> tuple[str | None, str | None]:
    """Create Snippe STK push. Returns (charge_id, error)."""
    if not settings.snippe_api_key:
        return None, "SNIPPE_API_KEY not configured"
    full_phone = _normalize_phone(phone)
    if len(full_phone) < 9:
        return None, "Invalid phone number"
    payload = {
        "payment_type": "mobile",
        "details": {"amount": int(round(amount)), "currency": currency},
        "phone_number": full_phone,
        "customer": {
            "firstname": "Customer",
            "lastname": "FaceLipa",
            "email": "customer@facelipa.local",
        },
    }
    if settings.webhook_base_url:
        payload["webhook_url"] = f"{settings.webhook_base_url}/snippe-webhook"
    import uuid
    headers = {
        "Authorization": f"Bearer {settings.snippe_api_key}",
        "Content-Type": "application/json",
        "Idempotency-Key": f"facelipa-{uuid.uuid4()}",
    }
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(
                "https://api.snippe.sh/v1/payments",
                json=payload,
                headers=headers,
            )
            data = r.json() if r.content else {}
            ref = data.get("data", {}).get("reference") or data.get("reference") or data.get("id")
            if not r.is_success:
                err = data.get("message") or data.get("error") or f"HTTP {r.status_code}"
                return None, err
            return str(ref) if ref else None, None
        except Exception as e:
            return None, str(e)


async def create_tembo_collection(
    amount: float,
    phone: str,
    transaction_ref: str,
    wallet_provider: str | None = None,
) -> tuple[str | None, str | None]:
    """Create Tembo collection (STK push). Returns (charge_id, error)."""
    if not settings.tembo_account_id or not settings.tembo_secret_key:
        return None, "TEMBO_ACCOUNT_ID and TEMBO_SECRET_KEY not configured"
    msisdn = _normalize_phone(phone)
    if len(msisdn) < 9:
        return None, "Invalid phone number"
    amount_int = int(round(amount))
    if amount_int < 1000:
        return None, "Tembo minimum amount is 1,000 TZS"
    if amount_int > 5_000_000:
        return None, "Tembo maximum amount is 5,000,000 TZS"
    base = (
        "https://sandbox.temboplus.com/tembo/v1"
        if settings.tembo_sandbox
        else "https://api.temboplus.com/tembo/v1"
    )
    channel = _infer_tembo_channel(msisdn, wallet_provider)
    payload = {
        "channel": channel,
        "msisdn": msisdn,
        "amount": amount_int,
        "transactionRef": transaction_ref,
        "narration": f"FaceLipa payment {transaction_ref}",
        "transactionDate": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }
    if settings.webhook_base_url:
        payload["callbackUrl"] = f"{settings.webhook_base_url}/tembo-webhook"
    headers = {
        "Content-Type": "application/json",
        "x-account-id": settings.tembo_account_id,
        "x-secret-key": settings.tembo_secret_key,
        "x-request-id": str(__import__("uuid").uuid4()),
    }
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(f"{base}/collection", json=payload, headers=headers)
            data = r.json() if r.content else {}
            tx_id = data.get("transactionId") or data.get("transactionRef")
            if not r.is_success:
                err = data.get("message") or data.get("reason") or f"HTTP {r.status_code}"
                return None, err
            return str(tx_id) if tx_id else None, None
        except Exception as e:
            return None, str(e)


async def initiate_payment(
    amount: float,
    phone: str,
    currency: str,
    transaction_ref: str,
    wallet_provider: str | None = None,
) -> tuple[str | None, str, str | None]:
    """Initiate STK push. Returns (charge_id, provider, error)."""
    preferred = (settings.payment_provider or "snippe").lower()
    if preferred == "tembo":
        cid, err = await create_tembo_collection(
            amount, phone, transaction_ref, wallet_provider
        )
        if cid:
            return cid, "tembo", None
        cid2, _ = await create_snippe_charge(amount, phone, currency)
        if cid2:
            return cid2, "snippe", None
        return None, "tembo", err
    cid, err = await create_snippe_charge(amount, phone, currency)
    if cid:
        return cid, "snippe", None
    cid2, err2 = await create_tembo_collection(
        amount, phone, transaction_ref, wallet_provider
    )
    if cid2:
        return cid2, "tembo", None
    return None, "snippe", err or err2
