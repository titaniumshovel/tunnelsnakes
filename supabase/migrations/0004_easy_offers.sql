-- Simplify offers: no managers auth, store submitter info directly on trade_offers

alter table public.trade_offers
  add column if not exists from_team_name text,
  add column if not exists from_name text,
  add column if not exists from_email text;

-- make from_manager_id optional (legacy)
alter table public.trade_offers
  alter column from_manager_id drop not null;
