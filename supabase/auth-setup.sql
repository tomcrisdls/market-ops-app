-- ============================================================
-- Auth Setup — run this once in Supabase SQL Editor
-- ============================================================

-- 1. Profiles table (one row per user)
create table if not exists profiles (
  id         uuid references auth.users on delete cascade primary key,
  full_name  text,
  role       text default 'manager' check (role in ('admin', 'manager', 'staff')),
  created_at timestamptz default now()
);

-- 2. Auto-create a profile row whenever a new user is invited/signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'manager'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 3. Row Level Security — all tables require authentication
alter table profiles           enable row level security;
alter table inventory          enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table distributions      enable row level security;
alter table distribution_items enable row level security;

-- Drop existing policies (safe to re-run)
drop policy if exists "auth_profiles"           on profiles;
drop policy if exists "auth_inventory"          on inventory;
drop policy if exists "auth_orders"             on orders;
drop policy if exists "auth_order_items"        on order_items;
drop policy if exists "auth_distributions"      on distributions;
drop policy if exists "auth_distribution_items" on distribution_items;

-- Allow full access to authenticated users
create policy "auth_profiles"           on profiles           for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_inventory"          on inventory          for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_orders"             on orders             for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_order_items"        on order_items        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_distributions"      on distributions      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth_distribution_items" on distribution_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- AFTER running this SQL:
--
-- 1. Go to Supabase → Authentication → Users → "Invite user"
--    Enter your email and your name in user metadata:
--    { "full_name": "Your Name" }
--
-- 2. Check your email, click the link, set your password.
--
-- 3. To make yourself admin, run:
--    UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
--    (or find your user ID in Authentication → Users and run:)
--    UPDATE profiles SET role = 'admin' WHERE id = '<your-user-id>';
-- ============================================================
