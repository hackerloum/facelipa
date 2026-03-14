# FaceLipa MVP

Biometric mobile-money payment MVP. Customers register, enroll their face, and pay at merchant terminals by face scan. The merchant captures the customer's face → identifies them → initiates an STK/USSD push → customer enters PIN → transaction completes and balance is deducted.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Supabase only (Postgres + pgvector + Edge Functions + Storage) |
| Frontend | TypeScript · Vite · Vanilla TS (no React, no framework) |
| Face AI | face-api.js (Facenet, 128-d embeddings) — runs in the browser |
| Payments | Snippe + Tembo (STK/USSD push) |
| SMS | Briq |

## Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Free [Supabase](https://supabase.com) project

## Setup

### 1. Database Migration

Run the migration in the Supabase SQL editor, or use the CLI:

```bash
# If using Supabase CLI with linked project
supabase db push

# Or paste migrations in order into Supabase Dashboard → SQL Editor:
# 001_init.sql, then 002_payment_providers.sql
```

### 2. Create a Merchant (for testing)

Insert a test merchant in the SQL editor:

```sql
insert into merchants (name, api_key) values ('Test Merchant', 'test-api-key-123');
-- Note the returned id for merchant login
```

### 3. Download face-api.js Models

```bash
cd frontend
npm run download-models
```

Or manually download from [face-api.js-models](https://github.com/justadudewhohacks/face-api.js-models) into `frontend/public/models/`.

### 4. Environment Variables

**Frontend** (`frontend/.env`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Supabase Edge Function secrets** (set via CLI or Dashboard):

```bash
# Required: at least one payment provider
supabase secrets set SNIPPE_API_KEY=your-snippe-key
supabase secrets set TEMBO_ACCOUNT_ID=your-tembo-account-id
supabase secrets set TEMBO_SECRET_KEY=your-tembo-secret-key

# Optional: prefer one provider (default: snippe)
supabase secrets set PAYMENT_PROVIDER=snippe   # or tembo

# Tembo sandbox for testing
supabase secrets set TEMBO_SANDBOX=true

# Webhook base (required for callbacks)
supabase secrets set WEBHOOK_BASE_URL=https://your-project.supabase.co/functions/v1

# Optional
supabase secrets set BRIQ_API_KEY=your-briq-key
supabase secrets set USD_TO_TZS_RATE=2600
```

**Payment providers**: FaceLipa supports **Snippe** and **Tembo**. Configure at least one. If both are set, the system tries the preferred provider first (via `PAYMENT_PROVIDER`), then falls back to the other on failure.

### 5. Deploy Edge Functions

```bash
supabase functions deploy enroll-face --no-verify-jwt
supabase functions deploy facepay --no-verify-jwt
supabase functions deploy charge-by-face --no-verify-jwt
supabase functions deploy snippe-webhook --no-verify-jwt
supabase functions deploy tembo-webhook --no-verify-jwt
supabase functions deploy deposit --no-verify-jwt
supabase functions deploy account-summary --no-verify-jwt
```

Or deploy all:

```bash
supabase functions deploy --no-verify-jwt
```

### 6. Configure Webhooks

- **Snippe**: In the Snippe dashboard, set webhook URL to `https://your-project.supabase.co/functions/v1/snippe-webhook`
- **Tembo**: The callback URL is sent per-request; ensure `WEBHOOK_BASE_URL` is set. Tembo will POST to `.../tembo-webhook`

### 7. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

- **Customer**: http://localhost:5173/bank.html
- **Merchant**: http://localhost:5173/merchant.html

### 8. Deploy to Vercel

Connect the repo to [Vercel](https://vercel.com). The `vercel.json` is preconfigured:

- **Root Directory**: leave default (project root)
- **Build Command**: `npm run download-models --prefix frontend && npm run build --prefix frontend`
- **Output Directory**: `frontend/dist`

Add environment variables in Vercel Dashboard → Settings → Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After deploy: `https://your-app.vercel.app/bank.html` (customer), `https://your-app.vercel.app/merchant.html` (merchant).

## End-to-End Walkthrough

### Customer Flow

1. **Register**: Open bank.html → "Open an account" → save the generated UUID.
2. **Deposit**: Account tab → enter amount → Deposit (dev only).
3. **Enroll Face**: Enroll Face tab → upload a clear photo → Enroll.
4. **Link Wallet**: Wallets tab → select provider (M-Pesa, Airtel, etc.) → enter phone number (255XXXXXXXXX) → Link Wallet.
5. **Pay**: Pay tab → upload selfie + amount → Pay → enter PIN on phone when USSD push arrives → balance deducted.

### Merchant Flow

1. **Login**: merchant.html → enter Merchant ID and API Key (from `merchants` table).
2. **Charge**: Upload customer face photo → enter amount + optional reference → Charge.
3. Customer receives USSD push → enters PIN → webhook fires → balance deducted.

## Auth Convention (Dev Mode)

- **Customer**: `x-user-id` header (UUID from localStorage).
- **Merchant**: `x-merchant-id` + `x-merchant-api-key` headers.

## Row-Level Security

MVP uses permissive dev policies (`using (true)`). **Replace these before production** with proper RLS policies.

## Repository Structure

```
facelipa/
├── supabase/
│   ├── functions/
│   │   ├── enroll-face/
│   │   ├── facepay/
│   │   ├── charge-by-face/
│   │   ├── snippe-webhook/
│   │   ├── tembo-webhook/
│   │   ├── account-summary/
│   │   ├── deposit/
│   │   └── _shared/
│   └── migrations/
│       └── 001_init.sql
├── frontend/
│   ├── public/
│   │   └── models/          ← face-api.js model weights
│   ├── src/
│   │   ├── bank/
│   │   ├── merchant/
│   │   └── lib/
│   ├── bank.html
│   ├── merchant.html
│   └── package.json
└── README.md
```

## Out of Scope (MVP)

- JS/TS frameworks (React, Vue, etc.)
- Webhook signature verification
- Rate limiting
- Production auth (Supabase Auth)
- Live camera / video stream
- Liveness detection
- Backend outside Supabase Edge Functions
