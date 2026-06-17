-- Giftr security hardening migration.
-- Apply this if you already ran 001_initial.sql before manage tokens and RLS
-- were added.

alter table raffles add column if not exists manage_token_hash text;

-- Existing raffles created before this migration do not have the raw manage
-- token available, so they cannot be retrofitted with a usable private link.
-- Keep a random placeholder hash so the column can be locked down; recreate
-- pre-migration raffles if they still need to be managed.
update raffles
set manage_token_hash =
  md5(random()::text || clock_timestamp()::text) ||
  md5(clock_timestamp()::text || random()::text)
where manage_token_hash is null;

alter table raffles alter column manage_token_hash set not null;

alter table raffles enable row level security;
alter table raffle_entries enable row level security;
alter table gifts enable row level security;

revoke all on table raffles from anon, authenticated;
revoke all on table raffle_entries from anon, authenticated;
revoke all on table gifts from anon, authenticated;
