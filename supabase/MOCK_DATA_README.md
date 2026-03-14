# FaceLipa Mock Data

The file `seed.sql` contains example data for testing the FaceLipa app in Supabase.

## How to Run

1. **Supabase SQL Editor**  
   Open your project → SQL Editor → paste the contents of `seed.sql` → Run.

2. **Supabase CLI**  
   ```bash
   supabase db reset
   ```  
   This applies migrations and runs `seed.sql` automatically.

## What Gets Created

| Table | Records |
|-------|---------|
| merchants | 3 (FaceLipa Demo Store, Mama Ntilie, Tech Hub Dar) |
| user_profiles | 3 (John, Fatuma, Emmanuel) |
| wallets | 4 (M-Pesa, Tembo, Airtel, Halopesa) |
| face_embeddings | 3 (placeholder vectors) |
| transactions | 3 (sample payment history) |

## Test Credentials

### Customer Sign-in (`/bank` → "Sign in with User ID")

| User | User ID (paste this) | Balance |
|------|----------------------|---------|
| John Mkumbo | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | 15,000 TZS |
| Fatuma Hassan | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | 25,000 TZS |
| Emmanuel Joseph | `cccccccc-cccc-cccc-cccc-cccccccccccc` | 5,000 TZS |

### Merchant Login (`/merchant`)

| Merchant | Merchant ID | API Key |
|----------|-------------|---------|
| FaceLipa Demo Store | `a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d` | `demo-merchant-key-123` |
| Mama Ntilie Restaurant | `b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e` | `mama-ntilie-api-456` |
| Tech Hub Dar | `c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f` | `tech-hub-api-789` |

## Notes

- **Face embeddings** are placeholder vectors. They will not match real face photos. For face-based flows (charge-by-face), register a new user via the form or use the Pay tab with a selfie.
- **Re-running** the seed deletes and re-inserts wallets, face_embeddings, and transactions for the 3 test users. User profiles and merchants are upserted.
- The merchant UI may require you to enter Merchant ID and API Key manually—use the values above.
