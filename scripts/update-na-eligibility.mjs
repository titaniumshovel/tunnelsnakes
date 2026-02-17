#!/usr/bin/env node
/**
 * NA Eligibility Auto-Detection via MLB Stats API
 * 
 * Checks each player in the Supabase `players` table against MLB career stats
 * to determine if they qualify as NA (rookie/minor league) eligible.
 * 
 * Rookie thresholds (MLB rule):
 *   - Hitter: < 130 career AB
 *   - Pitcher: < 50 career IP
 *   - Two-way: must be under BOTH thresholds
 *   - No MLB debut: automatically NA eligible
 * 
 * Usage: node scripts/update-na-eligibility.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Load .env.local ───────────────────────────────────────────────
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) env[match[1]] = match[2]
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// ─── MLB team abbreviation mapping ─────────────────────────────────
// Maps Yahoo/common abbreviations to MLB Stats API full team names
const TEAM_ALIASES = {
  'ARI': ['Arizona Diamondbacks', 'D-backs'],
  'ATL': ['Atlanta Braves', 'Braves'],
  'BAL': ['Baltimore Orioles', 'Orioles'],
  'BOS': ['Boston Red Sox', 'Red Sox'],
  'CHC': ['Chicago Cubs', 'Cubs'],
  'CWS': ['Chicago White Sox', 'White Sox'],
  'CIN': ['Cincinnati Reds', 'Reds'],
  'CLE': ['Cleveland Guardians', 'Guardians'],
  'COL': ['Colorado Rockies', 'Rockies'],
  'DET': ['Detroit Tigers', 'Tigers'],
  'HOU': ['Houston Astros', 'Astros'],
  'KC':  ['Kansas City Royals', 'Royals'],
  'LAA': ['Los Angeles Angels', 'Angels', 'LA Angels'],
  'LAD': ['Los Angeles Dodgers', 'Dodgers', 'LA Dodgers'],
  'MIA': ['Miami Marlins', 'Marlins'],
  'MIL': ['Milwaukee Brewers', 'Brewers'],
  'MIN': ['Minnesota Twins', 'Twins'],
  'NYM': ['New York Mets', 'Mets'],
  'NYY': ['New York Yankees', 'Yankees'],
  'OAK': ['Oakland Athletics', 'Athletics', 'A\'s'],
  'PHI': ['Philadelphia Phillies', 'Phillies'],
  'PIT': ['Pittsburgh Pirates', 'Pirates'],
  'SD':  ['San Diego Padres', 'Padres'],
  'SF':  ['San Francisco Giants', 'Giants'],
  'SEA': ['Seattle Mariners', 'Mariners'],
  'STL': ['St. Louis Cardinals', 'Cardinals'],
  'TB':  ['Tampa Bay Rays', 'Rays'],
  'TEX': ['Texas Rangers', 'Rangers'],
  'TOR': ['Toronto Blue Jays', 'Blue Jays'],
  'WSH': ['Washington Nationals', 'Nationals'],
}

// ─── Helpers ───────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...options.headers,
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase ${options.method || 'GET'} ${endpoint} failed (${res.status}): ${text}`)
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function mlbApiRequest(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TheSandlot-Fantasy-Baseball/1.0' }
  })
  if (!res.ok) {
    throw new Error(`MLB API ${url} failed (${res.status})`)
  }
  return res.json()
}

/**
 * Normalize a name for fuzzy matching:
 *  - lowercase
 *  - remove Jr., Sr., III, II, IV suffixes
 *  - remove accents
 *  - remove periods and extra whitespace
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\b(jr|sr|iii|ii|iv)\b\.?/gi, '')
    .replace(/[.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check if a team name from MLB API matches our team abbreviation
 */
function teamMatches(mlbTeamName, ourTeamAbbrev) {
  if (!mlbTeamName || !ourTeamAbbrev) return false
  const aliases = TEAM_ALIASES[ourTeamAbbrev.toUpperCase()]
  if (!aliases) return false
  const mlbLower = mlbTeamName.toLowerCase()
  return aliases.some(a => mlbLower.includes(a.toLowerCase()))
}

/**
 * Search MLB Stats API for a player by name
 * Returns the best match { id, fullName, currentTeam, mlbDebutDate } or null
 */
async function searchMlbPlayer(playerName, teamAbbrev) {
  try {
    const encodedName = encodeURIComponent(playerName)
    const data = await mlbApiRequest(
      `https://statsapi.mlb.com/api/v1/people/search?names=${encodedName}&hydrate=currentTeam`
    )

    if (!data.people || data.people.length === 0) return null

    const normalizedSearch = normalizeName(playerName)

    // First pass: exact name match + team match
    for (const person of data.people) {
      const normalizedResult = normalizeName(person.fullName || '')
      if (normalizedResult === normalizedSearch && teamMatches(person.currentTeam?.name, teamAbbrev)) {
        return {
          id: person.id,
          fullName: person.fullName,
          currentTeam: person.currentTeam?.name,
          mlbDebutDate: person.mlbDebutDate || null,
        }
      }
    }

    // Second pass: exact name match (any team — player may have been traded)
    for (const person of data.people) {
      const normalizedResult = normalizeName(person.fullName || '')
      if (normalizedResult === normalizedSearch) {
        return {
          id: person.id,
          fullName: person.fullName,
          currentTeam: person.currentTeam?.name,
          mlbDebutDate: person.mlbDebutDate || null,
        }
      }
    }

    // Third pass: name contains match + team match (handles middle names, suffixes)
    for (const person of data.people) {
      const normalizedResult = normalizeName(person.fullName || '')
      if (
        (normalizedResult.includes(normalizedSearch) || normalizedSearch.includes(normalizedResult)) &&
        teamMatches(person.currentTeam?.name, teamAbbrev)
      ) {
        return {
          id: person.id,
          fullName: person.fullName,
          currentTeam: person.currentTeam?.name,
          mlbDebutDate: person.mlbDebutDate || null,
        }
      }
    }

    // Fourth pass: just take the first active player result
    // Sort by active status — prefer active players
    const active = data.people.filter(p => p.active)
    if (active.length === 1) {
      const person = active[0]
      return {
        id: person.id,
        fullName: person.fullName,
        currentTeam: person.currentTeam?.name,
        mlbDebutDate: person.mlbDebutDate || null,
      }
    }

    // If only one result total, use it
    if (data.people.length === 1) {
      const person = data.people[0]
      return {
        id: person.id,
        fullName: person.fullName,
        currentTeam: person.currentTeam?.name,
        mlbDebutDate: person.mlbDebutDate || null,
      }
    }

    // Multiple ambiguous results — can't determine
    return null
  } catch (err) {
    console.error(`  ⚠️ MLB search error for "${playerName}": ${err.message}`)
    return null
  }
}

/**
 * Fetch career hitting and pitching stats for an MLB player
 * Returns { careerAB, careerIP }
 */
async function getCareerStats(mlbId) {
  try {
    const data = await mlbApiRequest(
      `https://statsapi.mlb.com/api/v1/people/${mlbId}?hydrate=stats(group=[hitting,pitching],type=career)`
    )

    let careerAB = 0
    let careerIP = 0

    const person = data.people?.[0]
    if (!person?.stats) return { careerAB, careerIP }

    for (const statGroup of person.stats) {
      const splits = statGroup.splits?.[0]?.stat
      if (!splits) continue

      if (statGroup.group?.displayName === 'hitting') {
        careerAB = splits.atBats || 0
      }
      if (statGroup.group?.displayName === 'pitching') {
        // IP comes as string like "49.1" — parse as float
        const ip = parseFloat(splits.inningsPitched || '0')
        careerIP = isNaN(ip) ? 0 : ip
      }
    }

    return { careerAB, careerIP }
  } catch (err) {
    console.error(`  ⚠️ Career stats error for MLB ID ${mlbId}: ${err.message}`)
    return { careerAB: 0, careerIP: 0 }
  }
}

/**
 * Determine NA eligibility based on career stats
 * Returns { isEligible, reason }
 */
function checkNaEligibility(mlbDebutDate, careerAB, careerIP, primaryPosition) {
  // No MLB debut — automatically NA eligible
  if (!mlbDebutDate) {
    return { isEligible: true, reason: 'no_mlb_debut' }
  }

  const isPitcher = ['SP', 'RP', 'P'].includes(primaryPosition)
  const isHitter = !isPitcher

  // Check if player has stats in both hitting and pitching (two-way)
  const hasPitching = careerIP > 0
  const hasHitting = careerAB > 0
  const isTwoWay = hasPitching && hasHitting && !isPitcher // position player who also pitches, or vice versa

  if (isTwoWay) {
    // Two-way: must be under BOTH thresholds
    if (careerAB < 130 && careerIP < 50) {
      return { isEligible: true, reason: 'rookie_two_way' }
    }
    return { isEligible: false, reason: null }
  }

  if (isPitcher) {
    if (careerIP < 50) {
      return { isEligible: true, reason: 'rookie_pitcher' }
    }
    return { isEligible: false, reason: null }
  }

  // Hitter
  if (careerAB < 130) {
    return { isEligible: true, reason: 'rookie_hitter' }
  }
  return { isEligible: false, reason: null }
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('⚾ NA Eligibility Auto-Detection')
  console.log('================================\n')

  // Fetch all players
  console.log('📋 Fetching players from Supabase...')
  const players = await supabaseRequest(
    'players?select=id,full_name,mlb_team,primary_position,yahoo_player_id,mlb_person_id&order=full_name'
  )
  console.log(`   Found ${players.length} players\n`)

  const stats = {
    total: players.length,
    matched: 0,
    unmatched: 0,
    naEligible: 0,
    notEligible: 0,
    errors: 0,
    naPlayers: [],
    unmatchedPlayers: [],
  }

  const now = new Date().toISOString()

  for (let i = 0; i < players.length; i++) {
    const player = players[i]
    const progress = `[${i + 1}/${players.length}]`

    process.stdout.write(`${progress} ${player.full_name} (${player.mlb_team}, ${player.primary_position})... `)

    // Search MLB Stats API for this player
    let mlbPlayer = null
    
    // If we already have an MLB ID from a previous run, use it
    if (player.mlb_person_id) {
      mlbPlayer = { id: player.mlb_person_id, fullName: player.full_name, mlbDebutDate: null }
      // Still need to fetch debut date
      try {
        const data = await mlbApiRequest(
          `https://statsapi.mlb.com/api/v1/people/${player.mlb_person_id}`
        )
        mlbPlayer.mlbDebutDate = data.people?.[0]?.mlbDebutDate || null
      } catch (e) {
        // ignore, use what we have
      }
      await sleep(50)
    } else {
      mlbPlayer = await searchMlbPlayer(player.full_name, player.mlb_team)
      await sleep(100) // Rate limiting
    }

    if (!mlbPlayer) {
      console.log(`❌ No MLB match found`)
      stats.unmatched++
      stats.unmatchedPlayers.push(player.full_name)
      continue
    }

    stats.matched++
    console.log(`MLB ID: ${mlbPlayer.id}`)

    // Fetch career stats
    const { careerAB, careerIP } = await getCareerStats(mlbPlayer.id)
    await sleep(100) // Rate limiting

    // Check eligibility
    const { isEligible, reason } = checkNaEligibility(
      mlbPlayer.mlbDebutDate,
      careerAB,
      careerIP,
      player.primary_position
    )

    const debutStr = mlbPlayer.mlbDebutDate || 'no debut'
    const eligibleStr = isEligible ? `✅ NA eligible (${reason})` : '❌ Not NA eligible'
    console.log(`   Debut: ${debutStr} | AB: ${careerAB} | IP: ${careerIP} | ${eligibleStr}`)

    if (isEligible) {
      stats.naEligible++
      stats.naPlayers.push({ name: player.full_name, reason, careerAB, careerIP })
    } else {
      stats.notEligible++
    }

    // Update Supabase
    try {
      await supabaseRequest(`players?id=eq.${player.id}`, {
        method: 'PATCH',
        body: {
          mlb_person_id: mlbPlayer.id,
          mlb_debut_date: mlbPlayer.mlbDebutDate || null,
          career_ab: careerAB,
          career_ip: careerIP,
          is_na_eligible: isEligible,
          na_eligibility_reason: reason,
          na_updated_at: now,
        },
      })
    } catch (err) {
      console.error(`   ⚠️ DB update failed: ${err.message}`)
      stats.errors++
    }
  }

  // ─── Summary ───────────────────────────────────────────────────
  console.log('\n\n📊 SUMMARY')
  console.log('==========')
  console.log(`Total players checked: ${stats.total}`)
  console.log(`MLB matches found:     ${stats.matched}`)
  console.log(`Could not match:       ${stats.unmatched}`)
  console.log(`NA eligible:           ${stats.naEligible}`)
  console.log(`Not NA eligible:       ${stats.notEligible}`)
  console.log(`DB update errors:      ${stats.errors}`)

  if (stats.naPlayers.length > 0) {
    console.log('\n🟢 NA-Eligible Players:')
    for (const p of stats.naPlayers) {
      console.log(`   ${p.name} — ${p.reason} (AB: ${p.careerAB}, IP: ${p.careerIP})`)
    }
  }

  if (stats.unmatchedPlayers.length > 0) {
    console.log('\n🔴 Unmatched Players:')
    for (const name of stats.unmatchedPlayers) {
      console.log(`   ${name}`)
    }
  }

  return stats
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
