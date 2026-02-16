/**
 * The Sandlot — All 12 league managers
 * Source of truth until the DB migration is run via Supabase Dashboard.
 * See: supabase/migrations/0006_managers.sql
 */

export type Manager = {
  displayName: string
  teamName: string
  teamSlug: string
  role: 'owner' | 'commissioner'
  draftPosition: number
  colorKey: string // maps to TEAM_COLORS
  email?: string   // for auth lookup — populate as managers sign up
  yahooTeamKey: string // 2026 league key: 469.l.24701.t.N
}

export const MANAGERS: Manager[] = [
  { displayName: 'Pudge', teamName: 'Bleacher Creatures', teamSlug: 'bleacher-creatures', role: 'owner', draftPosition: 1, colorKey: 'Pudge', email: 'michaeljcasey3@gmail.com', yahooTeamKey: '469.l.24701.t.3' },
  { displayName: 'Nick', teamName: 'Red Stagz', teamSlug: 'red-stagz', role: 'owner', draftPosition: 2, colorKey: 'Nick', email: 'gagliardi.nf@gmail.com', yahooTeamKey: '469.l.24701.t.8' },
  { displayName: 'Web', teamName: 'Lollygaggers', teamSlug: 'lollygaggers', role: 'owner', draftPosition: 3, colorKey: 'Web', email: 'web21spider@hotmail.com', yahooTeamKey: '469.l.24701.t.7' },
  { displayName: 'Tom', teamName: "Goin' Yahdgoats", teamSlug: 'goin-yahdgoats', role: 'owner', draftPosition: 4, colorKey: 'Tom', email: 'trward1990@gmail.com', yahooTeamKey: '469.l.24701.t.5' },
  { displayName: 'Tyler', teamName: "Tyler's Slugfest", teamSlug: 'tylers-slugfest', role: 'owner', draftPosition: 5, colorKey: 'Tyler', email: 'tyler.parkhurst@gmail.com', yahooTeamKey: '469.l.24701.t.12' },
  { displayName: 'Thomas', teamName: 'Lake Monsters', teamSlug: 'lake-monsters', role: 'owner', draftPosition: 6, colorKey: 'Thomas', email: 'tsoleary12@gmail.com', yahooTeamKey: '469.l.24701.t.11' },
  { displayName: 'Chris', teamName: 'Tunnel Snakes', teamSlug: 'tunnel-snakes', role: 'commissioner', draftPosition: 7, colorKey: 'Chris', email: 'cjm91792@gmail.com', yahooTeamKey: '469.l.24701.t.1' },
  { displayName: 'Alex', teamName: 'Alex in Chains', teamSlug: 'alex-in-chains', role: 'owner', draftPosition: 8, colorKey: 'Alex', email: 'alex.mclaughlin24@gmail.com', yahooTeamKey: '469.l.24701.t.2' },
  { displayName: 'Greasy', teamName: 'Greasy Cap Advisors', teamSlug: 'greasy-cap-advisors', role: 'owner', draftPosition: 9, colorKey: 'Greasy', email: 'cgmilanesi@gmail.com', yahooTeamKey: '469.l.24701.t.6' },
  { displayName: 'Bob', teamName: 'Runs-N-Roses', teamSlug: 'runs-n-roses', role: 'owner', draftPosition: 10, colorKey: 'Bob', email: 'brose@armadafinancial.com', yahooTeamKey: '469.l.24701.t.9' },
  { displayName: 'Mike', teamName: 'The Dirty Farm', teamSlug: 'the-dirty-farm', role: 'owner', draftPosition: 11, colorKey: 'Mike', email: 'mmacdonald1976@hotmail.com', yahooTeamKey: '469.l.24701.t.10' },
  { displayName: 'Sean', teamName: 'ClutchHutch', teamSlug: 'clutchhutch', role: 'owner', draftPosition: 12, colorKey: 'Sean', email: 'sean.hutchinson88@gmail.com', yahooTeamKey: '469.l.24701.t.4' },
]

/** Team colors — shared between draft board, teams page, etc. */
export const TEAM_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; hex: string }> = {
  Pudge:  { bg: 'bg-red-50',      border: 'border-red-300',     text: 'text-red-700',      dot: 'bg-red-500',      hex: '#ef4444' },
  Nick:   { bg: 'bg-blue-50',     border: 'border-blue-300',    text: 'text-blue-700',     dot: 'bg-blue-500',     hex: '#3b82f6' },
  Web:    { bg: 'bg-green-50',    border: 'border-green-300',   text: 'text-green-700',    dot: 'bg-green-500',    hex: '#22c55e' },
  Tom:    { bg: 'bg-yellow-50',   border: 'border-yellow-400',  text: 'text-yellow-700',   dot: 'bg-yellow-500',   hex: '#eab308' },
  Tyler:  { bg: 'bg-purple-50',   border: 'border-purple-300',  text: 'text-purple-700',   dot: 'bg-purple-500',   hex: '#a855f7' },
  Thomas: { bg: 'bg-pink-50',     border: 'border-pink-300',    text: 'text-pink-700',     dot: 'bg-pink-500',     hex: '#ec4899' },
  Chris:  { bg: 'bg-amber-50',    border: 'border-amber-400',   text: 'text-amber-700',    dot: 'bg-amber-500',    hex: '#f59e0b' },
  Alex:   { bg: 'bg-orange-50',   border: 'border-orange-300',  text: 'text-orange-700',   dot: 'bg-orange-500',   hex: '#f97316' },
  Greasy: { bg: 'bg-cyan-50',     border: 'border-cyan-300',    text: 'text-cyan-700',     dot: 'bg-cyan-500',     hex: '#06b6d4' },
  Bob:    { bg: 'bg-slate-100',   border: 'border-slate-300',   text: 'text-slate-700',    dot: 'bg-slate-500',    hex: '#64748b' },
  Mike:   { bg: 'bg-fuchsia-50',  border: 'border-fuchsia-300', text: 'text-fuchsia-700',  dot: 'bg-fuchsia-500',  hex: '#d946ef' },
  Sean:   { bg: 'bg-emerald-50',  border: 'border-emerald-300', text: 'text-emerald-700',  dot: 'bg-emerald-500',  hex: '#10b981' },
}

export function getManagerBySlug(slug: string): Manager | undefined {
  return MANAGERS.find(m => m.teamSlug === slug)
}

export function getManagerByEmail(email: string): Manager | undefined {
  const lower = email.toLowerCase()
  return MANAGERS.find(m => m.email?.toLowerCase() === lower)
}

export function getManagerByYahooTeamKey(key: string): Manager | undefined {
  return MANAGERS.find(m => m.yahooTeamKey === key)
}

export function getTeamColors(colorKey: string) {
  return TEAM_COLORS[colorKey] ?? { bg: 'bg-muted', border: 'border-border', text: 'text-foreground', dot: 'bg-muted-foreground', hex: '#888' }
}
