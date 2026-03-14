-- FaceLipa Mock Data for Supabase
-- Run after migrations: paste into Supabase SQL Editor or use `supabase db reset` (applies migrations + seed)
-- ==========================================================================================================

-- Clear existing data (optional - comment out if you want to preserve data)
-- TRUNCATE user_profiles, wallets, face_embeddings, merchants, transactions CASCADE;

-- ==========================================================================================================
-- 1. MERCHANTS
-- ==========================================================================================================

INSERT INTO merchants (id, name, api_key) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'FaceLipa Demo Store', 'demo-merchant-key-123'),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Mama Ntilie Restaurant', 'mama-ntilie-api-456'),
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Tech Hub Dar', 'tech-hub-api-789')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, api_key = EXCLUDED.api_key;

-- ==========================================================================================================
-- 2. USER PROFILES (customers)
-- Use these external_user_id values for "Sign in with User ID" on /bank
-- ==========================================================================================================

INSERT INTO user_profiles (id, external_user_id, phone_number, account_balance, first_name, last_name, email) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '255712345678',
    15000.00,
    'John',
    'Mkumbo',
    'john.mkumbo@example.com'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '255787654321',
    25000.50,
    'Fatuma',
    'Hassan',
    'fatuma.hassan@example.com'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '255765432198',
    5000.00,
    'Emmanuel',
    'Joseph',
    'emmanuel.j@example.com'
  )
ON CONFLICT (external_user_id) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  account_balance = EXCLUDED.account_balance,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email;

-- ==========================================================================================================
-- 3. WALLETS (linked to users)
-- ==========================================================================================================

-- Delete existing wallets for seed users to avoid duplicates on re-run
DELETE FROM wallets WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

INSERT INTO wallets (user_id, provider, provider_wallet_id, currency) VALUES
  ('11111111-1111-1111-1111-111111111111', 'mpesa', '255712345678', 'TZS'),
  ('22222222-2222-2222-2222-222222222222', 'tembo', 'TMB-ACC-001234', 'TZS'),
  ('22222222-2222-2222-2222-222222222222', 'airtel', '255787654321', 'TZS'),
  ('33333333-3333-3333-3333-333333333333', 'halopesa', '255765432198', 'TZS');

-- ==========================================================================================================
-- 4. FACE EMBEDDINGS (128-d vectors for face-api.js)
-- Mock vectors: real embeddings come from face-api.js. These are placeholders for testing.
-- For real face match, register via the form or replace with actual embedding from a photo.
-- ==========================================================================================================

-- Delete existing embeddings for seed users to avoid duplicates on re-run
DELETE FROM face_embeddings WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

-- Generate valid 128-d vectors (placeholder patterns - won't match real face photos)
INSERT INTO face_embeddings (user_id, embedding) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    (SELECT ('[' || string_agg((0.1 + n * 0.001)::text, ',') || ']')::vector(128) FROM generate_series(1, 128) n)
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    (SELECT ('[' || string_agg((0.2 + n * 0.002)::text, ',') || ']')::vector(128) FROM generate_series(1, 128) n)
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    (SELECT ('[' || string_agg((0.15 + n * 0.0015)::text, ',') || ']')::vector(128) FROM generate_series(1, 128) n)
  );

-- ==========================================================================================================
-- 5. TRANSACTIONS (sample payment history)
-- ==========================================================================================================

-- Delete existing transactions for seed users
DELETE FROM transactions WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

INSERT INTO transactions (user_id, wallet_id, merchant_id, amount, currency, status, payment_provider, reference) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM wallets WHERE user_id = '11111111-1111-1111-1111-111111111111' LIMIT 1),
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    5000.00,
    'TZS',
    'AUTHORIZED',
    'snippe',
    'ORD-001'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    (SELECT id FROM wallets WHERE user_id = '22222222-2222-2222-2222-222222222222' AND provider = 'tembo' LIMIT 1),
    'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
    12000.00,
    'TZS',
    'AUTHORIZED',
    'tembo',
    'REST-002'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    (SELECT id FROM wallets WHERE user_id = '33333333-3333-3333-3333-333333333333' LIMIT 1),
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    2500.00,
    'TZS',
    'AUTHORIZED',
    'snippe',
    'ORD-003'
  );

-- ==========================================================================================================
-- QUICK REFERENCE: Test User IDs for Sign-in (paste into /bank "Sign in with User ID")
-- ==========================================================================================================
-- John Mkumbo:    aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa  (balance: 15,000 TZS)
-- Fatuma Hassan:  bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb  (balance: 25,000 TZS)
-- Emmanuel Joseph: cccccccc-cccc-cccc-cccc-cccccccccccc  (balance: 5,000 TZS)
-- ==========================================================================================================
-- MERCHANT LOGIN (for /merchant)
-- ==========================================================================================================
-- FaceLipa Demo Store:  x-merchant-id: a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d  |  x-merchant-api-key: demo-merchant-key-123
-- Mama Ntilie:          x-merchant-id: b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e  |  x-merchant-api-key: mama-ntilie-api-456
-- Tech Hub Dar:         x-merchant-id: c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f  |  x-merchant-api-key: tech-hub-api-789
-- ==========================================================================================================
