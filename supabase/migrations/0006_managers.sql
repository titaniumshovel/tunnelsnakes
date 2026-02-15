-- 0006_managers.sql — Manager/Owner profiles for The Sandlot league hub
CREATE TABLE IF NOT EXISTS public.managers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  display_name text NOT NULL,
  team_name text NOT NULL,
  team_slug text UNIQUE NOT NULL,
  yahoo_team_key text,
  avatar_url text,
  role text DEFAULT 'owner' CHECK (role IN ('owner', 'commissioner')),
  draft_position integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_public_read" ON public.managers
  FOR SELECT USING (true);
