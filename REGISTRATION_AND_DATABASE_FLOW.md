# FaceLipa: User Fields & Database Flow

This document describes what fields users fill in, how they map to the database, and how the **entire registration flow is linked with Supabase**—from frontend to Edge Functions to PostgreSQL.

---

## 0. Supabase Integration Overview

The registration flow is fully integrated with **Supabase** across all layers:

| Layer | Supabase Component | How It's Used |
|-------|--------------------|---------------|
| **Frontend** | Supabase client + Edge Functions URL | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` → `fetchApi()` calls `{url}/functions/v1/{path}` |
| **Edge Functions** | Supabase Postgres | `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` → INSERT/SELECT on tables |
| **Database** | Supabase PostgreSQL | `user_profiles`, `wallets`, `face_embeddings`, `transactions`, `merchants` |
| **Auth/Session** | localStorage + x-user-id | `external_user_id` stored in localStorage; sent as `x-user-id` header to Edge Functions |

### Connection Flow

```
Frontend (Vite)
    │
    │  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
    │
    ├──► Supabase Client (direct DB access for bank wallet list, etc.)
    │         └── supabase.from('user_profiles').select(...)
    │
    └──► Supabase Edge Functions
              │
              │  fetchApi('/register-customer-tembo')  →  POST https://{project}.supabase.co/functions/v1/register-customer-tembo
              │  fetchWithAuth('/account-summary')    →  GET  https://{project}.supabase.co/functions/v1/account-summary  (x-user-id)
              │
              └──► Each Edge Function uses:
                       createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
                       supabase.from('user_profiles').insert(...)
                       supabase.from('wallets').select(...)
                       supabase.rpc('match_face_embedding', ...)
```

### Supabase Tables Used in Registration

| Table | Used By | Operations |
|-------|---------|------------|
| `user_profiles` | register-customer, register-customer-tembo, account-summary, facepay, charge-by-face | INSERT, SELECT |
| `wallets` | register-customer, register-customer-tembo, account-summary, facepay, charge-by-face | INSERT, SELECT |
| `face_embeddings` | register-customer, register-customer-tembo, facepay, charge-by-face | INSERT, SELECT, RPC match |
| `transactions` | facepay, charge-by-face, account-summary | INSERT, SELECT, UPDATE |
| `merchants` | charge-by-face | SELECT |

---

## 1. Registration Form Fields

### Tembo Registration (`/register` → `register-customer-tembo`)

| Section | Form Field | Input Type | Required | API Key | Database Table | Database Column |
|---------|------------|------------|----------|---------|----------------|-----------------|
| Personal | First name | text | Yes | `first_name` | user_profiles | first_name |
| Personal | Last name | text | Yes | `last_name` | user_profiles | last_name |
| Personal | Phone number | tel | Yes | `phone_number` | user_profiles | phone_number |
| Personal | Email | email | Yes | `email` | user_profiles | email |
| Personal | Date of birth | date | Yes | `date_of_birth` | — | → Tembo API |
| Personal | Gender | select (M/F) | Yes | `gender` | — | → Tembo API |
| ID | ID type | select | Yes | `id_type` | — | → Tembo API |
| ID | ID number | text | Yes | `id_number` | — | → Tembo API |
| ID | ID issue date | date | Yes | `id_issue_date` | — | → Tembo API |
| ID | ID expiry date | date | Yes | `id_expiry_date` | — | → Tembo API |
| Address | Street address | text | Yes | `street` | — | → Tembo API |
| Address | City | text | Yes | `city` | — | → Tembo API |
| Address | Postal code | text | Yes | `postal_code` | — | → Tembo API |
| Face | Face photo | file | Yes | — | — | → face-api.js → embedding |
| — | — | — | — | `embedding` | face_embeddings | embedding (128-d vector) |

**ID type options:** `NATIONAL_ID`, `DRIVER_LICENSE`, `VOTER_ID`, `INTL_PASSPORT`

---

### Legacy Mobile Money Registration (`/bank` → `register-customer`)

| Form Field | Input Type | Required | API Key | Database Table | Database Column |
|------------|------------|----------|---------|----------------|-----------------|
| First name | text | Yes | `first_name` | user_profiles | first_name |
| Last name | text | Yes | `last_name` | user_profiles | last_name |
| Phone number | tel | Yes | `phone_number` | user_profiles | phone_number |
| Email | email | No | `email` | user_profiles | email |
| Mobile money provider | select | Yes | `wallet_provider` | wallets | provider |
| Wallet phone number | tel | Yes | `wallet_phone` | wallets | provider_wallet_id |
| Face photo | file | Yes | — | face_embeddings | embedding |

**Provider options:** `mpesa`, `airtel`, `halopesa`, `mixx`

---

## 2. Database Operations by Flow

### Registration (Tembo) – `register-customer-tembo`

```
User fills form (Frontend)
       ↓
Frontend: face-api.js extracts 128-d embedding from photo
       ↓
Frontend: fetchApi('/register-customer-tembo')
       → POST {VITE_SUPABASE_URL}/functions/v1/register-customer-tembo
       ↓
Supabase Edge Function (register-customer-tembo)
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. Supabase: supabase.from('user_profiles').insert(...)         │
│    - external_user_id (new UUID)                                │
│    - phone_number (normalized: 255XXXXXXXXX)                    │
│    - first_name, last_name, email                               │
│    - account_balance = 0                                         │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Tembo API: createTemboWallet (external KYC)                  │
│    - Sends: firstName, lastName, DOB, gender, ID, address, etc.│
│    - Returns: accountNo (Tembo wallet ID)                       │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Supabase: supabase.from('wallets').insert(...)                │
│    - user_id (from step 1)                                      │
│    - provider = 'tembo'                                         │
│    - provider_wallet_id = accountNo                             │
│    - currency = 'TZS'                                           │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Supabase: supabase.from('face_embeddings').insert(...)        │
│    - user_id (from step 1)                                      │
│    - embedding = [128 floats] (pgvector)                        │
└─────────────────────────────────────────────────────────────────┘
       ↓
Response: { user_id, tembo_account_no }
       ↓
Frontend: localStorage.setItem('facelipa_user_id', user_id)
```

---

### Registration (Mobile Money) – `register-customer`

```
Frontend: fetchApi('/register-customer')
       → POST {VITE_SUPABASE_URL}/functions/v1/register-customer
       ↓
Supabase Edge Function (register-customer)
       ↓
Supabase: supabase.from('user_profiles').insert(...)
       ↓
Supabase: supabase.from('wallets').insert(...)
       ↓
Supabase: supabase.from('face_embeddings').insert(...)
       ↓
Response: { user_id }
```

---

### Account Summary – `account-summary`

**Request:** `GET {SUPABASE_URL}/functions/v1/account-summary` with header `x-user-id: <external_user_id>`

```
Frontend: fetchWithAuth('/account-summary', { userId })
       ↓
Supabase Edge Function (account-summary)
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. Supabase: supabase.from('user_profiles')                     │
│    .select('id, account_balance').eq('external_user_id', userId) │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Supabase: supabase.from('wallets')                           │
│    .select('*').eq('user_id', profileId)                        │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Supabase: supabase.from('transactions')                      │
│    .select('*').eq('user_id', profileId)                        │
│    .order('created_at', { ascending: false }).limit(5)          │
└─────────────────────────────────────────────────────────────────┘
       ↓
Response: { balance, wallets, transactions }
```

---

### Face Pay (Customer self-pay) – `facepay`

**Request:** `POST {SUPABASE_URL}/functions/v1/facepay` with header `x-user-id`, body `{ embedding, amount, currency }`

```
Frontend: fetchWithAuth('/facepay', { userId, body: {...} })
       ↓
Supabase Edge Function (facepay)
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. Supabase: supabase.from('user_profiles')                     │
│    .select('id, account_balance, phone_number')                 │
│    .eq('external_user_id', userId)                              │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Supabase: supabase.from('face_embeddings')                   │
│    .select('embedding').eq('user_id', profile.id)               │
│    → verify cosine similarity ≥ 0.6                             │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Supabase: supabase.from('transactions')                      │
│    .select('amount').eq('user_id', profile.id).eq('status','PENDING')│
│    → sum for available balance                                  │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Supabase: supabase.from('wallets')                           │
│    .select('id, provider, provider_wallet_id')                  │
│    .eq('user_id', profile.id).limit(1).single()                 │
└─────────────────────────────────────────────────────────────────┘
       ↓
Supabase: supabase.from('transactions').insert(...) → STK push
       ↓
Supabase: supabase.from('transactions').update(...)
```

---

### Charge by Face (Merchant) – `charge-by-face`

**Request:** `POST {SUPABASE_URL}/functions/v1/charge-by-face` with headers `x-merchant-id`, `x-merchant-api-key`, body `{ embedding, amount, currency }`

```
Supabase Edge Function (charge-by-face)
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. Supabase: supabase.from('merchants')                         │
│    .select('id').eq('id', merchantId).eq('api_key', apiKey)     │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Supabase: supabase.rpc('match_face_embedding',               │
│    { query_embedding, match_threshold: 0.6, match_count: 1 })   │
│    → pgvector ANN search → user_id                              │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Supabase: supabase.from('user_profiles')                     │
│    .select('id, account_balance, phone_number')                 │
│    .eq('id', matchedUserId)                                     │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Supabase: supabase.from('wallets')                           │
│    .select('id, provider, provider_wallet_id')                  │
│    .eq('user_id', profile.id).limit(1).single()                 │
└─────────────────────────────────────────────────────────────────┘
       ↓
Supabase: supabase.from('transactions').insert(...) → STK push
       ↓
Supabase: supabase.from('transactions').update(...)
```

---

## 3. Field Mapping Summary

| User Input | Tembo Reg | Mobile Money Reg | Stored In |
|------------|-----------|------------------|-----------|
| First name | ✓ | ✓ | user_profiles.first_name |
| Last name | ✓ | ✓ | user_profiles.last_name |
| Phone | ✓ | ✓ | user_profiles.phone_number |
| Email | ✓ | ✓ (optional) | user_profiles.email |
| DOB, Gender, ID, Address | ✓ | — | Tembo API only |
| Wallet provider | — | ✓ | wallets.provider |
| Wallet phone | — | ✓ | wallets.provider_wallet_id |
| Face photo | ✓ | ✓ | face_embeddings.embedding |
| Tembo account no | — | — | wallets.provider_wallet_id (provider=tembo) |

---

## 4. Key Database Lookups

| Operation | Lookup By | Tables Queried |
|-----------|-----------|----------------|
| Login / session | `external_user_id` (x-user-id) | user_profiles |
| Account summary | `external_user_id` | user_profiles, wallets, transactions |
| Face match (merchant) | `embedding` (pgvector) | face_embeddings → user_profiles |
| Payment phone | `user_id` | user_profiles.phone_number, wallets |
| Balance check | `user_id` | user_profiles.account_balance, transactions (PENDING sum) |

---

## 5. Data Flow Diagram (All via Supabase)

```
                    ┌──────────────────┐
                    │  Registration    │
                    │  Form (User)     │
                    └────────┬─────────┘
                             │
              Frontend: fetchApi() → Supabase Edge Functions
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────────┐
    │ register-customer│           │register-customer-   │
    │ (Supabase Edge   │           │tembo (Supabase Edge │
    │  Function)       │           │  Function)          │
    └────────┬────────┘           └──────────┬──────────┘
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  Supabase PostgreSQL         │
              │  • user_profiles             │
              │  • wallets                   │
              │  • face_embeddings           │
              └──────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
  │account-     │   │ facepay     │   │ charge-by-face  │
  │summary      │   │             │   │                 │
  │             │   │             │   │                 │
  │ Supabase    │   │ Supabase    │   │ Supabase        │
  │ SELECT from │   │ SELECT +    │   │ RPC match_face   │
  │ user_       │   │ INSERT tx   │   │ + SELECT +      │
  │ profiles,   │   │ + STK push  │   │ INSERT tx +     │
  │ wallets,    │   │             │   │ STK push        │
  │ transactions│   │             │   │                 │
  └─────────────┘   └─────────────┘   └─────────────────┘
```
