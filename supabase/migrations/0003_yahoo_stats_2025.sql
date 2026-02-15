-- Yahoo enrichment fields + 2025 final statlines
alter table public.players
  add column if not exists yahoo_player_key text,
  add column if not exists yahoo_player_id text,
  add column if not exists stats_2025 jsonb,
  add column if not exists stats_2025_updated_at timestamptz;
