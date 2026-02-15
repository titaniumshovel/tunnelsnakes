-- Add FantasyPros enrichment fields
alter table public.players
  add column if not exists fantasypros_ecr integer,
  add column if not exists fantasypros_pos_rank text,
  add column if not exists fantasypros_url text,
  add column if not exists fantasypros_updated_at timestamptz;
