-- 0016_lock_keepers.sql
-- Lock all keeper selections for the 2026 season
-- Date: February 20, 2026
-- 
-- This migration finalizes keeper selections across all 12 teams:
--   1. Resets all players to 'not-keeping'
--   2. Sets confirmed keepers (keeping, keeping-7th, keeping-na)
--   3. Applies cost corrections validated against Yahoo API

BEGIN;

-- ============================================================================
-- STEP 1: Reset all players to not-keeping
-- ============================================================================
UPDATE my_roster_players SET keeper_status = 'not-keeping' WHERE keeper_status != 'not-keeping';

-- ============================================================================
-- STEP 2: Set KEEPING (regular keepers) — 6 per team (except expansion/partial)
-- ============================================================================
UPDATE my_roster_players SET keeper_status = 'keeping' WHERE id IN (
  -- t.1 Chris (Tunnel Snakes)
  'e7191f54-21bc-48df-b8f3-14baf22e7edf', -- Yordan Alvarez, Rd 3
  '8c2b83f7-f121-4501-8e75-8f070badefa1', -- Chris Sale, Rd 4
  '4ab6e890-6af4-4256-ad61-605ca49cb9ce', -- Jackson Merrill, Rd 5
  '9b02cd81-71d3-44de-9949-146a917b6dd7', -- Cody Bellinger, Rd 6
  '0abde41e-a616-4eb1-a61e-35fc79b92d8a', -- Cal Raleigh, Rd 9
  'f5afc63b-9b28-4a82-a680-d5b132d998d0', -- Eury Pérez, Rd 23 (FA)

  -- t.2 Alex (Alex in Chains)
  'd417b6b2-304b-4299-94c7-3dbaa3bef28a', -- Kyle Schwarber, Rd 2
  '16ee958f-0b8c-4d6d-a410-4492bc62a62d', -- Matt Olson, Rd 3
  '507ffc59-deda-418b-a3a2-e6388bf35768', -- Bryan Woo, Rd 12
  '3fc4af4f-f4cd-45a3-9da6-73997d566ed7', -- Byron Buxton, Rd 19
  'f0e0c696-1f9e-4879-8f9b-b65d7af899ea', -- Mike Trout, Rd 23
  'ad1293ef-2269-4c5c-944b-07dd19cd351a', -- Chase Burns, Rd 23

  -- t.3 Pudge (Bleacher Creatures)
  '7976f126-0528-44fc-8e98-7a914534acc3', -- Yoshinobu Yamamoto, Rd 3
  'b17fec3b-b4cb-4ff1-9f0b-5c6e19e17efc', -- Francisco Lindor, Rd 3 (ECR)
  '60015e71-f92b-47dd-868e-e7deb7d6a7a8', -- Wyatt Langford, Rd 4 (ECR)
  '644e583b-02f4-49b2-ac1c-6db1fbb4be15', -- Cole Ragans, Rd 4 (ECR)
  'cd7201cf-e610-4a93-9428-5e4b3ececafa', -- Edwin Díaz, Rd 5 (ECR)
  'bf326929-1d19-4c2b-86c5-5e26603ab524', -- Jesús Luzardo, Rd 23

  -- t.4 Sean (ClutchHutch)
  '58b803bd-8f6f-4a64-ae33-9a28b63083e0', -- Tarik Skubal, Rd 1 (ECR)
  '978e09a6-facd-4ae2-b439-4d032e5b957b', -- Elly De La Cruz, Rd 1 (ECR)
  '08e018f3-fbe7-4828-aa75-4b17da38128e', -- Jazz Chisholm Jr., Rd 2 (ECR)
  '0fe631cc-0bf0-4e33-bc49-d8de9d93938b', -- Cristopher Sánchez, Rd 3 (ECR)
  '1340c3a4-381f-4d33-86ce-b9d25f1a3bf9', -- Rafael Devers, Rd 4 (ECR)
  'd172b25d-b1d3-444d-9250-1183acc3686b', -- Brent Rooker, Rd 4 (ECR)

  -- t.5 Tom (Goin' Yahdgoats)
  'a38088ab-fc95-4644-8552-13072a116ff7', -- Logan Gilbert, Rd 4
  '0d592156-2414-46b4-9a8b-dfed33ffa85c', -- Jarren Duran, Rd 6
  'a2a34319-47be-4ec7-84db-bf55334b99ed', -- Jac Caglianone, Rd 21
  '5c093ab2-274d-4c9b-8036-c503d9b098e0', -- George Springer, Rd 23 (FA)
  'da5ba58c-49da-4fe2-9d34-b2f906aecf1b', -- Hunter Goodman, Rd 23 (FA)
  '97664bb2-bdab-4f13-b20a-540a8fb889cf', -- Framber Valdez, Rd 23 (FA)

  -- t.6 Greasy (Greasy Cap Advisors)
  '60f53dd5-bc0c-4b31-a8b9-d433f03f9cf7', -- Ronald Acuña Jr., Rd 1 (ECR)
  '16da6166-ccc0-418d-9cab-bf4347113bd1', -- Kyle Tucker, Rd 1 (ECR)
  '0dd70903-66d3-462e-a3b3-068fff146b48', -- Gunnar Henderson, Rd 2 (ECR)
  'f96b6c6b-25a6-4913-a52a-fbe545be203c', -- Corbin Carroll, Rd 2 (ECR)
  'e3ff5df1-8b79-4cdd-a35d-e6e9c02c5cd4', -- Ketel Marte, Rd 3 (ECR)
  '85d08023-1259-42df-85ef-bf9962d22127', -- James Wood, Rd 3 (ECR)

  -- t.7 Web (Lollygaggers)
  '4d6c7893-6631-4015-813a-840f0d6b5df2', -- Paul Skenes, Rd 1 (ECR)
  'af270a5a-ff0b-4c6d-aa76-20ed9e6b4112', -- Fernando Tatis Jr., Rd 1 (ECR)
  '29864a64-533c-457c-b55a-5ee080b86989', -- Vladimir Guerrero Jr., Rd 2 (ECR)
  '4cfb90b5-0332-4014-8127-7c811d4585f9', -- Jackson Chourio, Rd 2 (ECR)
  '9dc13953-4cd6-43e1-979c-ac6f6c0faeb2', -- Dylan Crews, Rd 15 (ECR, graduating NA)
  '2d74ff04-7d42-4967-a50e-8f304baf3a4f', -- Shohei Ohtani (Pitcher), Rd 23

  -- t.8 Nick (Red Stagz)
  'ad5d2eba-94ee-4db2-b69f-f044069a0560', -- Aaron Judge, Rd 1 (ECR)
  'e3ccdeb4-b961-41cd-a30c-c412569244e8', -- José Ramírez, Rd 1 (ECR)
  '7451578d-d1e2-4042-9021-19b58d9385e6', -- Manny Machado, Rd 3 (ECR)
  '31009130-0d03-4fa0-a478-31117b5213d8', -- Bryce Harper, Rd 3 (ECR)
  'ad416a11-524a-46bf-bfbd-70ea1aed216b', -- Mookie Betts, Rd 4 (ECR)
  'd0385295-0fbf-4c98-8a18-ced4edaeaa6f', -- Freddie Freeman, Rd 5 (ECR)

  -- t.9 Bob (Runs-N-Roses)
  '2cac2937-4c2e-40d1-bf9c-b4d55efcc129', -- Bobby Witt Jr., Rd 1 (ECR)
  '9feb8998-bc90-4e4c-8845-7ec2eaa85d03', -- Julio Rodríguez, Rd 1 (ECR)
  '3d50ed61-5b2a-4ffa-8fa0-c892d384b996', -- Pete Alonso, Rd 2 (ECR)
  '25299444-64a4-44e2-8ace-b10a884c7745', -- Austin Riley, Rd 5 (ECR)
  '9e48ab39-de4f-49c8-ae40-f37945222fce', -- Maikel Garcia, Rd 18
  '7a734abd-b483-49fd-970d-4e0fcbefe758', -- Ben Rice, Rd 23 (FA)

  -- t.10 Mike (The Dirty Farm)
  'd65b210d-0168-4d59-8a2c-44df1360ea8a', -- Shohei Ohtani (Batter), Rd 1 (ECR)
  '968d0a3a-7794-470f-83e5-77709f94cc15', -- Juan Soto, Rd 1 (ECR)
  'e2276abc-6e75-419a-a6de-3783d5ba284e', -- Junior Caminero, Rd 2 (ECR)
  '538b3f1c-ac56-4030-bf4d-b5e1c6117203', -- Garrett Crochet, Rd 2 (ECR)
  'd0d58b15-2b0a-4948-954f-dc21d142b074', -- Jacob deGrom, Rd 4 (ECR)
  '65260d6d-4832-4c89-8983-29556f0a5812', -- Pete Crow-Armstrong, Rd 11

  -- t.11 Thomas (Lake Monsters)
  'a686a28d-36d2-4f57-8fcc-b9f003407e75', -- Nick Pivetta, Rd 17
  '8b9fa556-8c0b-4021-bb07-806e5e8b2516', -- Yandy Díaz, Rd 23

  -- t.12 Tyler (I Fielder Boobs)
  'a8d6a919-c69c-4c3b-bc8e-ece80156e360', -- Trea Turner, Rd 3 (ECR)
  'f5ca8b57-01a8-40c0-9b87-9d2b8b137bed', -- Max Fried, Rd 4 (ECR)
  '83dfc514-b7ed-4e30-b857-29c2f5e161e9', -- Christian Yelich, Rd 10 (ECR)
  '79ade224-c1d2-4d51-8428-3ab306c0e42e', -- Hunter Brown, Rd 10 (ECR, 2nd yr)
  'cf5baf45-89aa-4896-82b4-9621c5c14b87', -- Brice Turang, Rd 13
  '128451fa-812c-48c6-bd43-f801098b646e'  -- Taylor Ward, Rd 16
);

-- ============================================================================
-- STEP 3: Set KEEPING-7TH (7th Keeper Rule selections)
-- ============================================================================
UPDATE my_roster_players SET keeper_status = 'keeping-7th' WHERE id IN (
  '52510d46-7ab7-47de-b20a-18556d2db053', -- Roman Anthony (t.2 Alex), ECR Rd 5
  'dca89003-7c65-4518-bbe5-78b091949cbd', -- Luisangel Acuña (t.3 Pudge), graduating NA
  'a38b0d14-2472-4930-b8e9-035fbeeeba88', -- Nick Kurtz (t.4 Sean), ECR Rd 2
  'fbd80caf-2de4-47b4-a8aa-ec2c689bf8ab', -- Colson Montgomery (t.7 Web), graduating NA
  '87ff8cbc-e2fe-4c94-a63b-03e778d8d889', -- Bubba Chandler (t.8 Nick), graduating NA, ECR Rd 12
  '9e939445-934b-43ef-9850-9deeb11f934d'  -- Jacob Misiorowski (t.10 Mike), ECR Rd 10
);

-- ============================================================================
-- STEP 4: Set KEEPING-NA (NA slot keepers)
-- ============================================================================
UPDATE my_roster_players SET keeper_status = 'keeping-na' WHERE id IN (
  -- t.1 Chris
  '2fbe6ed8-89b7-48f4-88cc-cedb84e23d04', -- Lazaro Montes
  '9616ff76-f7aa-4865-86ee-afc7fab3cdae', -- Josue De Paula
  '314d71db-61e0-4cc7-9204-ac55aea98764', -- Ethan Salas

  -- t.2 Alex
  '7ceae845-d8bb-45ff-9e95-66c2e6d43bee', -- Bryce Eldridge
  '66727ab1-b655-498e-9d98-b24c70a4e149', -- Max Clark
  'e97b8c19-fe65-42b3-8833-dad1335e20fa', -- Colt Emerson
  'c5ecb42c-6f43-49d4-b656-33f899d0ede8', -- Carson Benge

  -- t.3 Pudge
  '6f1a87e8-8a04-4d71-9128-2a1f853c819e', -- Leo De Vries
  '29bdfb06-fa0b-45fa-a5e9-7fca8a9845be', -- Noah Schultz

  -- t.4 Sean
  'c2e3afbf-7a0a-4372-8613-c272a9ec4954', -- Zyhir Hope
  'e377e556-d283-4f55-bf3a-e91b5618aff6', -- Chase DeLauter
  '522b988e-a27e-4d30-906a-9e9771daccd0', -- Sebastian Walcott

  -- t.5 Tom
  '1c8d7e6b-c10e-48a3-b7d0-2c2dbb02b018', -- Samuel Basallo
  'b62124a6-5f87-496f-bb8b-0d9876e0682d', -- JJ Wetherholt
  '9cbbb38c-cdad-4ac5-9012-f35dadce7939', -- Andrew Painter
  'e596dd78-76d3-477a-a403-3ae9ab27539e', -- Owen Caissie

  -- t.6 Greasy
  '74f82762-8743-4d58-ac1e-16a62b24a4e0', -- Druw Jones
  '3d6a635d-2b11-4c10-9d6f-7a6ab0e2ec71', -- Charlie Condon
  '94a5f5ae-f13c-4683-a610-daf1d841e73a', -- Harry Ford

  -- t.7 Web
  '5ac2e178-02ac-4337-91ad-6a63dad0ab40', -- Konnor Griffin
  '8e285dd4-13bb-4275-a08a-2986dec8d4ab', -- Kevin McGonigle
  '8069bcb5-995f-4b46-80f3-f9dfe6fb0d96', -- Walker Jenkins
  '555d48a9-ef1d-493a-b7fa-32e964452910', -- Travis Bazzana

  -- t.8 Nick
  '14e54179-c94f-4912-baa9-6c29ef58e9c0', -- Spencer Jones
  '0eeb2fdf-fc1b-4dd5-bbd8-684fa1ec2c7b', -- George Lombard Jr.

  -- t.9 Bob
  'fb4c5ae4-aec0-4376-9c4a-cac52e394a20', -- Jesús Made
  '186df279-ce6d-400b-ae7f-7a01a0172ed3', -- Luis Peña
  '9a4d2904-1bf3-43fb-aea5-6f1d610c9afd', -- Thomas White

  -- t.10 Mike
  'de219a9e-bafc-4d9d-aa11-e1b7f0746b9c', -- Nolan McLean
  'de3bcc20-8ce5-40d5-88c2-12d67cd2d5aa', -- Jonah Tong
  'b4c683b0-4150-4105-a331-c5fed7c4da54', -- Payton Tolle
  '6acc95e6-eeb2-438c-a9c7-c163bf6f121f'  -- Parker Messick
);

-- ============================================================================
-- STEP 5: Cost corrections (validated against Yahoo API)
-- ============================================================================

-- t.1 Chris
UPDATE my_roster_players SET keeper_cost_round = 9, keeper_cost_label = 'Drafted Rd 9' WHERE id = '0abde41e-a616-4eb1-a61e-35fc79b92d8a'; -- Cal Raleigh: 2 → 9
UPDATE my_roster_players SET keeper_cost_round = 23, keeper_cost_label = 'FA pickup — Rd 23' WHERE id = 'f5afc63b-9b28-4a82-a680-d5b132d998d0'; -- Eury Pérez: 8 → 23

-- t.3 Pudge
UPDATE my_roster_players SET keeper_cost_round = 23, keeper_cost_label = 'Drafted Rd 23 (pick 223)' WHERE id = 'bf326929-1d19-4c2b-86c5-5e26603ab524'; -- Luzardo: 6 → 23

-- t.5 Tom
UPDATE my_roster_players SET keeper_cost_round = 21, keeper_cost_label = 'Drafted Rd 21 (traded from Bob)' WHERE id = 'a2a34319-47be-4ec7-84db-bf55334b99ed'; -- Caglianone: 20 → 21
UPDATE my_roster_players SET keeper_cost_round = 23, keeper_cost_label = 'FA pickup — Rd 23' WHERE id = '5c093ab2-274d-4c9b-8036-c503d9b098e0'; -- Springer: 7 → 23
UPDATE my_roster_players SET keeper_cost_round = 23, keeper_cost_label = 'FA pickup — Rd 23' WHERE id = 'da5ba58c-49da-4fe2-9d34-b2f906aecf1b'; -- Goodman: 8 → 23
UPDATE my_roster_players SET keeper_cost_round = 23, keeper_cost_label = 'FA pickup — Rd 23' WHERE id = '97664bb2-bdab-4f13-b20a-540a8fb889cf'; -- Valdez: 7 → 23

-- t.9 Bob
UPDATE my_roster_players SET keeper_cost_round = 18, keeper_cost_label = 'Drafted Rd 18' WHERE id = '9e48ab39-de4f-49c8-ae40-f37945222fce'; -- Garcia: 7 → 18
UPDATE my_roster_players SET keeper_cost_round = 23, keeper_cost_label = 'FA pickup — Rd 23' WHERE id = '7a734abd-b483-49fd-970d-4e0fcbefe758'; -- Rice: 7 → 23

-- t.10 Mike
UPDATE my_roster_players SET keeper_cost_round = 11, keeper_cost_label = 'Drafted Rd 11' WHERE id = '65260d6d-4832-4c89-8983-29556f0a5812'; -- Crow-Armstrong: 3 → 11
UPDATE my_roster_players SET keeper_cost_round = 23, keeper_cost_label = 'NA keeper — Rd 23' WHERE id = 'de219a9e-bafc-4d9d-aa11-e1b7f0746b9c'; -- McLean: 8 → 23

-- t.11 Thomas
UPDATE my_roster_players SET keeper_cost_round = 17, keeper_cost_label = 'Drafted Rd 17' WHERE id = 'a686a28d-36d2-4f57-8fcc-b9f003407e75'; -- Pivetta: 8 → 17
UPDATE my_roster_players SET keeper_cost_round = 23, keeper_cost_label = 'FA pickup — Rd 23' WHERE id = '8b9fa556-8c0b-4021-bb07-806e5e8b2516'; -- Yandy Díaz: 9 → 23

COMMIT;
