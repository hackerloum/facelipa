-- FaceLipa MVP - Initial Schema
-- Enable pgvector for face embeddings
create extension if not exists vector;

create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  external_user_id uuid unique not null,
  phone_number text not null,
  account_balance numeric(14,2) default 0
);

create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id),
  provider text not null,
  provider_wallet_id text not null,
  currency text default 'TZS'
);

create table face_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id),
  embedding vector(128) not null,
  liveness_score float
);

create table merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_key text not null
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id),
  wallet_id uuid references wallets(id),
  merchant_id uuid references merchants(id),
  amount numeric(14,2) not null,
  currency text default 'TZS',
  status text check (status in ('PENDING','AUTHORIZED','FAILED')) default 'PENDING',
  snippe_charge_id text,
  reference text,
  created_at timestamptz default now()
);

-- Row-Level Security (MVP dev mode - replace before production)
alter table user_profiles enable row level security;
alter table wallets enable row level security;
alter table face_embeddings enable row level security;
alter table merchants enable row level security;
alter table transactions enable row level security;

create policy "dev_allow_all" on user_profiles for all using (true);
create policy "dev_allow_all" on wallets for all using (true);
create policy "dev_allow_all" on face_embeddings for all using (true);
create policy "dev_allow_all" on merchants for all using (true);
create policy "dev_allow_all" on transactions for all using (true);

-- pgvector similarity search helper (optional - used by charge-by-face for ANN)
create or replace function match_face_embedding(
  query_embedding vector(128),
  match_threshold float default 0.6,
  match_count int default 1
)
returns table (user_id uuid, similarity float)
language plpgsql
as $$
begin
  return query
  select
    fe.user_id,
    1 - (fe.embedding <=> query_embedding) as similarity
  from face_embeddings fe
  where 1 - (fe.embedding <=> query_embedding) > match_threshold
  order by fe.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Storage bucket for face photos (create via Supabase dashboard or CLI)
-- insert into storage.buckets (id, name, public) values ('face-photos', 'face-photos', false);
