import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { MANAGERS, TEAM_COLORS, getManagerBySlug } from '@/data/managers'
import TeamLogo from '@/components/TeamLogo'

export const revalidate = 300 // Revalidate every 5 minutes

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
    is_na_eligible: boolean | null
    na_eligibility_reason: string | null
    career_ab: number | null
    career_ip: number | null
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

type TeamTrade = {
  id: string
  from_team_name: string
  target_team: string | null
  status: string
  description: string | null
  teams_involved: string[]
  created_at: string
  approved_at: string | null
}

async function getTeamTrades(teamName: string): Promise<TeamTrade[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return []

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase
    .from('trade_offers')
    .select('id, from_team_name, target_team, status, description, teams_involved, created_at, approved_at')
    .or(`from_team_name.eq.${teamName},target_team.eq.${teamName},teams_involved.cs.{${teamName}}`)
    .in('status', ['completed', 'approved'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching team trades:', error)
    return []
  }

  return (data ?? []) as TeamTrade[]
}

async function getTeamRoster(yahooTeamKey: string): Promise<RosterPlayer[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return []

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase
    .from('my_roster_players')
    .select('id, keeper_status, keeper_cost_round, keeper_cost_label, players(id, full_name, primary_position, eligible_positions, mlb_team, headshot_url, fantasypros_ecr, keeper_cost_round, keeper_cost_label, is_na_eligible, na_eligibility_reason, career_ab, career_ip)')
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
  const recentTrades = await getTeamTrades(manager.teamName)

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
    <main className="min-h-[80vh] bg-background">
      {/* Team Themed Header Band */}
      <div className={`bg-gradient-to-r ${manager.theme.gradient} border-b-4 border-border/30 flex items-center py-6`}>
        <div className="mx-auto max-w-3xl px-4 w-full">
          <div className="flex items-center gap-4">
            {/* Team Logo */}
            {manager.logo && (
              <div className="w-24 h-24 rounded-full bg-black/20 p-2 flex-shrink-0">
                <TeamLogo
                  src={manager.logo}
                  alt={`${manager.teamName} logo`}
                  size={96}
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            )}
            
            {/* Team Info */}
            <div className="flex-1">
              <h1 className={`text-3xl font-display font-bold ${manager.theme.textColor}`}>
                {manager.teamName}
              </h1>
              <p className={`text-lg italic ${manager.theme.textColor} opacity-90 mt-1`}>
                {manager.theme.tagline}
              </p>
              <p className={`text-sm ${manager.theme.textColor} opacity-80 mt-2`}>
                Managed by <span className="font-semibold">{manager.displayName}</span>
                {manager.role === 'commissioner' && (
                  <span className="ml-2 text-[10px] px-2 py-1 bg-white/20 text-white border border-white/30 rounded font-semibold uppercase">
                    Commissioner
                  </span>
                )}
                {' '} • Draft Position #{manager.draftPosition}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Back Link */}
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-sm font-semibold mb-6"
        >
          ← ALL TEAMS
        </Link>

        {/* Team Stats Card */}
        <div className="sandlot-card p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted border border-border">
              <div className="text-2xl font-bold text-primary">
                {roster.length}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                Roster Size
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted border border-border">
              <div className="text-2xl font-bold text-accent">
                {keeperCount > 0 ? keeperCount : '—'}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                Keepers Set
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted border border-border">
              <div className={`text-2xl font-bold ${colors?.text}`}>
                2026
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                Season
              </div>
            </div>
          </div>
        </div>

        {/* Roster */}
        {roster.length === 0 ? (
          <div className="mt-6 sandlot-card p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <h2 className="text-lg font-serif font-bold text-primary">
              {manager.yahooTeamKey.includes('.t.11') || manager.yahooTeamKey.includes('.t.12')
                ? 'Expansion Team — No Roster Yet'
                : 'Roster Coming Soon'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {manager.yahooTeamKey.includes('.t.11') || manager.yahooTeamKey.includes('.t.12')
                ? `${manager.displayName} will build their roster in the 2026 expansion draft.`
                : 'Roster data will appear once imported.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {sortedGroups.map(([group, players]) => (
              <div key={group} className="sandlot-card overflow-hidden border-l-4" style={{ borderLeftColor: colors?.hex }}>
                <div className="px-4 py-3 bg-muted border-b border-border">
                  <h2 className="text-sm font-serif font-bold text-primary">
                    {group} ({players.length})
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {players.map((rp) => {
                    if (!rp.players) return null
                    const p = rp.players
                    const keeperCostRound = rp.keeper_cost_round ?? p.keeper_cost_round
                    const keeperCostLabel = rp.keeper_cost_label ?? p.keeper_cost_label
                    return (
                      <div key={rp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                        {/* Headshot */}
                        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 overflow-hidden border border-border">
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
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <span className="truncate">{p.full_name}</span>
                            {p.is_na_eligible && (
                              <span
                                className="shrink-0 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded leading-none"
                                title={[
                                  p.na_eligibility_reason ?? 'NA eligible',
                                  p.career_ab != null && p.career_ab > 0 ? `${p.career_ab} career AB` : null,
                                  p.career_ip != null && p.career_ip > 0 ? `${p.career_ip} career IP` : null,
                                ].filter(Boolean).join(' · ')}
                              >
                                NA
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
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
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30 font-semibold">
                            🔒 KEEPER
                          </span>
                        )}
                        {rp.keeper_status === 'keeping-na' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/30 font-semibold">
                            🔷 NA
                          </span>
                        )}
                        {rp.keeper_status === 'not-keeping' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 border border-red-500/30 font-semibold">
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

        {/* Recent Trades */}
        {recentTrades.length > 0 && (
          <div className="mt-6 sandlot-card overflow-hidden">
            <div className="px-4 py-3 bg-muted border-b border-border">
              <h2 className="text-sm font-serif font-bold text-primary flex items-center gap-2">
                🤝 Recent Trades
              </h2>
            </div>
            <div className="divide-y divide-border">
              {recentTrades.map((trade) => {
                const otherTeams = (trade.teams_involved ?? [trade.from_team_name, trade.target_team].filter(Boolean))
                  .filter((t): t is string => t !== null && t !== manager.teamName)
                const dateStr = new Date(trade.approved_at ?? trade.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                return (
                  <div key={trade.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          {trade.description ?? 'Trade details unavailable'}
                        </p>
                        {otherTeams.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            with <span className="font-semibold">{otherTeams.join(', ')}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5">
                        {dateStr}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-4 py-2 bg-muted border-t border-border">
              <Link
                href="/trades"
                className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                View all trades →
              </Link>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/keepers"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            🔐 Keeper Tracker
          </Link>
          <Link
            href="/draft-board"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            🎯 View Draft Board
          </Link>
          <Link
            href="/teams"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            👥 All Teams
          </Link>
          {manager.teamSlug === 'tunnel-snakes' && (
            <Link
              href="/trades"
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-accent/30 text-sm font-semibold text-accent hover:bg-accent/10 transition-colors"
            >
              🤝 Trade Center
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
