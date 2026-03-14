# FaceLipa Environment Variables

## Frontend (Vercel / `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |

---

## Supabase Edge Functions (Supabase secrets)

Set via: `supabase secrets set KEY=value`

### Auto-injected (do not set)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |

### Payment providers

| Variable | Required | Description |
|----------|----------|-------------|
| `SNIPPE_API_KEY` | One of Snippe/Tembo | Snippe API key for STK push |
| `TEMBO_ACCOUNT_ID` | One of Snippe/Tembo | Tembo partner account ID |
| `TEMBO_SECRET_KEY` | One of Snippe/Tembo | Tembo partner secret key |
| `TEMBO_SANDBOX` | No | `true` for sandbox, omit for production |
| `TEMBO_HASH_KEY` | No | Base64 hash key for Merchant Collection webhook HMAC verification |
| `PAYMENT_PROVIDER` | No | `snippe` or `tembo` (default: snippe) |

### Webhooks

| Variable | Required | Description |
|----------|----------|-------------|
| `WEBHOOK_BASE_URL` | Yes | Base URL for webhooks (e.g. `https://xxx.supabase.co/functions/v1`) |

### Optional

| Variable | Description |
|----------|-------------|
| `BRIQ_API_KEY` | Briq API key for SMS notifications |
| `USD_TO_TZS_RATE` | USD to TZS conversion rate (e.g. 2600) |

---

## Quick setup

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Supabase secrets**:
```bash
supabase secrets set SNIPPE_API_KEY=sk_xxx
supabase secrets set TEMBO_ACCOUNT_ID=xxx
supabase secrets set TEMBO_SECRET_KEY=xxx
supabase secrets set WEBHOOK_BASE_URL=https://your-project.supabase.co/functions/v1
supabase secrets set TEMBO_SANDBOX=true
```
