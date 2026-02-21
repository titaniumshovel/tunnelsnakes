-- 0015_missing_offseason_trades.sql
-- Add 7 missing offseason trades (OS7–OS10 + 3 more) that were not in 0007/0010
-- These trades happened between Feb 16-19, 2026
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste & run)

-- ============================================
-- PART 1: ROSTER PLAYER MOVES
-- ============================================

-- Player ID reference (from players table):
--   Byron Buxton      = 1fd58f69-f1f6-468e-b893-dc2150d0aaff
--   Manny Machado     = 2a155e92-1395-47bb-8146-1bde07541675
--   Chase Burns       = aef0f049-c826-452f-b00e-d50852a82594
--   Ivan Herrera      = 6159d8e8-eb20-41cf-9711-ab732114781f
--   Taylor Ward       = b892a83a-7e95-44a8-af62-659699fe93b3
--   Jarren Duran      = 0ef3583f-9f16-4bf3-87cb-03bbfec29dfa
--   Christian Yelich   = 7b7de0cc-b3c8-45f8-8ec9-77552b80d9d9
--   Wyatt Langford    = 884f6aa8-6084-40e6-a11f-d863e89f8d69
--   Edwin Díaz        = 65fe7ecc-27a0-48da-bde1-285016f3975d
--   Cole Ragans       = 26eabfef-4471-4048-ae7d-9d96c2944716
--   Kyle Schwarber    = 58be4caa-5c36-49d0-93fd-0124a4f1b68a
--   Nick Pivetta      = 7ee12849-ab0f-44a1-b71e-5d730f90ce2d
--   Yandy Díaz        = 0bb03f22-365e-4b3d-ba13-a2628214e780

-- NOTE: Jarren Duran was drafted by Alex (t.2) in Rd 13, Pick 127 of the
-- 2025 season (league 458.l.5221). Trade 27 correctly moves him Alex → Tom.
-- Tom's keeper cost (Rd 6) is based on ECR, not original draft position.

BEGIN;

-- -----------------------------------------------
-- Trade 25 — OS7: Nick ↔ Alex (Feb 16)
-- Nick sends Byron Buxton + Rd 8 pick to Alex
-- Alex sends Manny Machado + Rd 22 pick to Nick
-- -----------------------------------------------

-- Byron Buxton — Nick (t.8) → Alex (t.2)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.2',
    updated_at = now()
WHERE player_id = '1fd58f69-f1f6-468e-b893-dc2150d0aaff'
  AND yahoo_team_key = '469.l.24701.t.8';

-- Manny Machado — Alex (t.2) → Nick (t.8)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.8',
    updated_at = now()
WHERE player_id = '2a155e92-1395-47bb-8146-1bde07541675'
  AND yahoo_team_key = '469.l.24701.t.2';

-- -----------------------------------------------
-- Trade 26 — OS8: Mike ↔ Alex (Feb 16)
-- Mike sends Chase Burns + Ivan Herrera + Rd 23 pick to Alex
-- Alex sends Rd 13 pick to Mike
-- -----------------------------------------------

-- Chase Burns — Mike (t.10) → Alex (t.2)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.2',
    updated_at = now()
WHERE player_id = 'aef0f049-c826-452f-b00e-d50852a82594'
  AND yahoo_team_key = '469.l.24701.t.10';

-- Ivan Herrera — Mike (t.10) → Alex (t.2)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.2',
    updated_at = now()
WHERE player_id = '6159d8e8-eb20-41cf-9711-ab732114781f'
  AND yahoo_team_key = '469.l.24701.t.10';

-- -----------------------------------------------
-- Trade 27 — OS9: Tom ↔ Alex (Feb 17)
-- Tom sends Taylor Ward + Rd 8 + Rd 10 picks to Alex
-- Alex sends Jarren Duran + Rd 13 + Rd 18 picks to Tom
-- NOTE: Duran was drafted by Alex (t.2) in 2025 Rd 13.
--   This trade is his path from Alex to Tom.
-- -----------------------------------------------

-- Taylor Ward — Tom (t.5) → Alex (t.2)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.2',
    updated_at = now()
WHERE player_id = 'b892a83a-7e95-44a8-af62-659699fe93b3'
  AND yahoo_team_key = '469.l.24701.t.5';

-- Jarren Duran — Alex (t.2) → Tom (t.5)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.5',
    updated_at = now()
WHERE player_id = '0ef3583f-9f16-4bf3-87cb-03bbfec29dfa'
  AND yahoo_team_key = '469.l.24701.t.2';

-- -----------------------------------------------
-- Trade 28 — OS10: Alex ↔ Tyler (Feb 17)
-- Alex sends Christian Yelich + Taylor Ward + Rd 8 (slot 8) + Rd 10 (slot 4) to Tyler
-- Tyler sends Rd 2 (slot 5) + Rd 6 (slot 6) to Alex
-- NOTE: Ward was just traded TO Alex in Trade 27, now goes to Tyler.
-- -----------------------------------------------

-- Christian Yelich — Alex (t.2) → Tyler (t.12)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.12',
    updated_at = now()
WHERE player_id = '7b7de0cc-b3c8-45f8-8ec9-77552b80d9d9'
  AND yahoo_team_key = '469.l.24701.t.2';

-- Taylor Ward — Alex (t.2) → Tyler (t.12)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.12',
    updated_at = now()
WHERE player_id = 'b892a83a-7e95-44a8-af62-659699fe93b3'
  AND yahoo_team_key = '469.l.24701.t.2';

-- -----------------------------------------------
-- Trade 29 — Alex ↔ Pudge (Feb 18)
-- Alex sends Wyatt Langford + Edwin Díaz + Cole Ragans + Rd 7 + Rd 20 to Pudge
-- Pudge sends Kyle Schwarber + Rd 11 + Rd 23 to Alex
-- -----------------------------------------------

-- Wyatt Langford — Alex (t.2) → Pudge (t.3)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.3',
    updated_at = now()
WHERE player_id = '884f6aa8-6084-40e6-a11f-d863e89f8d69'
  AND yahoo_team_key = '469.l.24701.t.2';

-- Edwin Díaz — Alex (t.2) → Pudge (t.3)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.3',
    updated_at = now()
WHERE player_id = '65fe7ecc-27a0-48da-bde1-285016f3975d'
  AND yahoo_team_key = '469.l.24701.t.2';

-- Cole Ragans — Alex (t.2) → Pudge (t.3)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.3',
    updated_at = now()
WHERE player_id = '26eabfef-4471-4048-ae7d-9d96c2944716'
  AND yahoo_team_key = '469.l.24701.t.2';

-- Kyle Schwarber — Pudge (t.3) → Alex (t.2)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.2',
    updated_at = now()
WHERE player_id = '58be4caa-5c36-49d0-93fd-0124a4f1b68a'
  AND yahoo_team_key = '469.l.24701.t.3';

-- -----------------------------------------------
-- Trade 30 — Bob ↔ Alex (Feb 18) — PICKS ONLY
-- Bob sends Rd 15 + Rd 19 + Rd 23 to Alex
-- Alex sends Rd 16 + Rd 17 + Rd 21 to Bob
-- No player moves needed.
-- -----------------------------------------------

-- -----------------------------------------------
-- Trade 31 — Chris ↔ Thomas (Feb 19)
-- Chris sends Nick Pivetta + Yandy Díaz + Rd 22 + Rd 23 to Thomas
-- Thomas sends Rd 12 + Rd 16 to Chris
-- -----------------------------------------------

-- Nick Pivetta — Chris (t.1) → Thomas (t.11)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.11',
    updated_at = now()
WHERE player_id = '7ee12849-ab0f-44a1-b71e-5d730f90ce2d'
  AND yahoo_team_key = '469.l.24701.t.1';

-- Yandy Díaz — Chris (t.1) → Thomas (t.11)
UPDATE public.my_roster_players
SET yahoo_team_key = '469.l.24701.t.11',
    updated_at = now()
WHERE player_id = '0bb03f22-365e-4b3d-ba13-a2628214e780'
  AND yahoo_team_key = '469.l.24701.t.1';

-- ============================================
-- PART 2: TRADE OFFERS
-- Record all 7 trades in trade history
-- ============================================

-- Trade 25 — OS7: Nick ↔ Alex — Buxton + Rd 8 for Machado + Rd 22
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Nick trades Byron Buxton and Rd 8 pick to Alex for Manny Machado and Rd 22 pick',
  '["Nick", "Alex"]'::jsonb,
  'Red Stagz', 'Alex in Chains',
  '["Byron Buxton"]'::jsonb, '["Manny Machado"]'::jsonb,
  '[{"round": 8, "slot": 2}]'::jsonb,
  '[{"round": 22, "slot": 8}]'::jsonb,
  '2026-02-16T12:00:00Z'
);

-- Trade 26 — OS8: Mike ↔ Alex — Burns + Herrera + Rd 23 for Rd 13
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Mike trades Chase Burns, Ivan Herrera, and Rd 23 pick to Alex for Rd 13 pick',
  '["Mike", "Alex"]'::jsonb,
  'The Dirty Farm', 'Alex in Chains',
  '["Chase Burns", "Ivan Herrera"]'::jsonb, '[]'::jsonb,
  '[{"round": 23, "slot": 11}]'::jsonb,
  '[{"round": 13, "slot": 8}]'::jsonb,
  '2026-02-16T14:00:00Z'
);

-- Trade 27 — OS9: Tom ↔ Alex — Ward + Rd 8 + Rd 10 for Duran + Rd 13 + Rd 18
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Tom trades Taylor Ward and Rd 8, 10 picks to Alex for Jarren Duran and Rd 13, 18 picks',
  '["Tom", "Alex"]'::jsonb,
  'Goin'' Yahdgoats', 'Alex in Chains',
  '["Taylor Ward"]'::jsonb, '["Jarren Duran"]'::jsonb,
  '[{"round": 8, "slot": 4}, {"round": 10, "slot": 4}]'::jsonb,
  '[{"round": 13, "slot": 5}, {"round": 18, "slot": 11}]'::jsonb,
  '2026-02-17T12:00:00Z'
);

-- Trade 28 — OS10: Alex ↔ Tyler — Yelich + Ward + Rd 8.8 + Rd 10.4 for Rd 2.5 + Rd 6.6
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Alex trades Christian Yelich, Taylor Ward, and Rd 8, 10 picks to Tyler for Rd 2, 6 picks',
  '["Alex", "Tyler"]'::jsonb,
  'Alex in Chains', 'Tyler''s Slugfest',
  '["Christian Yelich", "Taylor Ward"]'::jsonb, '[]'::jsonb,
  '[{"round": 8, "slot": 8}, {"round": 10, "slot": 4}]'::jsonb,
  '[{"round": 2, "slot": 5}, {"round": 6, "slot": 6}]'::jsonb,
  '2026-02-17T14:00:00Z'
);

-- Trade 29 — Alex ↔ Pudge — Langford + Díaz + Ragans + Rd 7 + Rd 20 for Schwarber + Rd 11 + Rd 23
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Alex trades Wyatt Langford, Edwin Díaz, Cole Ragans, and Rd 7, 20 picks to Pudge for Kyle Schwarber and Rd 11, 23 picks',
  '["Alex", "Pudge"]'::jsonb,
  'Alex in Chains', 'Bleacher Creatures',
  '["Wyatt Langford", "Edwin Díaz", "Cole Ragans"]'::jsonb, '["Kyle Schwarber"]'::jsonb,
  '[{"round": 7, "slot": 11}, {"round": 20, "slot": 3}]'::jsonb,
  '[{"round": 11, "slot": 1}, {"round": 23, "slot": 1}]'::jsonb,
  '2026-02-18T12:00:00Z'
);

-- Trade 30 — Bob ↔ Alex — Picks only (Rd 15, 19, 23 for Rd 16, 17, 21)
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Bob trades Rd 15, 19, 23 picks to Alex for Rd 16, 17, 21 picks',
  '["Bob", "Alex"]'::jsonb,
  'Runs-N-Roses', 'Alex in Chains',
  '[]'::jsonb, '[]'::jsonb,
  '[{"round": 15, "slot": 10}, {"round": 19, "slot": 10}, {"round": 23, "slot": 10}]'::jsonb,
  '[{"round": 16, "slot": 8}, {"round": 17, "slot": 8}, {"round": 21, "slot": 8}]'::jsonb,
  '2026-02-18T14:00:00Z'
);

-- Trade 31 — Chris ↔ Thomas — Pivetta + Díaz + Rd 22, 23 for Rd 12, 16
INSERT INTO public.trade_offers (
  status, trade_type, description, teams_involved,
  from_team_name, target_team,
  offering_players, requesting_players,
  offering_picks, requesting_picks,
  created_at
) VALUES (
  'completed', 'offseason',
  'Chris trades Nick Pivetta, Yandy Díaz, and Rd 22, 23 picks to Thomas for Rd 12, 16 picks',
  '["Chris", "Thomas"]'::jsonb,
  'Tunnel Snakes', 'Lake Monsters',
  '["Nick Pivetta", "Yandy Díaz"]'::jsonb, '[]'::jsonb,
  '[{"round": 22, "slot": 7}, {"round": 23, "slot": 7}]'::jsonb,
  '[{"round": 12, "slot": 6}, {"round": 16, "slot": 6}]'::jsonb,
  '2026-02-19T12:00:00Z'
);

COMMIT;

-- ============================================
-- VERIFICATION: Run after migration to confirm
-- ============================================
-- SELECT p.full_name, mrp.yahoo_team_key, m.display_name
-- FROM my_roster_players mrp
-- JOIN players p ON p.id = mrp.player_id
-- JOIN managers m ON m.yahoo_team_key = mrp.yahoo_team_key
-- WHERE p.full_name IN (
--   'Byron Buxton', 'Manny Machado',
--   'Chase Burns', 'Ivan Herrera',
--   'Taylor Ward', 'Jarren Duran',
--   'Christian Yelich',
--   'Wyatt Langford', 'Edwin Díaz', 'Cole Ragans', 'Kyle Schwarber',
--   'Nick Pivetta', 'Yandy Díaz'
-- )
-- ORDER BY p.full_name;
--
-- Expected results:
--   Byron Buxton      → t.2  (Alex in Chains)
--   Chase Burns       → t.2  (Alex in Chains)
--   Christian Yelich  → t.12 (Tyler's Slugfest)
--   Cole Ragans       → t.3  (Bleacher Creatures)
--   Edwin Díaz        → t.3  (Bleacher Creatures)
--   Ivan Herrera      → t.2  (Alex in Chains)
--   Jarren Duran      → t.5  (Goin' Yahdgoats)
--   Kyle Schwarber    → t.2  (Alex in Chains)
--   Manny Machado     → t.8  (Red Stagz)
--   Nick Pivetta      → t.11 (Lake Monsters)
--   Taylor Ward       → t.12 (Tyler's Slugfest)
--   Wyatt Langford    → t.3  (Bleacher Creatures)
--   Yandy Díaz        → t.11 (Lake Monsters)
