-- 0008: In-Season (Midseason) Trades from 2025 Yahoo Fantasy Season
-- All 20 trades from the Yahoo API, authoritative source
-- Run in Supabase SQL Editor

-- ============================================
-- Cleanup: Remove wrongly-seeded offseason trades
-- that were reclassified as midseason but don't match
-- any actual Yahoo trade cleanly
-- ============================================
DELETE FROM public.trade_offers WHERE trade_type = 'midseason' AND description LIKE 'Bob sends Rd 11%';
DELETE FROM public.trade_offers WHERE trade_type = 'midseason' AND description LIKE 'Chris sends Rd 9%';

-- ============================================
-- Insert all 20 in-season trades
-- ============================================

-- TX 72 | 2025-03-26 | VETOED — Alex in Chains sends Rafael Devers, ClutchHutch sends Matt Olson
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('vetoed', 'midseason',
  'VETOED — Alex sends Rafael Devers to Sean for Matt Olson',
  '["Alex in Chains", "ClutchHutch"]'::jsonb,
  'Alex in Chains', 'ClutchHutch',
  '["Rafael Devers"]'::jsonb,
  '["Matt Olson"]'::jsonb,
  '2025-03-26T12:00:00Z');

-- TX 109 | 2025-04-03 | Alex in Chains sends Cam Smith, Runs-N-Roses sends Brandon Lowe
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Alex sends Cam Smith to Bob for Brandon Lowe',
  '["Alex in Chains", "Runs-N-Roses"]'::jsonb,
  'Alex in Chains', 'Runs-N-Roses',
  '["Cam Smith"]'::jsonb,
  '["Brandon Lowe"]'::jsonb,
  '2025-04-03T12:00:00Z');

-- TX 115 | 2025-04-04 | Alex in Chains sends Rafael Devers+Gavin Williams, ClutchHutch sends Roman Anthony+Justin Steele
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Alex sends Rafael Devers + Gavin Williams to Sean for Roman Anthony + Justin Steele',
  '["Alex in Chains", "ClutchHutch"]'::jsonb,
  'Alex in Chains', 'ClutchHutch',
  '["Rafael Devers", "Gavin Williams"]'::jsonb,
  '["Roman Anthony", "Justin Steele"]'::jsonb,
  '2025-04-04T12:00:00Z');

-- TX 256 | 2025-04-26 | Alex in Chains sends Tylor Megill, The Dirty Farm sends Mookie Betts
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Alex sends Tylor Megill to Mike for Mookie Betts',
  '["Alex in Chains", "The Dirty Farm"]'::jsonb,
  'Alex in Chains', 'The Dirty Farm',
  '["Tylor Megill"]'::jsonb,
  '["Mookie Betts"]'::jsonb,
  '2025-04-26T12:00:00Z');

-- TX 358 | 2025-05-08 | Runs-N-Roses sends Jorge Polanco, Tunnel Snakes sends Luis García Jr.
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Bob sends Jorge Polanco to Chris for Luis García Jr.',
  '["Runs-N-Roses", "Tunnel Snakes"]'::jsonb,
  'Runs-N-Roses', 'Tunnel Snakes',
  '["Jorge Polanco"]'::jsonb,
  '["Luis García Jr."]'::jsonb,
  '2025-05-08T12:00:00Z');

-- TX 537 | 2025-06-01 | Runs-N-Roses sends Byron Buxton, Red Stagz sends Luis Arraez
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Bob sends Byron Buxton to Nick for Luis Arraez',
  '["Runs-N-Roses", "Red Stagz"]'::jsonb,
  'Runs-N-Roses', 'Red Stagz',
  '["Byron Buxton"]'::jsonb,
  '["Luis Arraez"]'::jsonb,
  '2025-06-01T12:00:00Z');

-- TX 750 | 2025-06-30 | Runs-N-Roses sends Gunnar Henderson, Greasy Cap Advisors sends Gleyber Torres
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Bob sends Gunnar Henderson to Greasy for Gleyber Torres',
  '["Runs-N-Roses", "Greasy Cap Advisors"]'::jsonb,
  'Runs-N-Roses', 'Greasy Cap Advisors',
  '["Gunnar Henderson"]'::jsonb,
  '["Gleyber Torres"]'::jsonb,
  '2025-06-30T12:00:00Z');

-- TX 803 | 2025-07-07 | Runs-N-Roses sends Jac Caglianone, Goin' Yahdgoats sends Ranger Suárez
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Bob sends Jac Caglianone to Tom for Ranger Suárez',
  '["Runs-N-Roses", "Goin'' Yahdgoats"]'::jsonb,
  'Runs-N-Roses', 'Goin'' Yahdgoats',
  '["Jac Caglianone"]'::jsonb,
  '["Ranger Suárez"]'::jsonb,
  '2025-07-07T12:00:00Z');

-- TX 821 | 2025-07-10 | The Dirty Farm sends David Peterson+Chase Burns, Red Stagz sends Max Fried+Joe Ryan
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Mike sends David Peterson + Chase Burns to Nick for Max Fried + Joe Ryan',
  '["The Dirty Farm", "Red Stagz"]'::jsonb,
  'The Dirty Farm', 'Red Stagz',
  '["David Peterson", "Chase Burns"]'::jsonb,
  '["Max Fried", "Joe Ryan"]'::jsonb,
  '2025-07-10T12:00:00Z');

-- TX 840 | 2025-07-14 | ClutchHutch sends Jurickson Profar, Goin' Yahdgoats sends Josh Hader+Michael King
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Sean sends Jurickson Profar to Tom for Josh Hader + Michael King',
  '["ClutchHutch", "Goin'' Yahdgoats"]'::jsonb,
  'ClutchHutch', 'Goin'' Yahdgoats',
  '["Jurickson Profar"]'::jsonb,
  '["Josh Hader", "Michael King"]'::jsonb,
  '2025-07-14T12:00:00Z');

-- TX 878 | 2025-07-25 | ClutchHutch sends Andrew Painter, Goin' Yahdgoats sends Dylan Cease
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Sean sends Andrew Painter to Tom for Dylan Cease',
  '["ClutchHutch", "Goin'' Yahdgoats"]'::jsonb,
  'ClutchHutch', 'Goin'' Yahdgoats',
  '["Andrew Painter"]'::jsonb,
  '["Dylan Cease"]'::jsonb,
  '2025-07-25T12:00:00Z');

-- TX 881 | 2025-07-26 | Runs-N-Roses sends Jack Leiter, Red Stagz sends Ryan Helsley
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Bob sends Jack Leiter to Nick for Ryan Helsley',
  '["Runs-N-Roses", "Red Stagz"]'::jsonb,
  'Runs-N-Roses', 'Red Stagz',
  '["Jack Leiter"]'::jsonb,
  '["Ryan Helsley"]'::jsonb,
  '2025-07-26T12:00:00Z');

-- TX 953 | 2025-08-04 | Red Stagz sends Sandy Alcantara, Runs-N-Roses sends Bubba Chandler
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Nick sends Sandy Alcantara to Bob for Bubba Chandler',
  '["Red Stagz", "Runs-N-Roses"]'::jsonb,
  'Red Stagz', 'Runs-N-Roses',
  '["Sandy Alcantara"]'::jsonb,
  '["Bubba Chandler"]'::jsonb,
  '2025-08-04T12:00:00Z');

-- TX 983 | 2025-08-07 | Tunnel Snakes sends Brandon Nimmo+Noah Schultz, Bleacher Creatures sends Andrés Muñoz
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Chris sends Brandon Nimmo + Noah Schultz to Pudge for Andrés Muñoz',
  '["Tunnel Snakes", "Bleacher Creatures"]'::jsonb,
  'Tunnel Snakes', 'Bleacher Creatures',
  '["Brandon Nimmo", "Noah Schultz"]'::jsonb,
  '["Andrés Muñoz"]'::jsonb,
  '2025-08-07T12:00:00Z');

-- TX 985 | 2025-08-07 | Runs-N-Roses sends Luis Severino, Red Stagz sends Brayan Bello
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Bob sends Luis Severino to Nick for Brayan Bello',
  '["Runs-N-Roses", "Red Stagz"]'::jsonb,
  'Runs-N-Roses', 'Red Stagz',
  '["Luis Severino"]'::jsonb,
  '["Brayan Bello"]'::jsonb,
  '2025-08-07T12:00:00Z');

-- TX 993 | 2025-08-08 | Tunnel Snakes sends Chris Paddack, Red Stagz sends Drew Rasmussen
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Chris sends Chris Paddack to Nick for Drew Rasmussen',
  '["Tunnel Snakes", "Red Stagz"]'::jsonb,
  'Tunnel Snakes', 'Red Stagz',
  '["Chris Paddack"]'::jsonb,
  '["Drew Rasmussen"]'::jsonb,
  '2025-08-08T12:00:00Z');

-- TX 995 | 2025-08-09 | Lollygaggers sends Brandon Woodruff, The Dirty Farm sends Kristian Campbell+Randy Rodríguez
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Web sends Brandon Woodruff to Mike for Kristian Campbell + Randy Rodríguez',
  '["Lollygaggers", "The Dirty Farm"]'::jsonb,
  'Lollygaggers', 'The Dirty Farm',
  '["Brandon Woodruff"]'::jsonb,
  '["Kristian Campbell", "Randy Rodríguez"]'::jsonb,
  '2025-08-09T12:00:00Z');

-- TX 996 | 2025-08-09 | Runs-N-Roses sends Calvin Faucher+Walker Jenkins+José Soriano, Lollygaggers sends George Kirby+Mason Miller
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Bob sends Calvin Faucher + Walker Jenkins + José Soriano to Web for George Kirby + Mason Miller',
  '["Runs-N-Roses", "Lollygaggers"]'::jsonb,
  'Runs-N-Roses', 'Lollygaggers',
  '["Calvin Faucher", "Walker Jenkins", "José Soriano"]'::jsonb,
  '["George Kirby", "Mason Miller"]'::jsonb,
  '2025-08-09T12:00:00Z');

-- TX 1003 | 2025-08-10 | Lollygaggers sends Kenley Jansen, Runs-N-Roses sends Matt Shaw
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Web sends Kenley Jansen to Bob for Matt Shaw',
  '["Lollygaggers", "Runs-N-Roses"]'::jsonb,
  'Lollygaggers', 'Runs-N-Roses',
  '["Kenley Jansen"]'::jsonb,
  '["Matt Shaw"]'::jsonb,
  '2025-08-10T12:00:00Z');

-- TX 1004 | 2025-08-10 | Alex in Chains sends Nick Pivetta, Tunnel Snakes sends Zac Gallen
INSERT INTO public.trade_offers (status, trade_type, description, teams_involved, from_team_name, target_team, offering_players, requesting_players, created_at)
VALUES ('completed', 'midseason',
  'Alex sends Nick Pivetta to Chris for Zac Gallen',
  '["Alex in Chains", "Tunnel Snakes"]'::jsonb,
  'Alex in Chains', 'Tunnel Snakes',
  '["Nick Pivetta"]'::jsonb,
  '["Zac Gallen"]'::jsonb,
  '2025-08-10T12:00:00Z');
