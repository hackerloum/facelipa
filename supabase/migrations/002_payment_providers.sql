-- Add payment provider support (Snippe + Tembo)
alter table transactions add column if not exists payment_provider text default 'snippe';
alter table transactions add column if not exists tembo_transaction_id text;
