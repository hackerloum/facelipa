# FaceLipa: User Fields & Database Flow

This document describes what fields users fill in, how they map to the database, and how data is fetched and used across the app.

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
User fills form
       ↓
Frontend: face-api.js extracts 128-d embedding from photo
       ↓
POST /functions/v1/register-customer-tembo
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. INSERT user_profiles                                         │
│    - external_user_id (new UUID)                                │
│    - phone_number (normalized: 255XXXXXXXXX)                    │
│    - first_name, last_name, email                               │
│    - account_balance = 0                                         │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Tembo API: createTemboWallet (KYC)                           │
│    - Sends: firstName, lastName, DOB, gender, ID, address, etc. │
│    - Returns: accountNo (Tembo wallet ID)                       │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. INSERT wallets                                               │
│    - user_id (from step 1)                                      │
│    - provider = 'tembo'                                         │
│    - provider_wallet_id = accountNo                             │
│    - currency = 'TZS'                                           │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. INSERT face_embeddings                                       │
│    - user_id (from step 1)                                      │
│    - embedding = [128 floats]                                   │
└─────────────────────────────────────────────────────────────────┘
       ↓
Response: { user_id, tembo_account_no }
       ↓
Frontend: localStorage.setItem('facelipa_user_id', user_id)
```

---

### Registration (Mobile Money) – `register-customer`

```
POST /functions/v1/register-customer
       ↓
INSERT user_profiles (external_user_id, phone_number, first_name, last_name, email, account_balance=0)
       ↓
INSERT wallets (user_id, provider, provider_wallet_id=phone, currency='TZS')
       ↓
INSERT face_embeddings (user_id, embedding)
       ↓
Response: { user_id }
```

---

### Account Summary – `account-summary`

**Request:** `GET /functions/v1/account-summary` with header `x-user-id: <external_user_id>`

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SELECT user_profiles                                         │
│    WHERE external_user_id = x-user-id                           │
│    → id, account_balance                                        │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. SELECT wallets                                               │
│    WHERE user_id = profile.id                                   │
│    → all columns                                                 │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. SELECT transactions                                          │
│    WHERE user_id = profile.id                                   │
│    ORDER BY created_at DESC LIMIT 5                             │
└─────────────────────────────────────────────────────────────────┘
       ↓
Response: { balance, wallets, transactions }
```

---

### Face Pay (Customer self-pay) – `facepay`

**Request:** `POST /functions/v1/facepay` with header `x-user-id`, body `{ embedding, amount, currency }`

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SELECT user_profiles                                         │
│    WHERE external_user_id = x-user-id                           │
│    → id, account_balance, phone_number                          │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. SELECT face_embeddings                                        │
│    WHERE user_id = profile.id                                   │
│    → verify embedding matches (cosine similarity ≥ 0.6)          │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. SELECT transactions (sum PENDING)                            │
│    → check available balance                                    │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. SELECT wallets                                               │
│    WHERE user_id = profile.id LIMIT 1                           │
│    → id, provider, provider_wallet_id                           │
└─────────────────────────────────────────────────────────────────┘
       ↓
Phone for STK: provider='tembo' ? profile.phone_number : wallet.provider_wallet_id
       ↓
INSERT transactions (PENDING) → initiatePayment (Snippe/Tembo STK)
       ↓
UPDATE transactions (snippe_charge_id or tembo_transaction_id)
```

---

### Charge by Face (Merchant) – `charge-by-face`

**Request:** `POST /functions/v1/charge-by-face` with headers `x-merchant-id`, `x-merchant-api-key`, body `{ embedding, amount, currency }`

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SELECT merchants                                              │
│    WHERE id = x-merchant-id AND api_key = x-merchant-api-key    │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. RPC match_face_embedding(query_embedding)                    │
│    → returns user_id with best similarity ≥ 0.6                 │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. SELECT user_profiles                                         │
│    WHERE id = matched_user_id                                    │
│    → id, account_balance, phone_number                           │
└─────────────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. SELECT wallets                                               │
│    WHERE user_id = profile.id LIMIT 1                           │
└─────────────────────────────────────────────────────────────────┘
       ↓
Phone for STK: provider='tembo' ? profile.phone_number : wallet.provider_wallet_id
       ↓
INSERT transactions → initiatePayment → UPDATE transactions
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

## 5. Data Flow Diagram

```
                    ┌──────────────────┐
                    │  Registration    │
                    │  Form (User)     │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────────┐
    │ register-customer│           │register-customer-   │
    │ (mobile money)   │           │tembo (Tembo KYC)    │
    └────────┬────────┘           └──────────┬──────────┘
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  user_profiles               │
              │  wallets                     │
              │  face_embeddings             │
              └──────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐
  │account-     │   │ facepay     │   │ charge-by-face  │
  │summary      │   │ (customer)  │   │ (merchant)      │
  │             │   │             │   │                 │
  │ SELECT      │   │ SELECT +    │   │ RPC match_face  │
  │ profile,    │   │ INSERT tx   │   │ + SELECT +      │
  │ wallets,    │   │ + STK push  │   │ INSERT tx +     │
  │ transactions│   │             │   │ STK push        │
  └─────────────┘   └─────────────┘   └─────────────────┘
```
