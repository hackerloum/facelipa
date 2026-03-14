# FaceLipa Backend — FastAPI Build Prompt

Use this document as a prompt to generate a **FastAPI backend** that replicates the FaceLipa biometric mobile-money platform API. The backend can run standalone or alongside Supabase Edge Functions, sharing the same Postgres database.

---

## Platform Overview

**FaceLipa** is a biometric mobile-money payment MVP. Customers register, enroll their face (128-d embeddings), link a mobile wallet (M-Pesa, Airtel, etc.), and pay at merchant terminals by face scan. Merchants capture the customer's face → identify them → initiate an STK/USSD push → customer enters PIN on phone → transaction completes.

---

## Tech Requirements

| Component | Requirement |
|-----------|-------------|
| Framework | **FastAPI** |
| Python | 3.11+ |
| Database | **Supabase Postgres** (pgvector for face embeddings) |
| HTTP Client | `httpx` (async) |
| ORM / DB | `supabase-py` or `asyncpg` + SQLAlchemy |
| Vector Search | pgvector extension, or numpy fallback for cosine similarity |

---

## API Base URL

```
http://localhost:8000   # local
https://your-api.example.com   # production
```

---

## API Endpoints Reference

### Auth Headers (Dev Mode)

| Context | Header | Description |
|---------|--------|-------------|
| Customer | `x-user-id` | Customer UUID (from registration) |
| Merchant | `x-merchant-id` | Merchant UUID |
| Merchant | `x-merchant-api-key` | Merchant API key |

---

### 1. Account Summary (Customer)

**GET** `/account-summary`

**Headers:** `x-user-id` (required)

**Response 200:**
```json
{
  "balance": 15000.00,
  "wallets": [
    {
      "id": "uuid",
      "provider": "mpesa",
      "provider_wallet_id": "255712345678",
      "currency": "TZS"
    }
  ],
  "transactions": [
    {
      "id": "uuid",
      "amount": 5000,
      "currency": "TZS",
      "status": "AUTHORIZED",
      "created_at": "2025-03-14T12:00:00Z"
    }
  ]
}
```

**Errors:** `401` — missing x-user-id

---

### 2. Deposit (Customer)

**POST** `/deposit`

**Headers:** `x-user-id` (required)

**Body:**
```json
{
  "amount": 10000
}
```

**Response 200:**
```json
{
  "balance": 25000.00
}
```

**Errors:** `400` — invalid amount; `401` — missing x-user-id

---

### 3. Enroll Face (Customer)

**POST** `/enroll-face`

**Headers:** `x-user-id` (required)

**Body:**
```json
{
  "embedding": [0.123, -0.456, ...]
}
```

- `embedding`: **Array of exactly 128 floats** — face descriptor from FaceNet/TFLite model.

**Response 200:**
```json
{
  "id": "face_embedding_uuid"
}
```

**Errors:** `400` — embedding must be 128-element array; `401` — missing x-user-id

---

### 4. Pay by Face (Customer)

**POST** `/facepay`

**Headers:** `x-user-id` (required)

**Body:**
```json
{
  "embedding": [0.123, -0.456, ...],
  "amount": 5000,
  "currency": "TZS"
}
```

**Response 200:**
```json
{
  "id": "transaction_uuid",
  "status": "PENDING",
  "charge_id": "provider_charge_id",
  "payment_provider": "snippe",
  "message": "Enter PIN on your phone to complete payment"
}
```

**Errors:** `400` — face not enrolled, insufficient balance, no wallet linked; `403` — face match failed; `404` — user not found

---

### 5. Charge by Face (Merchant)

**POST** `/charge-by-face`

**Headers:** `x-merchant-id`, `x-merchant-api-key` (required)

**Body:**
```json
{
  "embedding": [0.123, -0.456, ...],
  "amount": 5000,
  "currency": "TZS",
  "reference": "Order #123"
}
```

- `reference` is optional.

**Response 200:**
```json
{
  "id": "transaction_uuid",
  "status": "PENDING",
  "charge_id": "provider_charge_id",
  "payment_provider": "snippe",
  "message": "Customer is entering PIN on their phone"
}
```

**Errors:** `401` — invalid merchant credentials; `404` — no matching face found; `400` — insufficient balance, no wallet linked

---

### 6. Register Customer (Full Registration)

**POST** `/register-customer`

**Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "255712345678",
  "email": "john@example.com",
  "wallet_provider": "mpesa",
  "wallet_phone": "255712345678",
  "embedding": [0.123, -0.456, ...]
}
```

- `embedding`: 128 floats (required).
- `wallet_phone` defaults to `phone_number` if omitted.

**Response 200:**
```json
{
  "user_id": "generated-uuid",
  "message": "Registration successful. You can now pay with your face."
}
```

**Errors:** `400` — validation errors (missing fields, invalid phone, no face)

---

### 7. Create Tembo Wallet (KYC)

**POST** `/create-tembo-wallet`

**Headers:** `x-user-id` (required)

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "gender": "M",
  "idType": "NATIONAL_ID",
  "idNumber": "19900115-12345-67890",
  "idIssueDate": "2020-01-01",
  "idExpiryDate": "2030-01-01",
  "street": "123 Main St",
  "city": "Dar es Salaam",
  "postalCode": "11101",
  "mobileNo": "255712345678",
  "email": "john@example.com"
}
```

**Response 200:**
```json
{
  "accountNo": "TMB-xxx",
  "message": "Tembo wallet created"
}
```

---

### 8. Snippe Webhook

**POST** `/snippe-webhook`

Called by Snippe when payment completes. Expects JSON with `event`, `data.reference`, `status`, etc. On success: update transaction to AUTHORIZED, deduct balance, optionally send SMS via Briq.

---

### 9. Tembo Webhook

**POST** `/tembo-webhook`

Two formats:
1. **MOMO Collection:** `statusCode`, `transactionId`, `transactionRef` — `statusCode === 'PAYMENT_ACCEPTED'` → AUTHORIZED.
2. **Merchant Collection (HMAC):** `timestamp`, `signature`, `payload` — verify HMAC with `TEMBO_HASH_KEY`, parse payload, update transaction.

---

## Database Schema (Supabase Postgres)

```sql
-- user_profiles
id uuid PK, external_user_id uuid UNIQUE, phone_number text, account_balance numeric(14,2),
first_name text, last_name text, email text

-- wallets
id uuid PK, user_id FK(user_profiles), provider text, provider_wallet_id text, currency text

-- face_embeddings
id uuid PK, user_id FK(user_profiles), embedding vector(128), liveness_score float

-- merchants
id uuid PK, name text, api_key text

-- transactions
id uuid PK, user_id FK, wallet_id FK, merchant_id FK, amount numeric(14,2), currency text,
status text (PENDING|AUTHORIZED|FAILED), snippe_charge_id text, tembo_transaction_id text,
payment_provider text, reference text, created_at timestamptz
```

**pgvector function:**
```sql
create or replace function match_face_embedding(
  query_embedding vector(128),
  match_threshold float default 0.6,
  match_count int default 1
)
returns table (user_id uuid, similarity float)
```

---

## Face Embedding Logic

- **Dimension:** 128 floats
- **Similarity:** Cosine similarity, threshold **0.6**
- **Enroll:** Replace existing embeddings for user (delete then insert)
- **Match:** Use pgvector `<=>` (L2 distance) → `1 - distance` = cosine-like; or compute in Python with numpy

---

## Payment Providers

### Snippe
- **Env:** `SNIPPE_API_KEY`, `WEBHOOK_BASE_URL`
- **API:** `POST https://api.snippe.sh/v1/payments`
- **Webhook:** `{WEBHOOK_BASE_URL}/snippe-webhook`

### Tembo
- **Env:** `TEMBO_ACCOUNT_ID`, `TEMBO_SECRET_KEY`, `TEMBO_SANDBOX`, `TEMBO_HASH_KEY`, `WEBHOOK_BASE_URL`
- **API:** `POST {base}/collection` — channel inferred from phone/provider
- **Webhook:** `{WEBHOOK_BASE_URL}/tembo-webhook`

**Provider preference:** `PAYMENT_PROVIDER=snippe` or `tembo` — try preferred first, fallback to other on failure.

---

## Environment Variables

```env
# Database (Supabase)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Payment
SNIPPE_API_KEY=xxx
TEMBO_ACCOUNT_ID=xxx
TEMBO_SECRET_KEY=xxx
TEMBO_HASH_KEY=xxx  # base64, for webhook HMAC
TEMBO_SANDBOX=true
PAYMENT_PROVIDER=snippe
WEBHOOK_BASE_URL=https://your-api.example.com

# Optional
BRIQ_API_KEY=xxx
```

---

## Suggested Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, routers
│   ├── config.py             # Settings (pydantic)
│   ├── db.py                 # Supabase/Postgres client
│   ├── routers/
│   │   ├── account.py        # account-summary, deposit
│   │   ├── face.py           # enroll-face, facepay, charge-by-face
│   │   ├── customer.py       # register-customer
│   │   ├── wallet.py         # create-tembo-wallet
│   │   └── webhooks.py       # snippe-webhook, tembo-webhook
│   ├── services/
│   │   ├── payment.py        # Snippe + Tembo initiation
│   │   ├── embedding.py      # cosine similarity, parse
│   │   └── sms.py            # Briq (optional)
│   └── models/
│       └── schemas.py        # Pydantic request/response models
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## Dependencies (requirements.txt)

```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
supabase>=2.0.0
httpx>=0.26.0
pydantic>=2.0
pydantic-settings>=2.0
numpy>=1.24.0
python-dotenv>=1.0.0
```

---

## CORS

Allow `*` for MVP; restrict in production.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*"],
)
```

---

## Summary Checklist for AI/Code Generator

- [ ] FastAPI with async endpoints
- [ ] Supabase Postgres client (or asyncpg)
- [ ] pgvector for face matching (or numpy fallback)
- [ ] All 9 endpoints implemented
- [ ] Snippe + Tembo payment initiation with fallback
- [ ] Webhook handlers for Snippe and Tembo (both formats)
- [ ] Cosine similarity threshold 0.6
- [ ] 128-d embedding validation
- [ ] Proper error responses (401, 400, 403, 404, 502)
- [ ] Environment-based config
- [ ] Dockerfile for deployment
