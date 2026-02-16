import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { MANAGERS, TEAM_COLORS, getManagerBySlug } from '@/data/managers'

type Props = {
  params: Promise<{ slug: string }>
}

type RosterPlayer = {
  id: string
  keeper_status: string
  keeper_cost_round: number | null
  keeper_cost_label: string | null
  players: {
    id: string
    full_name: string
    primary_position: string | null
    eligible_positions: string[] | null
    mlb_team: string | null
    headshot_url: string | null
    fantasypros_ecr: number | null
    keeper_cost_round: number | null
    keeper_cost_label: string | null
  } | null
}

// Position grouping order
const POSITION_GROUPS: Record<string, string[]> = {
  'Catchers': ['C'],
  'Infielders': ['1B', '2B', '3B', 'SS'],
  'Outfielders': ['OF'],
  'Utility': ['Util', 'DH'],
  'Starting Pitchers': ['SP'],
  'Relief Pitchers': ['RP'],
}

function getPositionGroup(position: string | null): string {
  if (!position) return 'Other'
  const primary = position.split(',')[0].trim()
  for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
    if (positions.includes(primary)) return group
  }
  return 'Other'
}

function getPositionGroupOrder(group: string): number {
  const order = ['Catchers', 'Infielders', 'Outfielders', 'Utility', 'Starting Pitchers', 'Relief Pitchers', 'Other']
  return order.indexOf(group)
}

async function getTeamRoster(yahooTeamKey: string): Promise<RosterPlayer[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return []

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase
    .from('my_roster_players')
    .select('id, keeper_status, keeper_cost_round, keeper_cost_label, players(id, full_name, primary_position, eligible_positions, mlb_team, headshot_url, fantasypros_ecr, keeper_cost_round, keeper_cost_label)')
    .eq('yahoo_team_key', yahooTeamKey)
    .order('keeper_cost_round', { ascending: true })

  if (error) {
    console.error('Error fetching roster:', error)
    return []
  }

  return (data ?? []) as unknown as RosterPlayer[]
}

export async function generateStaticParams() {
  return MANAGERS.map((m) => ({ slug: m.teamSlug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const manager = getManagerBySlug(slug)
  if (!manager) return { title: 'Team Not Found — The Sandlot' }
  return {
    title: `${manager.teamName} — The Sandlot`,
    description: `${manager.teamName} managed by ${manager.displayName}. The Sandlot fantasy baseball league.`,
  }
}

export default async function TeamProfilePage({ params }: Props) {
  const { slug } = await params
  const manager = getManagerBySlug(slug)

  if (!manager) {
    notFound()
  }

  const colors = TEAM_COLORS[manager.colorKey]
  const roster = await getTeamRoster(manager.yahooTeamKey)

  // Group players by position
  const grouped: Record<string, RosterPlayer[]> = {}
  for (const rp of roster) {
    if (!rp.players) continue
    const group = getPositionGroup(rp.players.primary_position)
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(rp)
  }

  // Sort groups by display order
  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => getPositionGroupOrder(a) - getPositionGroupOrder(b)
  )

  const keeperCount = roster.filter(r => r.keeper_status === 'keeping' || r.keeper_status === 'keeping-na').length

  return (
    <main className="min-h-[80vh]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Back Link */}
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-sm font-mono mb-6"
        >
          ← ALL TEAMS
        </Link>

        {/* Team Header Card */}
        <div className={`dashboard-card p-8 border ${colors?.border} ${colors?.bg}`}>
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full ${colors?.dot} flex items-center justify-center text-xl`}>
              ⚾
            </div>
            <div>
              <h1 className={`text-3xl font-bold font-mono tracking-wider ${colors?.text} vault-glow`}>
                {manager.teamName}
              </h1>
              <p className="text-sm font-mono text-muted-foreground mt-1">
                Managed by <span className="text-foreground font-bold">{manager.displayName}</span>
                {manager.role === 'commissioner' && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent border border-accent/30 rounded font-bold uppercase">
                    Commissioner
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-background/50 border border-primary/10">
              <div className={`text-2xl font-bold font-mono ${colors?.text}`}>
                #{manager.draftPosition}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                Draft Position
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50 border border-primary/10">
              <div className="text-2xl font-bold font-mono text-primary">
                {roster.length}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                Roster Size
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50 border border-primary/10">
              <div className="text-2xl font-bold font-mono text-accent">
                {keeperCount > 0 ? keeperCount : '—'}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                Keepers Set
              </div>
            </div>
          </div>
        </div>

        {/* Roster */}
        {roster.length === 0 ? (
          <div className="mt-6 dashboard-card p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-lg font-bold font-mono text-primary tracking-wider">
              {manager.yahooTeamKey.includes('.t.11') || manager.yahooTeamKey.includes('.t.12')
                ? 'EXPANSION TEAM — NO ROSTER YET'
                : 'ROSTER COMING SOON'}
            </h2>
            <p className="mt-2 text-sm font-mono text-muted-foreground">
              {manager.yahooTeamKey.includes('.t.11') || manager.yahooTeamKey.includes('.t.12')
                ? `${manager.displayName} will build their roster in the 2026 expansion draft.`
                : 'Roster data will appear once imported.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {sortedGroups.map(([group, players]) => (
              <div key={group} className="dashboard-card overflow-hidden">
                <div className={`px-4 py-2 border-b border-primary/10 ${colors?.bg}`}>
                  <h2 className={`text-xs font-bold font-mono uppercase tracking-widest ${colors?.text}`}>
                    {group} ({players.length})
                  </h2>
                </div>
                <div className="divide-y divide-primary/5">
                  {players.map((rp) => {
                    if (!rp.players) return null
                    const p = rp.players
                    const keeperCostRound = rp.keeper_cost_round ?? p.keeper_cost_round
                    const keeperCostLabel = rp.keeper_cost_label ?? p.keeper_cost_label
                    return (
                      <div key={rp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors">
                        {/* Headshot */}
                        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 overflow-hidden border border-primary/10">
                          {p.headshot_url ? (
                            <Image
                              src={p.headshot_url}
                              alt={p.full_name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                              ⚾
                            </div>
                          )}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-mono font-bold text-foreground truncate">
                            {p.full_name}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>{p.primary_position ?? '—'}</span>
                            <span>·</span>
                            <span>{p.mlb_team ?? 'FA'}</span>
                            {keeperCostRound && (
                              <>
                                <span>·</span>
                                <span className="text-accent">Rd {keeperCostRound}</span>
                              </>
                            )}
                            {!keeperCostRound && keeperCostLabel && (
                              <>
                                <span>·</span>
                                <span className="text-accent">{keeperCostLabel}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Keeper Status Badge */}
                        {rp.keeper_status === 'keeping' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 font-mono font-bold">
                            🔒 KEEPER
                          </span>
                        )}
                        {rp.keeper_status === 'keeping-na' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-mono font-bold">
                            🔷 NA
                          </span>
                        )}
                        {rp.keeper_status === 'not-keeping' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-mono font-bold">
                            ❌ CUT
                          </span>
                        )}

                        {/* ECR */}
                        {p.fantasypros_ecr && (
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            ECR #{p.fantasypros_ecr}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/keepers"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-primary/20 text-sm font-mono text-primary hover:bg-primary/10 transition-colors"
          >
            🔐 Keeper Tracker
          </Link>
          <Link
            href="/draft-board"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-primary/20 text-sm font-mono text-primary hover:bg-primary/10 transition-colors"
          >
            🎯 View Draft Board
          </Link>
          <Link
            href="/teams"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-primary/20 text-sm font-mono text-primary hover:bg-primary/10 transition-colors"
          >
            👥 All Teams
          </Link>
          {manager.teamSlug === 'tunnel-snakes' && (
            <Link
              href="/offer"
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-accent/30 text-sm font-mono text-accent hover:bg-accent/10 transition-colors"
            >
              🤝 Trade Portal
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
