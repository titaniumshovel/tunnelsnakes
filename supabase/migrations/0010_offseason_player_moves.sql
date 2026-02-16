-- 0010_offseason_player_moves.sql
-- Fix roster assignments after offseason player trades
-- These trades happened between Feb 10-15, 2026
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste & run)

-- ============================================
-- PART 1: ROSTER PLAYER MOVES
-- ============================================

-- Player ID reference (from players table):
--   Pete Alonso      = 88ee6beb-8116-49cf-849a-7838d696122d
--   Austin Riley      = 16f65ddf-3862-454f-8708-04c174733d0f
--   Cody Bellinger    = 223dfc12-d680-4135-9006-193f66e101b3
--   Mookie Betts      = f62cbe80-a165-42bf-8563-094c51961bd1
--   Alex Bregman      = 063ea1b5-99e0-4c36-844d-019d7a6881e2
--   Trea Turner       = 02f73e9e-5880-4b35-b374-de7b49114aea
--   Nolan McLean      = fc1d1ae1-8563-40b7-9808-fee4ef77647b
--   Matt Olson        = 9703102d-4763-4f97-ae10-7d7490b41904
--   Jazz Chisholm Jr. = f16726d8-b5c9-4f46-8b54-d70df8b3c33c
--   Max Fried         = 8b4088e6-750a-4954-9108-11bae47abff8
--   Hunter Brown      = c87ab53e-ae19-4422-8cc7-b0e1536ce473
--   Bryan Woo         = 148bebfc-3205-4681-a8b6-781e78db2d2e
--   Ethan Salas       = 0c406e49-d317-4d5f-96ef-8a100de9976e

BEGIN;

-- -----------------------------------------------
-- Trade: Chris ↔ Bob (Feb 15)
-- Chris sends Pete Alonso + Austin Riley to Bob
-- Bob sends picks to Chris
-- -----------------------------------------------

-- Move 1: Pete Alonso — Chris (t.1) → Bob (t.9)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.9',
    updated_at = now()
WHERE player_id = '88ee6beb-8116-49cf-849a-7838d696122d'
  AND yahoo_team_key = '469.l.24701.t.1';

-- Move 13: Austin Riley — Chris (t.1) → Bob (t.9)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.9',
    updated_at = now()
WHERE player_id = '16f65ddf-3862-454f-8708-04c174733d0f'
  AND yahoo_team_key = '469.l.24701.t.1';

-- -----------------------------------------------
-- Cody Bellinger duplicate cleanup
-- Chris (t.1) keeps the real entry (roster id 9b02cd81)
-- Delete the duplicate on Bob's team (t.9) (roster id f01d761c)
-- -----------------------------------------------
DELETE FROM public.my_roster_players
WHERE id = 'f01d761c-8293-48c4-9f7d-73e248038130'
  AND player_id = '223dfc12-d680-4135-9006-193f66e101b3'
  AND yahoo_team_key = '469.l.24701.t.9';

-- -----------------------------------------------
-- Trade: Sean ↔ Alex (Feb 10)
-- Sean sends Matt Olson to Alex
-- Alex sends picks to Sean
-- -----------------------------------------------

-- Move 3: Matt Olson — Sean (t.4) → Alex (t.2)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.2',
    updated_at = now()
WHERE player_id = '9703102d-4763-4f97-ae10-7d7490b41904'
  AND yahoo_team_key = '469.l.24701.t.4';

-- -----------------------------------------------
-- Trade: Greasy ↔ Sean (Feb 13)
-- Greasy sends Jazz Chisholm Jr. to Sean
-- Sean sends picks to Greasy
-- -----------------------------------------------

-- Move 4: Jazz Chisholm Jr. — Greasy (t.6) → Sean (t.4)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.4',
    updated_at = now()
WHERE player_id = 'f16726d8-b5c9-4f46-8b54-d70df8b3c33c'
  AND yahoo_team_key = '469.l.24701.t.6';

-- -----------------------------------------------
-- Trade: Alex ↔ Tyler (Feb 14)
-- Alex sends Bregman + Trea Turner to Tyler
-- Tyler sends picks to Alex
-- -----------------------------------------------

-- Move 5: Alex Bregman — Alex (t.2) → Tyler (t.12)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.12',
    updated_at = now()
WHERE player_id = '063ea1b5-99e0-4c36-844d-019d7a6881e2'
  AND yahoo_team_key = '469.l.24701.t.2';

-- Move 6: Trea Turner — Alex (t.2) → Tyler (t.12)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.12',
    updated_at = now()
WHERE player_id = '02f73e9e-5880-4b35-b374-de7b49114aea'
  AND yahoo_team_key = '469.l.24701.t.2';

-- -----------------------------------------------
-- Trade: Nick ↔ Alex (Feb 15)
-- Nick sends picks to Alex for Mookie Betts
-- -----------------------------------------------

-- Move 7: Mookie Betts — Alex (t.2) → Nick (t.8)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.8',
    updated_at = now()
WHERE player_id = 'f62cbe80-a165-42bf-8563-094c51961bd1'
  AND yahoo_team_key = '469.l.24701.t.2';

-- -----------------------------------------------
-- Trade: Mike ↔ Alex (Feb 15)
-- Alex sends Nolan McLean to Mike
-- Mike sends Bryan Woo + Ethan Salas to Alex
-- -----------------------------------------------

-- Move 8: Nolan McLean — Alex (t.2) → Mike (t.10)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.10',
    updated_at = now()
WHERE player_id = 'fc1d1ae1-8563-40b7-9808-fee4ef77647b'
  AND yahoo_team_key = '469.l.24701.t.2';

-- Move 9: Bryan Woo — Mike (t.10) → Alex (t.2)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.2',
    updated_at = now()
WHERE player_id = '148bebfc-3205-4681-a8b6-781e78db2d2e'
  AND yahoo_team_key = '469.l.24701.t.10';

-- Move 10: Ethan Salas — Mike (t.10) → Alex (t.2)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.2',
    updated_at = now()
WHERE player_id = '0c406e49-d317-4d5f-96ef-8a100de9976e'
  AND yahoo_team_key = '469.l.24701.t.10';

-- -----------------------------------------------
-- Trade: Mike ↔ Tyler (Feb 15)
-- Mike sends Hunter Brown + Max Fried to Tyler
-- Tyler sends picks to Mike
-- -----------------------------------------------

-- Move 11: Hunter Brown — Mike (t.10) → Tyler (t.12)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.12',
    updated_at = now()
WHERE player_id = 'c87ab53e-ae19-4422-8cc7-b0e1536ce473'
  AND yahoo_team_key = '469.l.24701.t.10';

-- Move 12: Max Fried — Mike (t.10) → Tyler (t.12)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.12',
    updated_at = now()
WHERE player_id = '8b4088e6-750a-4954-9108-11bae47abff8'
  AND yahoo_team_key = '469.l.24701.t.10';

-- ============================================
-- PART 2: TRADE OFFERS (Player trades)
-- These complement the pick-only trades in 0007
-- ============================================

-- Trade: Sean ↔ Alex — Matt Olson for picks (Feb 10)
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Sean trades Matt Olson to Alex for draft picks',
  '["Sean", "Alex"]'::jsonb,
  'ClutchHutch', 'Alex in Chains',
  '["Matt Olson"]'::jsonb, '[]'::jsonb,
  '[]'::jsonb, '[]'::jsonb,
  '2026-02-10T12:00:00Z'
);

-- Trade: Greasy ↔ Sean — Jazz Chisholm Jr. for picks (Feb 13)
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Greasy trades Jazz Chisholm Jr. to Sean for draft picks',
  '["Greasy", "Sean"]'::jsonb,
  'Greasy Cap Advisors', 'ClutchHutch',
  '["Jazz Chisholm Jr."]'::jsonb, '[]'::jsonb,
  '[]'::jsonb, '[]'::jsonb,
  '2026-02-13T12:00:00Z'
);

-- Trade: Alex ↔ Tyler — Bregman + Turner for picks (Feb 14)
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Alex trades Alex Bregman and Trea Turner to Tyler for draft picks',
  '["Alex", "Tyler"]'::jsonb,
  'Alex in Chains', 'Tyler''s Slugfest',
  '["Alex Bregman", "Trea Turner"]'::jsonb, '[]'::jsonb,
  '[]'::jsonb, '[]'::jsonb,
  '2026-02-14T12:00:00Z'
);

-- Trade: Nick ↔ Alex — Mookie Betts for picks (Feb 15)
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Alex trades Mookie Betts to Nick for draft picks',
  '["Alex", "Nick"]'::jsonb,
  'Alex in Chains', 'Red Stagz',
  '["Mookie Betts"]'::jsonb, '[]'::jsonb,
  '[]'::jsonb, '[]'::jsonb,
  '2026-02-15T12:00:00Z'
);

-- Trade: Mike ↔ Alex — McLean for Woo + Salas (Feb 15)
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Alex trades Nolan McLean to Mike for Bryan Woo and Ethan Salas',
  '["Alex", "Mike"]'::jsonb,
  'Alex in Chains', 'The Dirty Farm',
  '["Nolan McLean"]'::jsonb, '["Bryan Woo", "Ethan Salas"]'::jsonb,
  '[]'::jsonb, '[]'::jsonb,
  '2026-02-15T12:00:00Z'
);

-- Trade: Mike ↔ Tyler — Brown + Fried for picks (Feb 15)
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Mike trades Hunter Brown and Max Fried to Tyler for draft picks',
  '["Mike", "Tyler"]'::jsonb,
  'The Dirty Farm', 'Tyler''s Slugfest',
  '["Hunter Brown", "Max Fried"]'::jsonb, '[]'::jsonb,
  '[]'::jsonb, '[]'::jsonb,
  '2026-02-15T12:00:00Z'
);

-- Trade: Chris ↔ Bob — Alonso + Riley for picks (Feb 15)
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Chris trades Pete Alonso and Austin Riley to Bob for draft picks',
  '["Chris", "Bob"]'::jsonb,
  'Tunnel Snakes', 'Runs-N-Roses',
  '["Pete Alonso", "Austin Riley"]'::jsonb, '[]'::jsonb,
  '[]'::jsonb, '[]'::jsonb,
  '2026-02-15T12:00:00Z'
);

-- Trade: Thomas ↔ Tyler — picks only (Feb 15) — already in 0007 as Trade 1
-- No player moves needed, just noting it exists

COMMIT;

-- ============================================
-- VERIFICATION: Run after migration to confirm
-- ============================================
-- SELECT p.full_name, mrp.yahoo_team_key, m.display_name
-- FROM my_roster_players mrp
-- JOIN players p ON p.id = mrp.player_id
-- JOIN managers m ON m.yahoo_team_key = mrp.yahoo_team_key
-- WHERE p.full_name IN (
--   'Pete Alonso', 'Austin Riley', 'Cody Bellinger',
--   'Matt Olson', 'Jazz Chisholm Jr.',
--   'Alex Bregman', 'Trea Turner', 'Mookie Betts',
--   'Nolan McLean', 'Bryan Woo', 'Ethan Salas',
--   'Hunter Brown', 'Max Fried'
-- )
-- ORDER BY p.full_name;
