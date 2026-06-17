-- Giftr initial schema.
-- Run this migration in your Supabase project (SQL editor or CLI) before
-- starting the app. It creates the three core tables and supporting indexes.

-- Raffles created by an organizer. A raffle collects entries and later draws
-- one or more winners who each receive a gift.
create table if not exists raffles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  occasion text not null,
  budget_cents int not null,
  num_winners int not null default 1,
  end_at timestamptz,
  creator_email text not null,
  status text not null default 'active',
  created_at timestamptz default now()
);

-- Entries submitted by participants for a given raffle. A participant can only
-- enter a raffle once per email address.
create table if not exists raffle_entries (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references raffles(id) on delete cascade,
  name text not null,
  email text not null,
  entered_at timestamptz default now(),
  unique (raffle_id, email)
);

-- Gifts purchased for a recipient. A gift may be linked to a raffle and the
-- winning entry, or stand alone for a personal (direct) gift.
create table if not exists gifts (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid references raffles(id),
  entry_id uuid references raffle_entries(id),
  occasion text,
  budget_cents int not null,
  recipient_name text not null,
  recipient_email text not null,
  bitrefill_product_id text,
  bitrefill_product_name text,
  bitrefill_order_id text,
  gift_code text,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz default now()
);

-- Helpful indexes for the most common lookups.
create index if not exists idx_raffle_entries_raffle_id on raffle_entries (raffle_id);
create index if not exists idx_gifts_raffle_id on gifts (raffle_id);
