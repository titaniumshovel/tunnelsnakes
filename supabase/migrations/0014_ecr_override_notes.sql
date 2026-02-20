-- ECR override notes for players with special circumstances
-- Allows explanations for ECR values that differ from FantasyPros

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS ecr_override_note text;

-- Set Ohtani (Pitcher) note
UPDATE public.players 
SET ecr_override_note = '⚠️ Yahoo pre-rank used. FantasyPros ranks Ohtani as one combined player (ECR #1). Since Yahoo splits him into Pitcher/Batter, the pitcher half uses Yahoo''s pre-season rank of #120.'
WHERE yahoo_player_id = 1000002;