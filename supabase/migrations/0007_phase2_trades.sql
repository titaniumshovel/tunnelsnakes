-- Phase 2: Trade Center + Keeper Tracker
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Add columns to trade_offers for new flow
-- ============================================
ALTER TABLE public.trade_offers
  ADD COLUMN IF NOT EXISTS target_team text,
  ADD COLUMN IF NOT EXISTS offering_players jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requesting_players jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS offering_picks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requesting_picks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS trade_type text DEFAULT 'proposal' CHECK (trade_type IN ('proposal', 'offseason', 'midseason')),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS teams_involved jsonb DEFAULT '[]'::jsonb;

-- ============================================
-- 2. Trade reactions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.trade_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_offer_id uuid REFERENCES public.trade_offers(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  emoji text NOT NULL CHECK (emoji IN ('🔥','💀','👍','👎','😂','🤔')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(trade_offer_id, user_email, emoji)
);

-- Enable RLS
ALTER TABLE public.trade_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can read reactions
CREATE POLICY "trade_reactions_select" ON public.trade_reactions
  FOR SELECT USING (true);

-- Authenticated users can insert their own reactions
CREATE POLICY "trade_reactions_insert" ON public.trade_reactions
  FOR INSERT WITH CHECK (true);

-- Users can delete their own reactions
CREATE POLICY "trade_reactions_delete" ON public.trade_reactions
  FOR DELETE USING (true);

-- ============================================
-- 3. Trade comments table
-- ============================================
CREATE TABLE IF NOT EXISTS public.trade_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_offer_id uuid REFERENCES public.trade_offers(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "trade_comments_select" ON public.trade_comments
  FOR SELECT USING (true);

-- Authenticated users can insert comments
CREATE POLICY "trade_comments_insert" ON public.trade_comments
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. Make sure my_roster_players has keeper_status
-- ============================================
-- (Should already exist, but just in case)
ALTER TABLE public.my_roster_players
  ADD COLUMN IF NOT EXISTS keeper_status text DEFAULT 'undecided';

-- ============================================
-- 5. Seed offseason trades from draft board data
-- These represent the known offseason pick swaps
-- ============================================
-- Trade 1: Tyler ↔ Thomas (1.5, 4.6, 6.6, 8.6, 11.5, 12.5, 14.5, 23.6)
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_picks, requesting_picks, created_at)
VALUES ('completed', 'offseason',
  'Tyler sends Rd 1, 11, 12, 14 picks to Thomas for Rd 4, 6, 8, 23 picks',
  '["Tyler", "Thomas"]'::jsonb,
  'Tyler''s Slugfest', 'Lake Monsters',
  '[{"round": 1, "slot": 5}, {"round": 11, "slot": 5}, {"round": 12, "slot": 5}, {"round": 14, "slot": 5}]'::jsonb,
  '[{"round": 4, "slot": 6}, {"round": 6, "slot": 6}, {"round": 8, "slot": 6}, {"round": 23, "slot": 6}]'::jsonb,
  '2025-12-01T12:00:00Z')
ON CONFLICT DO NOTHING;

-- Trade 2: Alex ↔ Mike (Multiple picks both directions)
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_picks, requesting_picks, created_at)
VALUES ('completed', 'offseason',
  'Alex sends Rd 6-11, 15 picks to Mike for Rd 12, 18, 22 picks + more',
  '["Alex", "Mike"]'::jsonb,
  'Alex in Chains', 'The Dirty Farm',
  '[{"round": 6, "slot": 8}, {"round": 7, "slot": 8}, {"round": 9, "slot": 8}, {"round": 10, "slot": 8}, {"round": 11, "slot": 8}, {"round": 15, "slot": 8}]'::jsonb,
  '[{"round": 12, "slot": 11}, {"round": 18, "slot": 11}, {"round": 22, "slot": 11}]'::jsonb,
  '2025-12-05T12:00:00Z')
ON CONFLICT DO NOTHING;

-- Trade 3: Chris ↔ Bob (Rd 7, 9, 22 for Rd 11, 12, 13)
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_picks, requesting_picks, created_at)
VALUES ('completed', 'offseason',
  'Chris trades Rd 11, 13 picks to Bob for Rd 7, 22 picks. Plus Chris Rd 9 to Pudge for Rd 20.',
  '["Chris", "Bob"]'::jsonb,
  'Tunnel Snakes', 'Runs-N-Roses',
  '[{"round": 11, "slot": 7}, {"round": 13, "slot": 7}]'::jsonb,
  '[{"round": 7, "slot": 10}, {"round": 22, "slot": 10}]'::jsonb,
  '2025-12-10T12:00:00Z')
ON CONFLICT DO NOTHING;

-- Trade 4: Nick ↔ Alex (Multiple pick swaps)
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_picks, requesting_picks, created_at)
VALUES ('completed', 'offseason',
  'Nick sends Rd 8, 10 picks to Alex for Rd 19, 22, 23 picks',
  '["Nick", "Alex"]'::jsonb,
  'Red Stagz', 'Alex in Chains',
  '[{"round": 8, "slot": 2}, {"round": 10, "slot": 2}]'::jsonb,
  '[{"round": 19, "slot": 8}, {"round": 22, "slot": 8}, {"round": 23, "slot": 8}]'::jsonb,
  '2025-12-15T12:00:00Z')
ON CONFLICT DO NOTHING;

-- Trade 5: Bob ↔ Nick (Rd 11, 14, 20 for Rd 12, 17, 20)
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_picks, requesting_picks, created_at)
VALUES ('completed', 'offseason',
  'Bob sends Rd 11, 14, 20 picks to Nick for Rd 12, 17, 20 picks',
  '["Bob", "Nick"]'::jsonb,
  'Runs-N-Roses', 'Red Stagz',
  '[{"round": 11, "slot": 10}, {"round": 14, "slot": 10}, {"round": 20, "slot": 10}]'::jsonb,
  '[{"round": 12, "slot": 2}, {"round": 17, "slot": 2}, {"round": 20, "slot": 2}]'::jsonb,
  '2025-12-20T12:00:00Z')
ON CONFLICT DO NOTHING;

-- Trade 6: Chris ↔ Pudge (Rd 9 for Rd 20)
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_picks, requesting_picks, created_at)
VALUES ('completed', 'offseason',
  'Chris sends Rd 9 pick to Pudge for Rd 20 pick',
  '["Chris", "Pudge"]'::jsonb,
  'Tunnel Snakes', 'Bleacher Creatures',
  '[{"round": 9, "slot": 7}]'::jsonb,
  '[{"round": 20, "slot": 1}]'::jsonb,
  '2026-01-05T12:00:00Z')
ON CONFLICT DO NOTHING;

-- Trade 7: Tyler ↔ Alex (Rd 6, 9, 13 for Rd 18, 20)
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_picks, requesting_picks, created_at)
VALUES ('completed', 'offseason',
  'Tyler sends Rd 6, 9, 13 picks to Alex for Rd 18, 20 picks',
  '["Tyler", "Alex"]'::jsonb,
  'Tyler''s Slugfest', 'Alex in Chains',
  '[{"round": 6, "slot": 5}, {"round": 9, "slot": 5}, {"round": 13, "slot": 5}]'::jsonb,
  '[{"round": 18, "slot": 8}, {"round": 20, "slot": 8}]'::jsonb,
  '2026-01-10T12:00:00Z')
ON CONFLICT DO NOTHING;

-- Trade 8: Sean ↔ Greasy (Rd 7 for Rd 18)
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_picks, requesting_picks, created_at)
VALUES ('completed', 'offseason',
  'Sean sends Rd 7 pick to Greasy for Rd 18 pick',
  '["Sean", "Greasy"]'::jsonb,
  'ClutchHutch', 'Greasy Cap Advisors',
  '[{"round": 7, "slot": 12}]'::jsonb,
  '[{"round": 18, "slot": 9}]'::jsonb,
  '2026-01-15T12:00:00Z')
ON CONFLICT DO NOTHING;
