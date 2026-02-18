#!/usr/bin/env node
/**
 * FRESH ROSTER FIX v2 — Complete reset from Yahoo 2025 baseline
 * 
 * Approach: Load ALL data into memory first, make changes, batch update.
 * This avoids the Supabase embedded filter issues from v1.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) env[match[1]] = match[2];
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const LEAGUE_2026 = '469.l.24701';

const TEAM_NAMES = {
  1: 'Chris', 2: 'Alex', 3: 'Pudge', 4: 'Sean', 5: 'Tom',
  6: 'Greasy', 7: 'Web', 8: 'Nick', 9: 'Bob', 10: 'Mike',
  11: 'Lake Monsters', 12: 'Tyler',
};

async function supaFetch(endpoint) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`GET ${endpoint}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supaPatch(endpoint, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${endpoint}: ${res.status} ${await res.text()}`);
}

function teamKey(n) { return `${LEAGUE_2026}.t.${n}`; }
function teamNum(key) { return parseInt(key.split('.t.')[1]); }

// =====================================================================
// 2025 KEEPER DATA (keeper years from reference image)
// =====================================================================
const KEEPERS_2025 = {
  // Bob (t.9)
  "Bobby Witt Jr.": { years: 3 }, "Gunnar Henderson": { years: 2 }, "Julio Rodríguez": { years: 3 },
  "Adley Rutschman": { years: 3 }, "Cody Bellinger": { years: 2 }, "Ceddanne Rafaela": { years: 1 },
  "Walker Jenkins": { years: 1, isNA: true }, "Jackson Jobe": { years: 1, isNA: true }, "Thomas White": { years: 1, isNA: true },
  // Pudge (t.3)
  "Francisco Lindor": { years: 3 }, "Jose Altuve": { years: 4 }, "Blake Snell": { years: 2 },
  "Kyle Schwarber": { years: 1 }, "Salvador Perez": { years: 1 }, "Josh Naylor": { years: 1 },
  "Luisangel Acuña": { years: 1, isNA: true },
  // Sean (t.4)
  "Elly De La Cruz": { years: 2 }, "Tarik Skubal": { years: 1 }, "Matt Olson": { years: 4 },
  "Corey Seager": { years: 2 }, "Marcus Semien": { years: 3 }, "Brent Rooker": { years: 1 },
  "Roman Anthony": { years: 1, isNA: true }, "Matt Shaw": { years: 1, isNA: true }, "Carson Williams": { years: 1, isNA: true },
  // Chris (t.1)
  "Yordan Alvarez": { years: 4 }, "Zack Wheeler": { years: 2 }, "Austin Riley": { years: 4 },
  "Pete Alonso": { years: 4 }, "Chris Sale": { years: 1 }, "Jackson Merrill": { years: 1 },
  "Marcelo Mayer": { years: 1, isNA: true }, "Noah Schultz": { years: 1, isNA: true },
  // Alex (t.2)
  "Trea Turner": { years: 5 }, "Rafael Devers": { years: 4 }, "Manny Machado": { years: 3 },
  "Wyatt Langford": { years: 1 }, "Jarren Duran": { years: 1 }, "Lawrence Butler": { years: 1 },
  "Max Clark": { years: 1, isNA: true }, "Colt Emerson": { years: 1, isNA: true },
  // Web (t.5) — BUT some of these ended 2025 on Tom's roster (t.7) due to mid-season trades
  "Fernando Tatis Jr.": { years: 5 }, "Vladimir Guerrero Jr.": { years: 4 },
  "Emmanuel Clase": { years: 1 }, "Paul Skenes": { years: 1 }, "Willy Adames": { years: 1 },
  "Jackson Chourio": { years: 1 },
  "Colson Montgomery": { years: 1, isNA: true }, "Jordan Walker": { years: 1, isNA: true }, "Dylan Crews": { years: 1, isNA: true },
  // Tom (t.7)
  "Logan Gilbert": { years: 1 }, "CJ Abrams": { years: 2 }, "Dylan Cease": { years: 1 },
  "Mike Trout": { years: 5 }, "Bryce Miller": { years: 1 }, "Matt Chapman": { years: 1 },
  "Samuel Basallo": { years: 1, isNA: true }, "Jordan Lawlar": { years: 1, isNA: true },
  // Greasy (t.6)
  "Kyle Tucker": { years: 5 }, "Corbin Carroll": { years: 2 }, "Ronald Acuña Jr.": { years: 5 },
  "Jazz Chisholm Jr.": { years: 3 }, "James Wood": { years: 1 }, "Ketel Marte": { years: 1 },
  "Riley Greene": { years: 1 },
  "Marco Luciano": { years: 1, isNA: true }, "Druw Jones": { years: 1, isNA: true },
  // Mike (t.10)
  "Shohei Ohtani (Batter)": { years: 4 }, "Juan Soto": { years: 5 }, "Mookie Betts": { years: 5 },
  "Junior Caminero": { years: 1 }, "Garrett Crochet": { years: 1 }, "Jacob deGrom": { years: 1 },
  "Shohei Ohtani (Pitcher)": { years: 1 },
  "Kristian Campbell": { years: 1, isNA: true }, "Ethan Salas": { years: 1, isNA: true }, "Heston Kjerstad": { years: 1, isNA: true },
  // Nick (t.8)
  "Aaron Judge": { years: 4 }, "José Ramírez": { years: 3 }, "Bryce Harper": { years: 5 },
  "Freddie Freeman": { years: 3 }, "Corbin Burnes": { years: 5 },
  "Jasson Dominguez": { years: 1, isNA: true }, "Spencer Jones": { years: 1, isNA: true },
};

// =====================================================================
// OFFSEASON TRADES — applied to Yahoo baseline
// =====================================================================
const TRADES = [
  { id: '0 (Oct 19)', moves: [['Pete Alonso', 1, 9], ['Cody Bellinger', 9, 1]] },
  { id: '1 (Feb 11)', moves: [['Matt Olson', 4, 2]] },
  { id: '2 (Feb 13)', moves: [['Jazz Chisholm Jr.', 6, 4]] },
  { id: '3 (Feb 14)', moves: [['Alex Bregman', 2, 12], ['Trea Turner', 2, 12]] },
  { id: '4 (Feb 15)', moves: [['Mookie Betts', 2, 8]] },
  { id: '5 (Feb 15)', moves: [['Nolan McLean', 2, 10], ['Bryan Woo', 10, 2], ['Ethan Salas', 10, 2]] },
  { id: '6 (Feb 15)', moves: [['Hunter Brown', 10, 12], ['Max Fried', 10, 12]] },
  { id: '7 (Feb 15)', moves: [['Austin Riley', 1, 9]] },
  { id: '8 (Feb 16)', moves: [['Christian Yelich', 2, 12], ['Taylor Ward', 2, 12]] },
  { id: '9 (Feb 16)', moves: [['Byron Buxton', 8, 2], ['Manny Machado', 2, 8]] },
  { id: '10 (Feb 16)', moves: [['Chase Burns', 10, 2], ['Ivan Herrera', 10, 2]] },
  { id: '11 (Feb 16)', moves: [['Taylor Ward', 7, 2], ['Jarren Duran', 2, 7]] },
  { id: '12 (Feb 17)', moves: [['Wyatt Langford', 2, 3], ['Yandy Díaz', 2, 3], ['Cole Ragans', 2, 3], ['Kyle Schwarber', 3, 2]] },
];

// DO NOT TOUCH labels (confirmed by Chris)
const PROTECTED_LABELS = {
  'Cole Ragans': { label: 'Trade — Rd 2', round: 2 },
  'Yandy Díaz': { label: 'Trade — Rd 6', round: 6 },
  'Mike Trout': { label: 'FA — Rd 23', round: 23 },
};

// =====================================================================
// MAIN
// =====================================================================
async function main() {
  console.log('🔧 FRESH ROSTER FIX v2');
  console.log('='.repeat(60));

  // ── Load all DB data ──
  console.log('\nLoading DB data...');
  const players = await supaFetch('players?select=id,full_name,fantasypros_ecr,is_na_eligible,eligible_positions,keeper_cost_label,keeper_cost_round&limit=500');
  const rosterEntries = await supaFetch('my_roster_players?select=id,player_id,yahoo_team_key,keeper_cost_label,keeper_cost_round,keeper_status&limit=500');
  
  // Build lookups
  const playerById = {};
  const playerByName = {};
  for (const p of players) {
    playerById[p.id] = p;
    playerByName[p.full_name] = p;
  }
  
  const rosterByPlayerId = {};
  const rosterByName = {};
  for (const r of rosterEntries) {
    const player = playerById[r.player_id];
    if (player) {
      rosterByPlayerId[r.player_id] = r;
      rosterByName[player.full_name] = r;
    }
  }
  
  console.log(`  ${players.length} players, ${rosterEntries.length} roster entries`);

  // ── Load Yahoo baseline ──
  console.log('\nLoading Yahoo 2025 baseline...');
  const yahooLines = readFileSync('/tmp/yahoo-2025-player-map.tsv', 'utf-8').trim().split('\n');
  const yahooMap = {}; // name → teamNum
  for (const line of yahooLines) {
    const parts = line.split('\t');
    const name = parts[0];
    const team = parseInt(parts[parts.length - 1]); // last field is team num
    yahooMap[name] = team;
  }
  console.log(`  ${Object.keys(yahooMap).length} Yahoo players loaded`);

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: Reset team assignments to Yahoo baseline
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n=== STEP 1: Reset team assignments to Yahoo 2025 baseline ===');
  let step1Updated = 0, step1Unchanged = 0, step1NotFound = 0;
  
  for (const r of rosterEntries) {
    const player = playerById[r.player_id];
    if (!player) continue;
    
    const yahooTeam = yahooMap[player.full_name];
    if (yahooTeam === undefined) {
      step1NotFound++;
      continue;
    }
    
    const correctKey = teamKey(yahooTeam);
    if (r.yahoo_team_key === correctKey) {
      r._teamNum = yahooTeam; // track for later
      step1Unchanged++;
      continue;
    }
    
    // Update
    await supaPatch(`my_roster_players?id=eq.${r.id}`, { yahoo_team_key: correctKey });
    r.yahoo_team_key = correctKey; // update in-memory too
    r._teamNum = yahooTeam;
    step1Updated++;
  }
  
  console.log(`  Reset: ${step1Updated}, Already correct: ${step1Unchanged}, Not in Yahoo: ${step1NotFound}`);

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2: Apply offseason trades
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n=== STEP 2: Apply offseason trades ===');
  let tradesMoved = 0, tradesNotFound = 0, tradesWrongTeam = 0;
  
  for (const trade of TRADES) {
    console.log(`  Trade ${trade.id}:`);
    for (const [name, fromTeam, toTeam] of trade.moves) {
      const roster = rosterByName[name];
      if (!roster) {
        console.log(`    ❌ ${name}: NOT FOUND in DB`);
        tradesNotFound++;
        continue;
      }
      
      const currentTeam = teamNum(roster.yahoo_team_key);
      if (currentTeam !== fromTeam) {
        console.log(`    ⚠️ ${name}: expected t.${fromTeam} (${TEAM_NAMES[fromTeam]}), found t.${currentTeam} (${TEAM_NAMES[currentTeam]}). Moving anyway.`);
        tradesWrongTeam++;
      }
      
      const newKey = teamKey(toTeam);
      await supaPatch(`my_roster_players?id=eq.${roster.id}`, { yahoo_team_key: newKey });
      roster.yahoo_team_key = newKey; // update in-memory
      console.log(`    ✅ ${name}: t.${currentTeam} → t.${toTeam} (${TEAM_NAMES[toTeam]})`);
      tradesMoved++;
    }
  }
  
  console.log(`\n  Moved: ${tradesMoved}, Not found: ${tradesNotFound}, Wrong team: ${tradesWrongTeam}`);

  // ═══════════════════════════════════════════════════════════════════
  // STEPS 3 & 4: Set keeper labels + ECR rounds
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n=== STEPS 3 & 4: Keeper labels + ECR rounds ===');
  let keeperUpdated = 0, keeperUnchanged = 0, protectedCount = 0;
  const changes = [];
  
  for (const r of rosterEntries) {
    const player = playerById[r.player_id];
    if (!player) continue;
    const name = player.full_name;
    const ecr = player.fantasypros_ecr;
    
    let newLabel, newRound;
    
    // Check protected list first
    if (PROTECTED_LABELS[name]) {
      newLabel = PROTECTED_LABELS[name].label;
      newRound = PROTECTED_LABELS[name].round;
      protectedCount++;
    }
    // Check 2025 keeper reference
    else if (KEEPERS_2025[name]) {
      const k = KEEPERS_2025[name];
      if (k.isNA) {
        newLabel = 'NA (minor leaguer)';
        newRound = 23;
      } else {
        const yr = k.years + 1;
        const ordinal = yr === 2 ? '2nd' : yr === 3 ? '3rd' : `${yr}th`;
        newLabel = `${ordinal} yr keeper — ECR`;
        newRound = ecr ? Math.ceil(ecr / 12) : null;
      }
    }
    // Not a 2025 keeper — keep existing 1st-year label if it exists
    else {
      const existing = r.keeper_cost_label;
      if (existing && (existing.startsWith('Drafted') || existing.startsWith('FA') || existing.startsWith('Trade'))) {
        keeperUnchanged++;
        continue; // keep as-is
      }
      // No label at all — default
      newLabel = 'Drafted Rd 23';
      newRound = 23;
    }
    
    // Check if update needed
    if (r.keeper_cost_label === newLabel && r.keeper_cost_round === newRound) {
      keeperUnchanged++;
      continue;
    }
    
    // Update BOTH tables
    await supaPatch(`my_roster_players?id=eq.${r.id}`, { keeper_cost_label: newLabel, keeper_cost_round: newRound });
    await supaPatch(`players?id=eq.${player.id}`, { keeper_cost_label: newLabel, keeper_cost_round: newRound });
    
    if (r.keeper_cost_label !== newLabel) {
      changes.push(`  ${name}: "${r.keeper_cost_label}" → "${newLabel}", Rd ${newRound}`);
    }
    r.keeper_cost_label = newLabel;
    r.keeper_cost_round = newRound;
    keeperUpdated++;
  }
  
  console.log(`  Updated: ${keeperUpdated}, Unchanged: ${keeperUnchanged}, Protected: ${protectedCount}`);
  if (changes.length > 0) {
    console.log('\n  Label changes:');
    changes.forEach(c => console.log(c));
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 5: Verify
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n=== STEP 5: Verification ===');
  
  // Re-fetch to get final state
  const finalRoster = await supaFetch('my_roster_players?select=yahoo_team_key,keeper_cost_label,keeper_cost_round,keeper_status,player_id&limit=500');
  
  const teams = {};
  for (const r of finalRoster) {
    const player = playerById[r.player_id];
    if (!player) continue;
    const tn = teamNum(r.yahoo_team_key);
    if (!teams[tn]) teams[tn] = [];
    teams[tn].push({ name: player.full_name, ecr: player.fantasypros_ecr, label: r.keeper_cost_label, round: r.keeper_cost_round, status: r.keeper_status });
  }
  
  for (const tn of Object.keys(teams).sort((a, b) => a - b)) {
    const t = teams[tn];
    const keepers = t.filter(p => p.label && (p.label.includes('keeper') || p.label.includes('NA')));
    keepers.sort((a, b) => (a.round || 99) - (b.round || 99));
    
    console.log(`\n  t.${tn} ${TEAM_NAMES[tn]} (${t.length} players, ${keepers.length} keepers):`);
    for (const k of keepers) {
      console.log(`    ⭐ ${k.name}: ${k.label} — Rd ${k.round} (ECR ${k.ecr || 'N/A'})`);
    }
  }
  
  // Anomaly checks
  console.log('\n  === ANOMALY CHECKS ===');
  const chrisTeam = teams[1] || [];
  for (const name of ['Yordan Alvarez', 'Cal Raleigh', 'Chris Sale', 'Zack Wheeler', 'Jackson Merrill', 'Cody Bellinger']) {
    if (!chrisTeam.find(p => p.name === name)) console.log(`  ⚠️ ${name} NOT on Chris (t.1)!`);
    else console.log(`  ✅ ${name} on Chris (t.1)`);
  }
  
  const bobTeam = teams[9] || [];
  for (const name of ['Pete Alonso', 'Austin Riley']) {
    if (!bobTeam.find(p => p.name === name)) console.log(`  ⚠️ ${name} NOT on Bob (t.9)!`);
    else console.log(`  ✅ ${name} on Bob (t.9)`);
  }
  
  const pudgeTeam = teams[3] || [];
  const ragans = pudgeTeam.find(p => p.name === 'Cole Ragans');
  console.log(`  ${ragans?.label === 'Trade — Rd 2' ? '✅' : '⚠️'} Ragans: ${ragans?.label || 'NOT FOUND'}`);
  const ydiaz = pudgeTeam.find(p => p.name === 'Yandy Díaz');
  console.log(`  ${ydiaz?.label === 'Trade — Rd 6' ? '✅' : '⚠️'} Yandy Díaz: ${ydiaz?.label || 'NOT FOUND'}`);
  const trout = (teams[9] || []).find(p => p.name === 'Mike Trout');
  console.log(`  ${trout?.label === 'FA — Rd 23' ? '✅' : '⚠️'} Trout: ${trout?.label || 'NOT FOUND on Bob'}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ DONE');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
