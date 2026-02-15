-- Supabase schema for Tunnel Snakes trade portal
-- Run in Supabase SQL editor.
-- "War never changes... but your database schema might."

create extension if not exists "pgcrypto";

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  yahoo_player_id bigint unique,
  yahoo_player_key text,
  full_name text not null,
  mlb_team text,
  primary_position text,
  eligible_positions jsonb,
  headshot_url text,
  last_season_stats jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.my_roster_players (
  id uuid primary key default gen_random_uuid(),
  yahoo_league_key text not null,
  yahoo_team_key text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  keeper_status text not null default 'undecided',
  is_available boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (yahoo_league_key, yahoo_team_key, player_id)
);

create table if not exists public.managers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  yahoo_league_key text not null,
  yahoo_team_key text not null,
  from_manager_id uuid references public.managers(id) on delete restrict,
  requested_player_id uuid references public.players(id) on delete set null,
  offer_text text not null,
  message text,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Minimal indexes
create index if not exists idx_my_roster_available on public.my_roster_players (yahoo_league_key, yahoo_team_key, is_available);
create index if not exists idx_trade_offers_status on public.trade_offers (status, created_at desc);

-- RLS
alter table public.players enable row level security;
alter table public.my_roster_players enable row level security;
alter table public.managers enable row level security;
alter table public.trade_offers enable row level security;

-- Public read: trade block only
create policy "public read available roster" on public.my_roster_players
for select to anon
using (is_available = true);

create policy "public read players" on public.players
for select to anon
using (true);

-- Public can create managers and offers
create policy "public create manager" on public.managers
for insert to anon
with check (true);

create policy "public create offer" on public.trade_offers
for insert to anon
with check (true);

-- Admin (authenticated) can do everything (MVP)
create policy "auth full access players" on public.players
for all to authenticated
using (true)
with check (true);

create policy "auth full access roster" on public.my_roster_players
for all to authenticated
using (true)
with check (true);

create policy "auth full access managers" on public.managers
for all to authenticated
using (true)
with check (true);

create policy "auth full access offers" on public.trade_offers
for all to authenticated
using (true)
with check (true);
