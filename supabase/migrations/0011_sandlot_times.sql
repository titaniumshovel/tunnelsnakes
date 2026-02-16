-- ============================================
-- 0011: The Sandlot Times — Daily Edition Storage
-- MLB news aggregator + AI-generated digest
-- ============================================

CREATE TABLE IF NOT EXISTS editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,                                  -- YYYY-MM-DD
  headline text NOT NULL,                              -- Edition title
  hero_image_url text,                                 -- URL to generated banner
  hero_image_prompt text,                              -- Prompt used for hero image
  mlb_headlines jsonb DEFAULT '[]'::jsonb,             -- [{title, summary, source_url, tags[]}]
  fantasy_impact jsonb DEFAULT '[]'::jsonb,            -- [{title, analysis, affected_players[]}]
  league_watch jsonb DEFAULT '[]'::jsonb,              -- [{title, analysis, affected_managers[], affected_team_keys[]}]
  hot_take text,                                       -- Smalls' editorial
  power_rankings jsonb DEFAULT '[]'::jsonb,            -- [{rank, manager, team, reasoning}]
  raw_items_count int DEFAULT 0,
  status text DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(date)
);

-- Enable Row Level Security
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view published editions)
CREATE POLICY "Anyone can view published editions"
  ON editions
  FOR SELECT
  USING (status = 'published');

-- Service role can do everything (for the pipeline script)
CREATE POLICY "Service role full access"
  ON editions
  FOR ALL
  USING (true)
  WITH CHECK (true);
