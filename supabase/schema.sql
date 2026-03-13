-- ============================================================
-- Market Ops — Beverage Module Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── REFERENCE TABLES ─────────────────────────────────────────

create table if not exists kiosks (
  id    text primary key,       -- 'K01', 'K02', ...
  name  text not null,          -- 'KebabWala'
  code  text not null           -- 'KW' (used in invoice codes)
);

insert into kiosks values
  ('K01', 'KebabWala',    'KW'),
  ('K02', 'Fonda',        'TF'),
  ('K03', 'Kam Rai Thai', 'KR'),
  ('K04', 'Paninoteca',   'PA'),
  ('K05', 'Fornino',      'FO'),
  ('K06', 'Smashed',      'SE'),
  ('K07', 'BRKLN Wild',   'BW'),
  ('K08', 'Bar',          'BR')
on conflict do nothing;

create table if not exists products (
  id                text primary key,    -- 'sb-still', 'coke', ...
  name              text not null,       -- display name
  inv_name          text not null,       -- name used on invoices
  default_price     numeric(10,2) not null,
  vendor            text not null,
  tracker_category  text not null,       -- 'water' | 'soda' | 'bags'
  has_deposit       boolean not null default false
);

insert into products values
  ('sb-still',     'San Bene Still 330ml',     'SanBenedetto Still 330ml',                                  29.95, 'AceEndico',    'water', true),
  ('sb-sparkling', 'San Bene Sparkling 330ml', 'SanBenedetto Sparkling 330ml',                              29.95, 'AceEndico',    'water', true),
  ('sb-still-can', 'San Bene Still Can 330ml', 'SanBenedetto Still Can 330ml',                              18.28, 'AceEndico',    'water', false),
  ('coke',         'Coke Bottle',              'Coke 12oz bottles',                                         41.68, 'Driscoll',     'soda',  false),
  ('diet-coke',    'Diet Coke Bottle',         'Diet Coke 8oz bottles',                                     36.37, 'Driscoll',     'soda',  false),
  ('sprite',       'Sprite Bottle',            'Sprite 12oz bottles',                                       42.51, 'Driscoll',     'soda',  false),
  ('paper-bag',    'Time Out Bag',             'Custom Paper Handle Bag "Bristo" 10x7x13" / 100 / Kraft',   28.66, 'ThinkPackage', 'bags',  false)
on conflict do nothing;

-- ── INVENTORY ────────────────────────────────────────────────
-- One row per product — tracks current cage stock and working price.

create table if not exists inventory (
  product_id     text primary key references products(id),
  quantity       integer not null default 0,
  current_price  numeric(10,2) not null,
  updated_at     timestamptz not null default now()
);

-- Bootstrap inventory with default prices
insert into inventory (product_id, quantity, current_price)
select id, 0, default_price from products
on conflict do nothing;

-- ── DELIVERIES ───────────────────────────────────────────────

create table if not exists deliveries (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  vendor      text not null,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table if not exists delivery_items (
  id           uuid primary key default gen_random_uuid(),
  delivery_id  uuid not null references deliveries(id) on delete cascade,
  product_id   text not null references products(id),
  quantity     integer not null check (quantity > 0)
);

-- ── ORDERS ───────────────────────────────────────────────────

create table if not exists orders (
  id          uuid primary key default gen_random_uuid(),
  kiosk_id    text not null references kiosks(id),
  date        date not null,
  status      text not null default 'pending'
                check (status in ('pending','distributed','invoiced')),
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  text not null references products(id),
  quantity    integer not null check (quantity > 0)
);

-- ── DISTRIBUTIONS ────────────────────────────────────────────

create table if not exists distributions (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id),           -- nullable (standalone dist)
  kiosk_id    text not null references kiosks(id),
  date        date not null,
  status      text not null default 'pending-invoice'
                check (status in ('pending-invoice','invoiced')),
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table if not exists distribution_items (
  id               uuid primary key default gen_random_uuid(),
  distribution_id  uuid not null references distributions(id) on delete cascade,
  product_id       text not null references products(id),
  quantity         integer not null check (quantity > 0),
  unit_price       numeric(10,2) not null   -- price locked at time of distribution
);

-- ── INVOICES ─────────────────────────────────────────────────

create table if not exists invoices (
  id               uuid primary key default gen_random_uuid(),
  distribution_id  uuid not null references distributions(id),
  kiosk_id         text not null references kiosks(id),
  date             date not null,
  invoice_code     text not null,   -- e.g. 'KW020120261'
  phase            text not null,   -- 'Phase 1' | 'Phase 2'
  subtotal         numeric(10,2) not null,
  deposit          numeric(10,2) not null default 0,
  tax              numeric(10,2) not null,
  total            numeric(10,2) not null,
  status           text not null default 'draft'
                     check (status in ('draft','sent')),
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);

-- Invoice items are denormalized — prices are locked at invoice time.
create table if not exists invoice_items (
  id                uuid primary key default gen_random_uuid(),
  invoice_id        uuid not null references invoices(id) on delete cascade,
  product_id        text not null references products(id),
  product_name      text not null,
  inv_name          text not null,
  quantity          integer not null,
  unit_price        numeric(10,2) not null,
  amount            numeric(10,2) not null,
  tracker_category  text not null,
  has_deposit       boolean not null default false
);

-- ── ROW-LEVEL SECURITY (enable once auth is set up) ──────────
-- alter table inventory    enable row level security;
-- alter table deliveries   enable row level security;
-- alter table orders       enable row level security;
-- alter table distributions enable row level security;
-- alter table invoices     enable row level security;

-- Example policy: authenticated users can read/write everything
-- create policy "authenticated users can manage all data"
--   on inventory for all
--   to authenticated
--   using (true) with check (true);
-- (repeat for each table)
