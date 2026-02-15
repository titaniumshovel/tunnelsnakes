-- Keeper cost (draft round) info
alter table public.players
  add column if not exists keeper_cost_round integer,
  add column if not exists keeper_cost_label text,
  add column if not exists keeper_cost_source text,
  add column if not exists keeper_cost_updated_at timestamptz;
