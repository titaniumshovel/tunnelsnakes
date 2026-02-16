-- 0009_seed_managers_and_rosters.sql
-- Seed all 12 managers for The Sandlot 2026 season
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste & run)

-- Clear existing managers (in case of re-run)
TRUNCATE public.managers CASCADE;

INSERT INTO public.managers (display_name, team_name, team_slug, email, yahoo_team_key, role, draft_position) VALUES
  ('Chris',  'Tunnel Snakes',        'tunnel-snakes',        'cjm91792@gmail.com',             '469.l.24701.t.1',  'commissioner', 7),
  ('Alex',   'Alex in Chains',       'alex-in-chains',       'alex.mclaughlin24@gmail.com',    '469.l.24701.t.2',  'owner',        8),
  ('Pudge',  'Bleacher Creatures',   'bleacher-creatures',   'michaeljcasey3@gmail.com',       '469.l.24701.t.3',  'owner',        1),
  ('Sean',   'ClutchHutch',          'clutchhutch',          'sean.hutchinson88@gmail.com',    '469.l.24701.t.4',  'owner',        12),
  ('Tom',    'Goin'' Yahdgoats',     'goin-yahdgoats',       'trward1990@gmail.com',           '469.l.24701.t.5',  'owner',        4),
  ('Greasy', 'Greasy Cap Advisors',  'greasy-cap-advisors',  'cgmilanesi@gmail.com',           '469.l.24701.t.6',  'owner',        9),
  ('Web',    'Lollygaggers',         'lollygaggers',         'web21spider@hotmail.com',        '469.l.24701.t.7',  'owner',        3),
  ('Nick',   'Red Stagz',            'red-stagz',            'gagliardi.nf@gmail.com',         '469.l.24701.t.8',  'owner',        2),
  ('Bob',    'Runs-N-Roses',         'runs-n-roses',         'brose@armadafinancial.com',      '469.l.24701.t.9',  'owner',        10),
  ('Mike',   'The Dirty Farm',       'the-dirty-farm',       'mmacdonald1976@hotmail.com',     '469.l.24701.t.10', 'owner',        11),
  ('Thomas', 'Lake Monsters',        'lake-monsters',        'tsoleary12@gmail.com',           '469.l.24701.t.11', 'owner',        6),
  ('Tyler',  'Tyler''s Slugfest',    'tylers-slugfest',      'tyler.parkhurst@gmail.com',      '469.l.24701.t.12', 'owner',        5);

-- Note: Tyler's Yahoo team name is "I Fielder Boobs" but we store the local name "Tyler's Slugfest"
-- Thomas is "Lake Monsters" (t.11), Tyler is t.12 — these are new expansion teams for 2026
