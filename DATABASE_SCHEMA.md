# FaceLipa Database Schema

This document describes all database tables, columns, relationships, and functions for the FaceLipa MVP. Use it when building features, debugging, or onboarding new developers.

## Overview

- **Database**: PostgreSQL (Supabase)
- **Extensions**: `vector` (pgvector) for face embeddings
- **Migrations**: Run in order: `001_init.sql` → `002_payment_providers.sql` → `003_customer_registration.sql`

---

## Tables

### 1. `user_profiles`

Stores customer account information and balance.

| Column            | Type         | Constraints              | Description                                      |
|-------------------|--------------|--------------------------|--------------------------------------------------|
| `id`              | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Internal UUID                                   |
| `external_user_id`| `uuid`       | UNIQUE, NOT NULL         | Client-facing UUID (used in `x-user-id` header)  |
| `phone_number`    | `text`       | NOT NULL                 | Customer phone number                            |
| `account_balance` | `numeric(14,2)` | DEFAULT 0             | Balance in TZS                                   |
| `first_name`      | `text`       | nullable                 | Customer first name (003 migration)              |
| `last_name`       | `text`       | nullable                 | Customer last name (003 migration)               |
| `email`           | `text`       | nullable                 | Customer email (003 migration)                   |

**RLS**: Enabled (dev policy: `using (true)`)

---

### 2. `wallets`

Links customers to external payment provider wallets (M-Pesa, Airtel, etc.).

| Column             | Type   | Constraints              | Description                          |
|--------------------|--------|--------------------------|--------------------------------------|
| `id`               | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Internal UUID                 |
| `user_id`          | `uuid` | REFERENCES user_profiles(id) | FK to customer                     |
| `provider`         | `text` | NOT NULL                 | e.g. `mpesa`, `airtel`, `tigo`      |
| `provider_wallet_id`| `text` | NOT NULL                 | Provider-specific wallet/phone ID    |
| `currency`         | `text` | DEFAULT 'TZS'            | Currency code                        |

**RLS**: Enabled (dev policy: `using (true)`)

---

### 3. `face_embeddings`

Stores 128-dimensional face embeddings for biometric identification.

| Column        | Type         | Constraints              | Description                              |
|---------------|--------------|--------------------------|------------------------------------------|
| `id`          | `uuid`       | PRIMARY KEY, DEFAULT gen_random_uuid() | Internal UUID                     |
| `user_id`     | `uuid`       | REFERENCES user_profiles(id) | FK to customer                       |
| `embedding`   | `vector(128)`| NOT NULL                 | face-api.js Facenet 128-d embedding      |
| `liveness_score` | `float`   | nullable                 | Optional liveness confidence             |

**RLS**: Enabled (dev policy: `using (true)`)

---

### 4. `merchants`

Merchant accounts that can charge customers via face scan.

| Column   | Type   | Constraints              | Description                          |
|----------|--------|--------------------------|--------------------------------------|
| `id`     | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Internal UUID                 |
| `name`   | `text` | NOT NULL                 | Merchant display name                |
| `api_key`| `text` | NOT NULL                 | Used for auth (`x-merchant-api-key`) |

**RLS**: Enabled (dev policy: `using (true)`)

---

### 5. `transactions`

Payment transactions initiated by face scan (STK/USSD push).

| Column               | Type           | Constraints              | Description                              |
|----------------------|----------------|--------------------------|------------------------------------------|
| `id`                 | `uuid`         | PRIMARY KEY, DEFAULT gen_random_uuid() | Internal UUID                     |
| `user_id`            | `uuid`         | REFERENCES user_profiles(id) | FK to customer                       |
| `wallet_id`          | `uuid`         | REFERENCES wallets(id)   | Wallet used for payment                  |
| `merchant_id`        | `uuid`         | REFERENCES merchants(id) | Merchant who initiated charge            |
| `amount`             | `numeric(14,2)`| NOT NULL                 | Transaction amount                       |
| `currency`           | `text`         | DEFAULT 'TZS'            | Currency code                            |
| `status`             | `text`         | CHECK IN ('PENDING','AUTHORIZED','FAILED'), DEFAULT 'PENDING' | Transaction status |
| `snippe_charge_id`   | `text`         | nullable                 | Snippe provider reference                |
| `reference`          | `text`         | nullable                 | Optional merchant reference              |
| `created_at`         | `timestamptz`  | DEFAULT now()            | Creation timestamp                       |
| `payment_provider`   | `text`         | DEFAULT 'snippe'         | `snippe` or `tembo` (002 migration)      |
| `tembo_transaction_id`| `text`        | nullable                 | Tembo provider reference (002 migration) |

**RLS**: Enabled (dev policy: `using (true)`)

---

## Entity Relationship Diagram

```
user_profiles (1) ────< (N) wallets
      │
      │ (1)
      └──────< (N) face_embeddings

user_profiles (1) ────< (N) transactions
wallets (1) ──────────< (N) transactions
merchants (1) ────────< (N) transactions
```

---

## Functions

### `match_face_embedding`

Performs a similarity search on face embeddings using cosine distance (pgvector).

**Signature:**
```sql
match_face_embedding(
  query_embedding vector(128),
  match_threshold float default 0.6,
  match_count int default 1
)
returns table (user_id uuid, similarity float)
```

**Parameters:**
- `query_embedding`: 128-d vector from face-api.js
- `match_threshold`: Minimum similarity (0–1) to return a match
- `match_count`: Max number of matches to return

**Returns:** Rows of `(user_id, similarity)` ordered by best match.

**Usage:** `charge-by-face` and `facepay` Edge Functions use this for ANN face lookup.

---

## Storage

**Bucket:** `face-photos` (create via Supabase Dashboard or CLI)

```sql
insert into storage.buckets (id, name, public) values ('face-photos', 'face-photos', false);
```

---

## Migration Order

| File | Purpose |
|------|---------|
| `001_init.sql` | Core tables, RLS, `match_face_embedding` |
| `002_payment_providers.sql` | Adds `payment_provider`, `tembo_transaction_id` to transactions |
| `003_customer_registration.sql` | Adds `first_name`, `last_name`, `email` to user_profiles |

---

## Quick Reference: Column Types

| Column Type | Notes |
|-------------|-------|
| `uuid` | Use `gen_random_uuid()` for new rows |
| `vector(128)` | Requires pgvector extension; face-api.js Facenet output |
| `numeric(14,2)` | Currency amounts (14 digits, 2 decimal places) |
| `timestamptz` | Timezone-aware timestamps |
| `text` | No length limit; use for IDs, names, references |

---

## Auth Headers (Dev Mode)

| Role | Header(s) |
|------|-----------|
| Customer | `x-user-id` (external_user_id from user_profiles) |
| Merchant | `x-merchant-id` + `x-merchant-api-key` |

---

## Test Data

Create a test merchant:

```sql
insert into merchants (name, api_key) values ('Test Merchant', 'test-api-key-123');
```
