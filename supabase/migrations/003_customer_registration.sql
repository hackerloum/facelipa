-- Add customer registration fields to user_profiles
alter table user_profiles add column if not exists first_name text;
alter table user_profiles add column if not exists last_name text;
alter table user_profiles add column if not exists email text;
