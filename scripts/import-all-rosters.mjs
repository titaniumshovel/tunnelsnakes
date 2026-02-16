#!/usr/bin/env node
/**
 * Import All 2025 Rosters into Supabase for The Sandlot (2026 season)
 * 
 * Reads /tmp/all-rosters-2025.json and:
 * 1. Upserts all ~287 players into the `players` table
 * 2. Creates `my_roster_players` entries linking players to their 2026 team keys
 * 
 * Usage: node scripts/import-all-rosters.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) env[match[1]] = match[2]
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const LEAGUE_2026 = '469.l.24701'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// 2025 → 2026 team key mapping (same t.N, different league prefix)
function map2025To2026TeamKey(key2025) {
  // 458.l.5221.t.N → 469.l.24701.t.N
  const teamNum = key2025.split('.t.')[1]
  return `${LEAGUE_2026}.t.${teamNum}`
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

async function main() {
  console.log('📂 Reading roster data...')
  const rosterData = JSON.parse(readFileSync('/tmp/all-rosters-2025.json', 'utf-8'))
  console.log(`   Found ${rosterData.length} teams`)

  // First, get existing players by yahoo_player_id to preserve keeper costs etc.
  console.log('📋 Fetching existing players...')
  const existingPlayers = await supabaseRequest('players?select=id,yahoo_player_id,full_name')
  const existingByYahooId = new Map()
  for (const p of existingPlayers) {
    if (p.yahoo_player_id) existingByYahooId.set(String(p.yahoo_player_id), p)
  }
  console.log(`   ${existingPlayers.length} existing players in DB`)

  // Get existing roster entries to avoid duplicates
  console.log('📋 Fetching existing roster entries...')
  const existingRoster = await supabaseRequest('my_roster_players?select=id,player_id,yahoo_team_key')
  const existingRosterSet = new Set(existingRoster.map(r => `${r.player_id}:${r.yahoo_team_key}`))
  console.log(`   ${existingRoster.length} existing roster entries`)

  let totalPlayersUpserted = 0
  let totalRosterCreated = 0
  let totalRosterSkipped = 0

  for (const team of rosterData) {
    const teamKey2026 = map2025To2026TeamKey(team.yahoo_team_key)
    console.log(`\n⚾ ${team.team_name} (${team.yahoo_team_key} → ${teamKey2026}): ${team.players.length} players`)

    for (const player of team.players) {
      const yahooId = String(player.yahoo_player_id)
      
      // Check if player exists
      const existing = existingByYahooId.get(yahooId)
      let playerId

      if (existing) {
        // Update existing player (preserve keeper costs and other enrichment data)
        playerId = existing.id
        await supabaseRequest(`players?id=eq.${playerId}`, {
          method: 'PATCH',
          body: {
            full_name: player.full_name,
            mlb_team: player.mlb_team,
            primary_position: player.primary_position,
            eligible_positions: player.eligible_positions,
            headshot_url: player.headshot_url,
            yahoo_player_id: parseInt(yahooId),
            yahoo_player_key: `469.p.${yahooId}`,
            updated_at: new Date().toISOString(),
          },
        })
      } else {
        // Insert new player
        const inserted = await supabaseRequest('players', {
          method: 'POST',
          body: {
            full_name: player.full_name,
            mlb_team: player.mlb_team,
            primary_position: player.primary_position,
            eligible_positions: player.eligible_positions,
            headshot_url: player.headshot_url,
            yahoo_player_id: parseInt(yahooId),
            yahoo_player_key: `469.p.${yahooId}`,
          },
        })
        playerId = inserted[0].id
        existingByYahooId.set(yahooId, { id: playerId, yahoo_player_id: yahooId })
      }
      totalPlayersUpserted++

      // Create roster entry if not already linked
      const rosterKey = `${playerId}:${teamKey2026}`
      if (existingRosterSet.has(rosterKey)) {
        totalRosterSkipped++
        continue
      }

      await supabaseRequest('my_roster_players', {
        method: 'POST',
        body: {
          player_id: playerId,
          yahoo_team_key: teamKey2026,
          yahoo_league_key: LEAGUE_2026,
          keeper_status: 'undecided',
          is_available: true,
        },
      })
      existingRosterSet.add(rosterKey)
      totalRosterCreated++
    }

    console.log(`   ✅ Done`)
  }

  console.log(`\n🎉 Import complete!`)
  console.log(`   Players upserted: ${totalPlayersUpserted}`)
  console.log(`   Roster entries created: ${totalRosterCreated}`)
  console.log(`   Roster entries skipped (already existed): ${totalRosterSkipped}`)

  // Final counts
  const finalPlayers = await supabaseRequest('players?select=id')
  const finalRoster = await supabaseRequest('my_roster_players?select=yahoo_team_key')
  console.log(`\n📊 Final counts:`)
  console.log(`   Total players: ${finalPlayers.length}`)
  console.log(`   Total roster entries: ${finalRoster.length}`)
  
  // Count per team
  const teamCounts = {}
  for (const r of finalRoster) {
    teamCounts[r.yahoo_team_key] = (teamCounts[r.yahoo_team_key] || 0) + 1
  }
  for (const [key, count] of Object.entries(teamCounts).sort()) {
    console.log(`   ${key}: ${count}`)
  }
}

main().catch(err => {
  console.error('❌ Import failed:', err)
  process.exit(1)
})
