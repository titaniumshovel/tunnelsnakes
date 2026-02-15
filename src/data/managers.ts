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
}

export const MANAGERS: Manager[] = [
  { displayName: 'Pudge', teamName: 'Bleacher Creatures', teamSlug: 'bleacher-creatures', role: 'owner', draftPosition: 1, colorKey: 'Pudge' },
  { displayName: 'Nick', teamName: 'Red Stagz', teamSlug: 'red-stagz', role: 'owner', draftPosition: 2, colorKey: 'Nick' },
  { displayName: 'Web', teamName: 'Lollygaggers', teamSlug: 'lollygaggers', role: 'owner', draftPosition: 3, colorKey: 'Web' },
  { displayName: 'Tom', teamName: "Goin' Yahdgoats", teamSlug: 'goin-yahdgoats', role: 'owner', draftPosition: 4, colorKey: 'Tom' },
  { displayName: 'Tyler', teamName: "Tyler's Slugfest", teamSlug: 'tylers-slugfest', role: 'owner', draftPosition: 5, colorKey: 'Tyler' },
  { displayName: 'Thomas', teamName: 'Lake Monsters', teamSlug: 'lake-monsters', role: 'owner', draftPosition: 6, colorKey: 'Thomas' },
  { displayName: 'Chris', teamName: 'Tunnel Snakes', teamSlug: 'tunnel-snakes', role: 'commissioner', draftPosition: 7, colorKey: 'Chris' },
  { displayName: 'Alex', teamName: 'Alex in Chains', teamSlug: 'alex-in-chains', role: 'owner', draftPosition: 8, colorKey: 'Alex' },
  { displayName: 'Greasy', teamName: 'Greasy Cap Advisors', teamSlug: 'greasy-cap-advisors', role: 'owner', draftPosition: 9, colorKey: 'Greasy' },
  { displayName: 'Bob', teamName: 'Runs-N-Roses', teamSlug: 'runs-n-roses', role: 'owner', draftPosition: 10, colorKey: 'Bob' },
  { displayName: 'Mike', teamName: 'The Dirty Farm', teamSlug: 'the-dirty-farm', role: 'owner', draftPosition: 11, colorKey: 'Mike' },
  { displayName: 'Sean', teamName: 'ClutchHutch', teamSlug: 'clutchhutch', role: 'owner', draftPosition: 12, colorKey: 'Sean' },
]

/** Team colors — shared between draft board, teams page, etc. */
export const TEAM_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; hex: string }> = {
  Pudge:  { bg: 'bg-red-900/40',     border: 'border-red-500/50',    text: 'text-red-300',     dot: 'bg-red-400',     hex: '#f87171' },
  Nick:   { bg: 'bg-blue-900/40',    border: 'border-blue-500/50',   text: 'text-blue-300',    dot: 'bg-blue-400',    hex: '#60a5fa' },
  Web:    { bg: 'bg-green-900/40',   border: 'border-green-500/50',  text: 'text-green-300',   dot: 'bg-green-400',   hex: '#4ade80' },
  Tom:    { bg: 'bg-yellow-900/40',  border: 'border-yellow-500/50', text: 'text-yellow-300',  dot: 'bg-yellow-400',  hex: '#facc15' },
  Tyler:  { bg: 'bg-purple-900/40',  border: 'border-purple-500/50', text: 'text-purple-300',  dot: 'bg-purple-400',  hex: '#c084fc' },
  Thomas: { bg: 'bg-pink-900/40',    border: 'border-pink-500/50',   text: 'text-pink-300',    dot: 'bg-pink-400',    hex: '#f472b6' },
  Chris:  { bg: 'bg-amber-900/40',   border: 'border-amber-500/50',  text: 'text-amber-300',   dot: 'bg-amber-400',   hex: '#fbbf24' },
  Alex:   { bg: 'bg-orange-900/40',  border: 'border-orange-500/50', text: 'text-orange-300',  dot: 'bg-orange-400',  hex: '#fb923c' },
  Greasy: { bg: 'bg-cyan-900/40',    border: 'border-cyan-500/50',   text: 'text-cyan-300',    dot: 'bg-cyan-400',    hex: '#22d3ee' },
  Bob:    { bg: 'bg-slate-700/40',   border: 'border-slate-400/50',  text: 'text-slate-300',   dot: 'bg-slate-400',   hex: '#94a3b8' },
  Mike:   { bg: 'bg-indigo-900/40',  border: 'border-indigo-500/50', text: 'text-indigo-300',  dot: 'bg-indigo-400',  hex: '#818cf8' },
  Sean:   { bg: 'bg-emerald-900/40', border: 'border-emerald-500/50',text: 'text-emerald-300', dot: 'bg-emerald-400', hex: '#34d399' },
}

export function getManagerBySlug(slug: string): Manager | undefined {
  return MANAGERS.find(m => m.teamSlug === slug)
}

export function getTeamColors(colorKey: string) {
  return TEAM_COLORS[colorKey] ?? { bg: 'bg-muted', border: 'border-border', text: 'text-foreground', dot: 'bg-muted-foreground', hex: '#888' }
}
