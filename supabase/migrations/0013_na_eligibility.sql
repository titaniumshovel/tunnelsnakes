-- NA (Not Available) eligibility tracking for rookie detection
-- Uses MLB Stats API career thresholds to identify NA-eligible players

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS mlb_person_id integer,
  ADD COLUMN IF NOT EXISTS mlb_debut_date date,
  ADD COLUMN IF NOT EXISTS career_ab integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS career_ip numeric(6,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_na_eligible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS na_eligibility_reason text,
  ADD COLUMN IF NOT EXISTS na_updated_at timestamptz;

-- Index for quick NA-eligible lookups
CREATE INDEX IF NOT EXISTS idx_players_na_eligible ON public.players(is_na_eligible) WHERE is_na_eligible = true;
