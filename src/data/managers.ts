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
  logo?: string    // path to team logo
  theme: {
    gradient: string    // Tailwind gradient classes
    tagline: string     // Team motto
    textColor: string   // Text color for header overlay
  }
}

export const MANAGERS: Manager[] = [
  { displayName: 'Pudge', teamName: 'Bleacher Creatures', teamSlug: 'bleacher-creatures', role: 'owner', draftPosition: 1, colorKey: 'Pudge', email: 'michaeljcasey3@gmail.com', yahooTeamKey: '469.l.24701.t.3', logo: '/logos/bleacher-creatures.png', theme: { gradient: 'from-red-700 to-orange-700', tagline: 'Roll Call!', textColor: 'text-orange-100' } },
  { displayName: 'Nick', teamName: 'Red Stagz', teamSlug: 'red-stagz', role: 'owner', draftPosition: 2, colorKey: 'Nick', email: 'gagliardi.nf@gmail.com', yahooTeamKey: '469.l.24701.t.8', logo: '/logos/red-stagz.png', theme: { gradient: 'from-red-800 to-red-950', tagline: 'Rack \'Em Up', textColor: 'text-red-100' } },
  { displayName: 'Web', teamName: 'Lollygaggers', teamSlug: 'lollygaggers', role: 'owner', draftPosition: 3, colorKey: 'Web', email: 'web21spider@hotmail.com', yahooTeamKey: '469.l.24701.t.7', logo: '/logos/lollygaggers.png', theme: { gradient: 'from-green-800 to-emerald-900', tagline: 'No Lollygaggin\'... OK Maybe a Little', textColor: 'text-green-100' } },
  { displayName: 'Tom', teamName: "Goin' Yahdgoats", teamSlug: 'goin-yahdgoats', role: 'owner', draftPosition: 4, colorKey: 'Tom', email: 'trward1990@gmail.com', yahooTeamKey: '469.l.24701.t.5', logo: '/logos/goin-yahdgoats.png', theme: { gradient: 'from-blue-900 to-red-800', tagline: 'Greatest of All Time, Kid', textColor: 'text-blue-100' } },
  { displayName: 'Tyler', teamName: "Tyler's Slugfest", teamSlug: 'tylers-slugfest', role: 'owner', draftPosition: 5, colorKey: 'Tyler', email: 'tyler.parkhurst@gmail.com', yahooTeamKey: '469.l.24701.t.12', logo: '/logos/tylers-slugfest.png', theme: { gradient: 'from-purple-800 to-blue-900', tagline: 'Swing for the Fences', textColor: 'text-purple-100' } },
  { displayName: 'Thomas', teamName: 'Lake Monsters', teamSlug: 'lake-monsters', role: 'owner', draftPosition: 6, colorKey: 'Thomas', email: 'tsoleary12@gmail.com', yahooTeamKey: '469.l.24701.t.11', logo: '/logos/lake-monsters.png', theme: { gradient: 'from-teal-800 to-green-900', tagline: 'From the Deep', textColor: 'text-teal-100' } },
  { displayName: 'Chris', teamName: 'Tunnel Snakes', teamSlug: 'tunnel-snakes', role: 'commissioner', draftPosition: 7, colorKey: 'Chris', email: 'cjm91792@gmail.com', yahooTeamKey: '469.l.24701.t.1', logo: '/logos/tunnel-snakes.png', theme: { gradient: 'from-amber-700 to-green-900', tagline: 'Tunnel Snakes Rule!', textColor: 'text-amber-100' } },
  { displayName: 'Alex', teamName: 'Alex in Chains', teamSlug: 'alex-in-chains', role: 'owner', draftPosition: 8, colorKey: 'Alex', email: 'alex.mclaughlin24@gmail.com', yahooTeamKey: '469.l.24701.t.2', logo: '/logos/alex-in-chains.png', theme: { gradient: 'from-teal-900 to-gray-900', tagline: 'Man in the Box Score', textColor: 'text-teal-200' } },
  { displayName: 'Greasy', teamName: 'Greasy Cap Advisors', teamSlug: 'greasy-cap-advisors', role: 'owner', draftPosition: 9, colorKey: 'Greasy', email: 'cgmilanesi@gmail.com', yahooTeamKey: '469.l.24701.t.6', logo: '/logos/greasy-cap-advisors.png', theme: { gradient: 'from-blue-900 to-gray-800', tagline: 'Buy Low, Sell High', textColor: 'text-cyan-100' } },
  { displayName: 'Bob', teamName: 'Runs-N-Roses', teamSlug: 'runs-n-roses', role: 'owner', draftPosition: 10, colorKey: 'Bob', email: 'brose@armadafinancial.com', yahooTeamKey: '469.l.24701.t.9', logo: '/logos/runs-n-roses.png', theme: { gradient: 'from-gray-900 to-red-900', tagline: 'Welcome to the Jungle', textColor: 'text-red-200' } },
  { displayName: 'Mike', teamName: 'The Dirty Farm', teamSlug: 'the-dirty-farm', role: 'owner', draftPosition: 11, colorKey: 'Mike', email: 'mmacdonald1976@hotmail.com', yahooTeamKey: '469.l.24701.t.10', logo: '/logos/the-dirty-farm.png', theme: { gradient: 'from-amber-900 to-green-900', tagline: 'Grown from the Dirt', textColor: 'text-amber-100' } },
  { displayName: 'Sean', teamName: 'ClutchHutch', teamSlug: 'clutchhutch', role: 'owner', draftPosition: 12, colorKey: 'Sean', email: 'sean.hutchinson88@gmail.com', yahooTeamKey: '469.l.24701.t.4', logo: '/logos/clutchhutch.png', theme: { gradient: 'from-emerald-700 to-teal-900', tagline: 'When It Matters Most', textColor: 'text-emerald-100' } },
]

/** Team colors — shared between draft board, teams page, etc. */
export const TEAM_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; hex: string }> = {
  Pudge:  { bg: 'bg-red-50 dark:bg-red-900/30',         border: 'border-red-300 dark:border-red-500/40',       text: 'text-red-700 dark:text-red-300',       dot: 'bg-red-500',      hex: '#ef4444' },
  Nick:   { bg: 'bg-blue-50 dark:bg-blue-900/30',       border: 'border-blue-300 dark:border-blue-500/40',     text: 'text-blue-700 dark:text-blue-300',     dot: 'bg-blue-500',     hex: '#3b82f6' },
  Web:    { bg: 'bg-green-50 dark:bg-green-900/30',     border: 'border-green-300 dark:border-green-500/40',   text: 'text-green-700 dark:text-green-300',   dot: 'bg-green-500',    hex: '#22c55e' },
  Tom:    { bg: 'bg-yellow-50 dark:bg-yellow-900/30',   border: 'border-yellow-400 dark:border-yellow-500/40', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500',   hex: '#eab308' },
  Tyler:  { bg: 'bg-purple-50 dark:bg-purple-900/30',   border: 'border-purple-300 dark:border-purple-500/40', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500',   hex: '#a855f7' },
  Thomas: { bg: 'bg-pink-50 dark:bg-pink-900/30',       border: 'border-pink-300 dark:border-pink-500/40',     text: 'text-pink-700 dark:text-pink-300',     dot: 'bg-pink-500',     hex: '#ec4899' },
  Chris:  { bg: 'bg-amber-50 dark:bg-amber-900/30',     border: 'border-amber-400 dark:border-amber-500/40',   text: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-500',    hex: '#f59e0b' },
  Alex:   { bg: 'bg-orange-50 dark:bg-orange-900/30',   border: 'border-orange-300 dark:border-orange-500/40', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500',   hex: '#f97316' },
  Greasy: { bg: 'bg-cyan-50 dark:bg-cyan-900/30',       border: 'border-cyan-300 dark:border-cyan-500/40',     text: 'text-cyan-700 dark:text-cyan-300',     dot: 'bg-cyan-500',     hex: '#06b6d4' },
  Bob:    { bg: 'bg-slate-100 dark:bg-slate-900/30',    border: 'border-slate-300 dark:border-slate-500/40',   text: 'text-slate-700 dark:text-slate-300',   dot: 'bg-slate-500',    hex: '#64748b' },
  Mike:   { bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/30', border: 'border-fuchsia-300 dark:border-fuchsia-500/40', text: 'text-fuchsia-700 dark:text-fuchsia-300', dot: 'bg-fuchsia-500', hex: '#d946ef' },
  Sean:   { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-300 dark:border-emerald-500/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', hex: '#10b981' },
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
