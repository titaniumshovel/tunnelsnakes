-- Draft picks table for live draft board
CREATE TABLE IF NOT EXISTS public.draft_picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 23),
  pick_number INTEGER NOT NULL CHECK (pick_number BETWEEN 1 AND 12),
  slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 0 AND 11),
  owner TEXT NOT NULL,
  original_owner TEXT,
  player_name TEXT NOT NULL,
  player_position TEXT,
  player_team TEXT,
  ecr_rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round, slot_index)
);

ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read draft_picks" ON public.draft_picks FOR SELECT TO anon USING (true);
CREATE POLICY "public read draft_picks auth" ON public.draft_picks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth full access draft_picks" ON public.draft_picks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.draft_picks;
