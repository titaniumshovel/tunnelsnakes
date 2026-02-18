#!/usr/bin/env node
/**
 * FRESH ROSTER FIX — Complete reset from Yahoo 2025 baseline
 * 
 * Step 1: Reset all my_roster_players.yahoo_team_key to match Yahoo 2025 end-of-season
 * Step 2: Apply offseason trades (email-based, not in Yahoo)
 * Step 3: Set keeper year labels using 2025 keeper reference
 * Step 4: Calculate ECR rounds
 * Step 5: Verify
 * 
 * CORRECT 2026 TEAM MAPPING (verified from Yahoo API):
 * t.1=Chris (Tunnel Snakes), t.2=Alex, t.3=Pudge, t.4=Sean
 * t.5=Web (Goin' Yahdgoats), t.6=Greasy, t.7=Tom (Lollygaggers), t.8=Nick (Red Stagz)
 * t.9=Bob (Runs-N-Roses), t.10=Mike (The Dirty Farm)
 * t.11=Lake Monsters (expansion), t.12=Tyler (I Fielder Boobs)
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
  1: 'Chris (Tunnel Snakes)',
  2: 'Alex (Alex in Chains)',
  3: 'Pudge (Bleacher Creatures)',
  4: 'Sean (ClutchHutch)',
  5: 'Web (Goin\' Yahdgoats)',
  6: 'Greasy (Greasy Cap Advisors)',
  7: 'Tom (Lollygaggers)',
  8: 'Nick (Red Stagz)',
  9: 'Bob (Runs-N-Roses)',
  10: 'Mike (The Dirty Farm)',
  11: 'Lake Monsters (expansion)',
  12: 'Tyler (I Fielder Boobs)',
};

// =====================================================================
// 2025 KEEPER REFERENCE — keeper years (from the keeper image)
// Format: { playerName: { years: N, round: N, team: 'owner', isNA: bool } }
// =====================================================================
const KEEPERS_2025 = {
  // Bob (t.9 in 2026)
  "Bobby Witt Jr.": { years: 3, round: 1, team: 'Bob' },
  "Gunnar Henderson": { years: 2, round: 2, team: 'Bob' },
  "Julio Rodríguez": { years: 3, round: 3, team: 'Bob' },
  "Adley Rutschman": { years: 3, round: 4, team: 'Bob' },
  "Cody Bellinger": { years: 2, round: 5, team: 'Bob' },
  "Ceddanne Rafaela": { years: 1, round: 23, team: 'Bob' },
  "Walker Jenkins": { years: 1, round: 0, team: 'Bob', isNA: true },
  "Jackson Jobe": { years: 1, round: 0, team: 'Bob', isNA: true },
  "Thomas White": { years: 1, round: 0, team: 'Bob', isNA: true },
  
  // Pudge (t.3)
  "Francisco Lindor": { years: 3, round: 2, team: 'Pudge' },
  "Jose Altuve": { years: 4, round: 5, team: 'Pudge' },
  "Blake Snell": { years: 2, round: 6, team: 'Pudge' },
  "Kyle Schwarber": { years: 1, round: 7, team: 'Pudge' },
  "Salvador Perez": { years: 1, round: 13, team: 'Pudge' },
  "Josh Naylor": { years: 1, round: 17, team: 'Pudge' },
  "Luisangel Acuña": { years: 1, round: 0, team: 'Pudge', isNA: true },

  // Sean (t.4)
  "Elly De La Cruz": { years: 2, round: 1, team: 'Sean' },
  "Tarik Skubal": { years: 1, round: 2, team: 'Sean' },
  "Matt Olson": { years: 4, round: 4, team: 'Sean' },
  "Corey Seager": { years: 2, round: 5, team: 'Sean' },
  "Marcus Semien": { years: 3, round: 6, team: 'Sean' },
  "Brent Rooker": { years: 1, round: 23, team: 'Sean' },
  "Roman Anthony": { years: 1, round: 0, team: 'Sean', isNA: true },
  "Matt Shaw": { years: 1, round: 0, team: 'Sean', isNA: true },
  "Carson Williams": { years: 1, round: 0, team: 'Sean', isNA: true },

  // Chris (t.1)
  "Yordan Alvarez": { years: 4, round: 2, team: 'Chris' },
  "Zack Wheeler": { years: 2, round: 3, team: 'Chris' },
  "Austin Riley": { years: 4, round: 4, team: 'Chris' },
  "Pete Alonso": { years: 4, round: 5, team: 'Chris' },
  "Chris Sale": { years: 1, round: 12, team: 'Chris' },
  "Jackson Merrill": { years: 1, round: 20, team: 'Chris' },
  "Marcelo Mayer": { years: 1, round: 0, team: 'Chris', isNA: true },
  "Noah Schultz": { years: 1, round: 0, team: 'Chris', isNA: true },

  // Alex (t.2)
  "Trea Turner": { years: 5, round: 3, team: 'Alex' },
  "Rafael Devers": { years: 4, round: 4, team: 'Alex' },
  "Manny Machado": { years: 3, round: 5, team: 'Alex' },
  "Wyatt Langford": { years: 1, round: 9, team: 'Alex' },
  "Jarren Duran": { years: 1, round: 13, team: 'Alex' },
  "Lawrence Butler": { years: 1, round: 22, team: 'Alex' },
  "Max Clark": { years: 1, round: 0, team: 'Alex', isNA: true },
  "Colt Emerson": { years: 1, round: 0, team: 'Alex', isNA: true },

  // Web (t.5)
  "Fernando Tatis Jr.": { years: 5, round: 1, team: 'Web' },
  "Vladimir Guerrero Jr.": { years: 4, round: 2, team: 'Web' },
  "Emmanuel Clase": { years: 1, round: 7, team: 'Web' },
  "Paul Skenes": { years: 1, round: 13, team: 'Web' },
  "Willy Adames": { years: 1, round: 14, team: 'Web' },
  "Jackson Chourio": { years: 1, round: 23, team: 'Web' },
  "Colson Montgomery": { years: 1, round: 0, team: 'Web', isNA: true },
  "Jordan Walker": { years: 1, round: 0, team: 'Web', isNA: true },
  "Dylan Crews": { years: 1, round: 0, team: 'Web', isNA: true },

  // Tom (t.7)
  "Logan Gilbert": { years: 1, round: 4, team: 'Tom' },
  "CJ Abrams": { years: 2, round: 5, team: 'Tom' },
  "Dylan Cease": { years: 1, round: 9, team: 'Tom' },
  "Mike Trout": { years: 5, round: 12, team: 'Tom' },
  "Bryce Miller": { years: 1, round: 17, team: 'Tom' },
  "Matt Chapman": { years: 1, round: 23, team: 'Tom' },
  "Samuel Basallo": { years: 1, round: 0, team: 'Tom', isNA: true },
  "Jordan Lawlar": { years: 1, round: 0, team: 'Tom', isNA: true },

  // Greasy (t.6)
  "Kyle Tucker": { years: 5, round: 1, team: 'Greasy' },
  "Corbin Carroll": { years: 2, round: 2, team: 'Greasy' },
  "Ronald Acuña Jr.": { years: 5, round: 3, team: 'Greasy' },
  "Jazz Chisholm Jr.": { years: 3, round: 4, team: 'Greasy' },
  "James Wood": { years: 1, round: 6, team: 'Greasy' },
  "Ketel Marte": { years: 1, round: 10, team: 'Greasy' },
  "Riley Greene": { years: 1, round: 23, team: 'Greasy' },
  "Marco Luciano": { years: 1, round: 0, team: 'Greasy', isNA: true },
  "Druw Jones": { years: 1, round: 0, team: 'Greasy', isNA: true },

  // Mike (t.10)
  "Shohei Ohtani (Batter)": { years: 4, round: 1, team: 'Mike' },
  "Juan Soto": { years: 5, round: 2, team: 'Mike' },
  "Mookie Betts": { years: 5, round: 3, team: 'Mike' },
  "Junior Caminero": { years: 1, round: 8, team: 'Mike' },
  "Garrett Crochet": { years: 1, round: 17, team: 'Mike' },
  "Jacob deGrom": { years: 1, round: 18, team: 'Mike' },
  "Shohei Ohtani (Pitcher)": { years: 1, round: 23, team: 'Mike' },
  "Kristian Campbell": { years: 1, round: 0, team: 'Mike', isNA: true },
  "Ethan Salas": { years: 1, round: 0, team: 'Mike', isNA: true },
  "Heston Kjerstad": { years: 1, round: 0, team: 'Mike', isNA: true },

  // Nick (t.8)
  "Aaron Judge": { years: 4, round: 1, team: 'Nick' },
  "José Ramírez": { years: 3, round: 2, team: 'Nick' },
  "Bryce Harper": { years: 5, round: 3, team: 'Nick' },
  "Freddie Freeman": { years: 3, round: 4, team: 'Nick' },
  "Corbin Burnes": { years: 5, round: 5, team: 'Nick' },
  "Jasson Dominguez": { years: 1, round: 0, team: 'Nick', isNA: true },
  "Spencer Jones": { years: 1, round: 0, team: 'Nick', isNA: true },
};

// =====================================================================
// OFFSEASON TRADES — email-based, chronological order
// These are NOT in Yahoo. Applied AFTER Yahoo baseline.
// =====================================================================
const OFFSEASON_TRADES = [
  {
    id: 'Trade 0 (Oct 19)',
    desc: 'Bob ↔ Chris: Bellinger for Alonso + picks',
    moves: [
      { player: 'Pete Alonso', from: 1, to: 9 },       // Chris → Bob
      { player: 'Cody Bellinger', from: 9, to: 1 },     // Bob → Chris
    ]
  },
  {
    id: 'Trade 1 (Feb 11)',
    desc: 'Sean ↔ Alex: Olson + picks',
    moves: [
      { player: 'Matt Olson', from: 4, to: 2 },         // Sean → Alex
    ]
  },
  {
    id: 'Trade 2 (Feb 13)',
    desc: 'Greasy ↔ Sean: Jazz Chisholm + picks',
    moves: [
      { player: 'Jazz Chisholm Jr.', from: 6, to: 4 },  // Greasy → Sean
    ]
  },
  {
    id: 'Trade 3 (Feb 14)',
    desc: 'Alex ↔ Tyler: Bregman + Turner + picks',
    moves: [
      { player: 'Alex Bregman', from: 2, to: 12 },      // Alex → Tyler
      { player: 'Trea Turner', from: 2, to: 12 },       // Alex → Tyler
    ]
  },
  {
    id: 'Trade 4 (Feb 15)',
    desc: 'Alex ↔ Nick: Mookie Betts + picks',
    moves: [
      { player: 'Mookie Betts', from: 2, to: 8 },       // Alex → Nick (Betts was on Alex from mid-season trade with Mike)
    ]
  },
  {
    id: 'Trade 5 (Feb 15)',
    desc: 'Mike ↔ Alex: McLean + Woo + Salas',
    moves: [
      { player: 'Nolan McLean', from: 2, to: 10 },      // Alex → Mike
      { player: 'Bryan Woo', from: 10, to: 2 },         // Mike → Alex
      { player: 'Ethan Salas', from: 10, to: 2 },       // Mike → Alex
    ]
  },
  {
    id: 'Trade 6 (Feb 15)',
    desc: 'Mike ↔ Tyler: Brown + Fried + picks',
    moves: [
      { player: 'Hunter Brown', from: 10, to: 12 },     // Mike → Tyler
      { player: 'Max Fried', from: 10, to: 12 },        // Mike → Tyler
    ]
  },
  {
    id: 'Trade 7 (Feb 15)',
    desc: 'Chris ↔ Bob: Riley + picks',
    moves: [
      { player: 'Austin Riley', from: 1, to: 9 },       // Chris → Bob
      // Note: Alonso already went to Bob in Trade 0
    ]
  },
  {
    id: 'Trade 8 (Feb 16)',
    desc: 'Alex ↔ Tyler: Yelich + Ward',
    moves: [
      { player: 'Christian Yelich', from: 2, to: 12 },  // Alex → Tyler
      { player: 'Taylor Ward', from: 2, to: 12 },       // Alex → Tyler
    ]
  },
  {
    id: 'Trade 9 (Feb 16)',
    desc: 'Nick ↔ Alex: Buxton + Machado',
    moves: [
      { player: 'Byron Buxton', from: 8, to: 2 },       // Nick → Alex
      { player: 'Manny Machado', from: 2, to: 8 },      // Alex → Nick
    ]
  },
  {
    id: 'Trade 10 (Feb 16)',
    desc: 'Mike ↔ Alex: Burns + Herrera',
    moves: [
      { player: 'Chase Burns', from: 10, to: 2 },       // Mike → Alex
      { player: 'Ivan Herrera', from: 10, to: 2 },      // Mike → Alex
    ]
  },
  {
    id: 'Trade 11 (Feb 16)',
    desc: 'Tom ↔ Alex: Ward + picks for Duran + picks',
    moves: [
      { player: 'Taylor Ward', from: 7, to: 2 },        // Tom → Alex
      { player: 'Jarren Duran', from: 2, to: 7 },       // Alex → Tom
    ]
  },
  {
    id: 'Trade 12 (Feb 17)',
    desc: 'Alex ↔ Pudge: Langford+Díaz+Ragans for Schwarber+picks',
    moves: [
      { player: 'Wyatt Langford', from: 2, to: 3 },     // Alex → Pudge
      { player: 'Cole Ragans', from: 2, to: 3 },        // Alex → Pudge
      { player: 'Kyle Schwarber', from: 3, to: 2 },     // Pudge → Alex
    ]
  },
  {
    // Note: Díaz is tricky — need to find his exact name in DB
    id: 'Trade 12b (Feb 17)',
    desc: 'Alex ↔ Pudge: Yandy Díaz',
    moves: [
      { player: 'Yandy Díaz', from: 2, to: 3 },        // Alex → Pudge
    ]
  },
];

// =====================================================================
// DO NOT TOUCH — these keeper labels were confirmed correct by Chris
// =====================================================================
const DO_NOT_TOUCH = {
  'Kyle Schwarber': { label: '2nd yr keeper — ECR', round: null }, // ECR-based
  'Wyatt Langford': { label: '2nd yr keeper — ECR', round: null }, // ECR-based
  'Cole Ragans': { label: 'Trade — Rd 2', round: 2 },
  'Mike Trout': { label: 'FA — Rd 23', round: 23 },
};

// =====================================================================
// SPECIAL CASES — confirmed by Chris
// =====================================================================
// Mike Trout: Was Tom's 5yr keeper, dropped mid-season, re-drafted by Bob Rd 19.
// Contract RESET to 1st year. Now: "FA — Rd 23" (Chris confirmed).

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...options.headers,
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${options.method || 'GET'} ${endpoint}: ${res.status} ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function teamKey(teamNum) {
  return `${LEAGUE_2026}.t.${teamNum}`;
}

// =====================================================================
// STEP 1: Read Yahoo 2025 baseline and build player→team mapping
// =====================================================================
async function step1_loadYahooBaseline() {
  console.log('\n=== STEP 1: Loading Yahoo 2025 baseline ===');
  
  const lines = readFileSync('/tmp/yahoo-2025-player-map.tsv', 'utf-8').trim().split('\n');
  const yahooMap = {}; // playerName → teamNum
  
  for (const line of lines) {
    const [playerKey, name, teamNum] = line.split('\t');
    yahooMap[name] = parseInt(teamNum);
  }
  
  console.log(`Loaded ${Object.keys(yahooMap).length} players from Yahoo 2025`);
  return yahooMap;
}

// =====================================================================
// STEP 1b: Reset all DB team assignments to Yahoo baseline
// =====================================================================
async function step1b_resetTeamAssignments(yahooMap) {
  console.log('\n=== STEP 1b: Resetting all DB team assignments to Yahoo baseline ===');
  
  // Get all roster entries with player names
  const rosterEntries = await supabaseRequest(
    'my_roster_players?select=id,player_id,yahoo_team_key,players(full_name)&limit=500'
  );
  
  let updated = 0;
  let notFound = 0;
  let unchanged = 0;
  const notFoundList = [];
  
  for (const entry of rosterEntries) {
    if (!entry.players) continue;
    const name = entry.players.full_name;
    const yahooTeam = yahooMap[name];
    
    if (yahooTeam === undefined) {
      // Player not in Yahoo 2025 — might be expansion team player
      notFound++;
      notFoundList.push(name);
      continue;
    }
    
    const correctTeamKey = teamKey(yahooTeam);
    
    if (entry.yahoo_team_key === correctTeamKey) {
      unchanged++;
      continue;
    }
    
    // Reset to Yahoo baseline
    await supabaseRequest(
      `my_roster_players?id=eq.${entry.id}`,
      {
        method: 'PATCH',
        body: { yahoo_team_key: correctTeamKey },
        prefer: 'return=minimal',
      }
    );
    updated++;
  }
  
  console.log(`  Updated: ${updated}, Unchanged: ${unchanged}, Not in Yahoo: ${notFound}`);
  if (notFoundList.length > 0) {
    console.log(`  Not found in Yahoo (likely expansion): ${notFoundList.join(', ')}`);
  }
  
  return notFoundList;
}

// =====================================================================
// STEP 2: Apply offseason trades
// =====================================================================
async function step2_applyTrades() {
  console.log('\n=== STEP 2: Applying offseason trades ===');
  
  for (const trade of OFFSEASON_TRADES) {
    console.log(`\n  ${trade.id}: ${trade.desc}`);
    
    for (const move of trade.moves) {
      const expectedFromKey = teamKey(move.from);
      const targetKey = teamKey(move.to);
      
      // Find player by name
      const players = await supabaseRequest(
        `my_roster_players?select=id,yahoo_team_key,players(full_name)&players.full_name=eq.${encodeURIComponent(move.player)}&limit=5`
      );
      
      const matching = players.filter(p => p.players !== null);
      
      if (matching.length === 0) {
        console.log(`    ⚠️ NOT FOUND: ${move.player}`);
        continue;
      }
      
      const entry = matching[0];
      
      if (entry.yahoo_team_key !== expectedFromKey) {
        console.log(`    ⚠️ ${move.player}: expected on t.${move.from} (${TEAM_NAMES[move.from]}), found on ${entry.yahoo_team_key}. Moving anyway.`);
      }
      
      await supabaseRequest(
        `my_roster_players?id=eq.${entry.id}`,
        {
          method: 'PATCH',
          body: { yahoo_team_key: targetKey },
          prefer: 'return=minimal',
        }
      );
      
      console.log(`    ✅ ${move.player}: → t.${move.to} (${TEAM_NAMES[move.to]})`);
    }
  }
}

// =====================================================================
// STEP 3 & 4: Set keeper year labels + ECR rounds
// =====================================================================
async function step3_4_setKeeperLabels() {
  console.log('\n=== STEPS 3 & 4: Setting keeper year labels + ECR rounds ===');
  
  // Get all roster entries with player details
  const rosterEntries = await supabaseRequest(
    'my_roster_players?select=id,player_id,yahoo_team_key,keeper_cost_label,keeper_cost_round,keeper_status,players(full_name,fantasypros_ecr,eligible_positions,is_na_eligible)&limit=500'
  );
  
  let updated = 0;
  let skipped = 0;
  let dntSkipped = 0;
  const changes = [];
  
  for (const entry of rosterEntries) {
    if (!entry.players) continue;
    const name = entry.players.full_name;
    const ecr = entry.players.fantasypros_ecr;
    
    // Check DO NOT TOUCH list
    if (DO_NOT_TOUCH[name]) {
      const dnt = DO_NOT_TOUCH[name];
      const newLabel = dnt.label;
      const newRound = dnt.round !== null ? dnt.round : (ecr ? Math.ceil(ecr / 12) : entry.keeper_cost_round);
      
      if (entry.keeper_cost_label !== newLabel || entry.keeper_cost_round !== newRound) {
        await supabaseRequest(
          `my_roster_players?id=eq.${entry.id}`,
          { method: 'PATCH', body: { keeper_cost_label: newLabel, keeper_cost_round: newRound }, prefer: 'return=minimal' }
        );
        // Also update players table
        await supabaseRequest(
          `players?id=eq.${entry.player_id}`,
          { method: 'PATCH', body: { keeper_cost_label: newLabel, keeper_cost_round: newRound }, prefer: 'return=minimal' }
        );
        changes.push(`  🔒 ${name}: ${newLabel}, Rd ${newRound} (DO NOT TOUCH)`);
      }
      dntSkipped++;
      continue;
    }
    
    // Look up in 2025 keeper reference
    const keeperInfo = KEEPERS_2025[name];
    
    let newLabel, newRound;
    
    if (keeperInfo) {
      // Player was a keeper in 2025
      const newYears = keeperInfo.years + 1;
      
      if (keeperInfo.isNA) {
        // NA keeper — label depends on if they're still NA eligible
        newLabel = 'NA (minor leaguer)';
        newRound = 23; // NA keepers don't cost a regular round
      } else if (newYears === 2) {
        newLabel = '2nd yr keeper — ECR';
        newRound = ecr ? Math.ceil(ecr / 12) : null;
      } else if (newYears === 3) {
        newLabel = '3rd yr keeper — ECR';
        newRound = ecr ? Math.ceil(ecr / 12) : null;
      } else if (newYears === 4) {
        newLabel = '4th yr keeper — ECR';
        newRound = ecr ? Math.ceil(ecr / 12) : null;
      } else if (newYears === 5) {
        newLabel = '5th yr keeper — ECR';
        newRound = ecr ? Math.ceil(ecr / 12) : null;
      } else if (newYears === 6) {
        newLabel = '6th yr keeper — ECR';
        newRound = ecr ? Math.ceil(ecr / 12) : null;
      } else {
        newLabel = `${newYears}th yr keeper — ECR`;
        newRound = ecr ? Math.ceil(ecr / 12) : null;
      }
    } else {
      // Not a 2025 keeper — 1st year player
      // Determine label based on current status
      // Default: "Drafted Rd X" where X is based on... we don't have draft position
      // For now: if they have an existing "Drafted Rd X" label, keep it
      // If they have "FA — Rd 23", keep it
      // If they have "Trade — Rd X", keep it
      // If null, set to "Drafted Rd 23" as safe default (undrafted/late pick)
      
      if (entry.keeper_cost_label && (
        entry.keeper_cost_label.startsWith('Drafted') ||
        entry.keeper_cost_label.startsWith('FA') ||
        entry.keeper_cost_label.startsWith('Trade')
      )) {
        // Keep existing 1st-year label
        skipped++;
        continue;
      }
      
      // No label — set a default
      newLabel = 'Drafted Rd 23';
      newRound = 23;
    }
    
    if (newLabel && (entry.keeper_cost_label !== newLabel || entry.keeper_cost_round !== newRound)) {
      await supabaseRequest(
        `my_roster_players?id=eq.${entry.id}`,
        { method: 'PATCH', body: { keeper_cost_label: newLabel, keeper_cost_round: newRound }, prefer: 'return=minimal' }
      );
      // Also update players table
      await supabaseRequest(
        `players?id=eq.${entry.player_id}`,
        { method: 'PATCH', body: { keeper_cost_label: newLabel, keeper_cost_round: newRound }, prefer: 'return=minimal' }
      );
      changes.push(`  📝 ${name}: ${entry.keeper_cost_label || 'null'} → ${newLabel}, Rd ${newRound}`);
      updated++;
    } else {
      skipped++;
    }
  }
  
  console.log(`\n  Updated: ${updated}, Unchanged: ${skipped}, DO NOT TOUCH: ${dntSkipped}`);
  if (changes.length > 0 && changes.length <= 60) {
    console.log('\n  Changes:');
    changes.forEach(c => console.log(c));
  } else if (changes.length > 60) {
    console.log(`\n  ${changes.length} changes (showing first 30):`);
    changes.slice(0, 30).forEach(c => console.log(c));
    console.log(`  ... and ${changes.length - 30} more`);
  }
}

// =====================================================================
// STEP 5: Verify
// =====================================================================
async function step5_verify() {
  console.log('\n=== STEP 5: Verification ===');
  
  const rosterEntries = await supabaseRequest(
    'my_roster_players?select=yahoo_team_key,keeper_cost_label,keeper_cost_round,keeper_status,players(full_name,fantasypros_ecr)&limit=500'
  );
  
  // Group by team
  const teams = {};
  for (const entry of rosterEntries) {
    if (!entry.players) continue;
    const teamNum = entry.yahoo_team_key.split('.t.')[1];
    if (!teams[teamNum]) teams[teamNum] = [];
    teams[teamNum].push({
      name: entry.players.full_name,
      ecr: entry.players.fantasypros_ecr,
      label: entry.keeper_cost_label,
      round: entry.keeper_cost_round,
      status: entry.keeper_status,
    });
  }
  
  // Sort teams and print
  const sortedTeams = Object.keys(teams).sort((a, b) => parseInt(a) - parseInt(b));
  
  let totalPlayers = 0;
  const teamSummaries = [];
  
  for (const teamNum of sortedTeams) {
    const players = teams[teamNum];
    totalPlayers += players.length;
    
    // Sort: keepers first, then by round
    players.sort((a, b) => {
      const aKeeper = a.label && a.label.includes('keeper');
      const bKeeper = b.label && b.label.includes('keeper');
      if (aKeeper && !bKeeper) return -1;
      if (!aKeeper && bKeeper) return 1;
      return (a.round || 99) - (b.round || 99);
    });
    
    const keepers = players.filter(p => p.label && (p.label.includes('keeper') || p.label.includes('NA')));
    
    console.log(`\n  === t.${teamNum}: ${TEAM_NAMES[teamNum]} (${players.length} players, ${keepers.length} keepers) ===`);
    
    // Show keepers
    for (const p of keepers) {
      console.log(`    ⭐ ${p.name}: ${p.label} — Rd ${p.round} (ECR ${p.ecr || 'N/A'})`);
    }
    
    // Show top non-keeper by ECR
    const nonKeepers = players.filter(p => !p.label?.includes('keeper') && !p.label?.includes('NA'));
    const topNonKeepers = nonKeepers.sort((a, b) => (a.ecr || 999) - (b.ecr || 999)).slice(0, 3);
    if (topNonKeepers.length > 0) {
      console.log(`    Top non-keepers:`);
      for (const p of topNonKeepers) {
        console.log(`      ${p.name}: ${p.label} — Rd ${p.round} (ECR ${p.ecr || 'N/A'})`);
      }
    }
    
    teamSummaries.push({
      team: teamNum,
      name: TEAM_NAMES[teamNum],
      total: players.length,
      keepers: keepers.length,
      keeperNames: keepers.map(k => k.name),
    });
  }
  
  console.log(`\n  TOTAL: ${totalPlayers} players across ${sortedTeams.length} teams`);
  
  // Flag anomalies
  console.log('\n  === ANOMALY CHECK ===');
  
  // Check for players on wrong teams (Chris's key players)
  const chrisPlayers = ['Yordan Alvarez', 'Cal Raleigh', 'Chris Sale', 'Zack Wheeler', 'Jackson Merrill', 'Cody Bellinger'];
  const chrisTeam = teams['1'] || [];
  for (const name of chrisPlayers) {
    const found = chrisTeam.find(p => p.name === name);
    if (!found) {
      console.log(`    ⚠️ ${name} NOT on Chris's team (t.1)!`);
    }
  }
  
  // Check Ragans/Díaz labels
  const pudgeTeam = teams['3'] || [];
  const ragans = pudgeTeam.find(p => p.name === 'Cole Ragans');
  if (ragans && ragans.label !== 'Trade — Rd 2') {
    console.log(`    ⚠️ Ragans label wrong: "${ragans.label}" (should be "Trade — Rd 2")`);
  }
  
  const diaz = pudgeTeam.find(p => p.name === 'Yandy Díaz');
  // Díaz went to Pudge in Trade 12b but was NOT a keeper — label should be appropriate
  
  // Alonso should be on Bob
  const bobTeam = teams['9'] || [];
  const alonso = bobTeam.find(p => p.name === 'Pete Alonso');
  if (!alonso) {
    console.log(`    ⚠️ Pete Alonso NOT on Bob's team (t.9)!`);
  }
  
  // Riley should be on Bob
  const riley = bobTeam.find(p => p.name === 'Austin Riley');
  if (!riley) {
    console.log(`    ⚠️ Austin Riley NOT on Bob's team (t.9)!`);
  }
  
  return teamSummaries;
}

// =====================================================================
// MAIN
// =====================================================================
async function main() {
  console.log('🔧 FRESH ROSTER FIX — Starting from Yahoo 2025 baseline');
  console.log('='.repeat(60));
  
  // Step 1: Load Yahoo baseline
  const yahooMap = await step1_loadYahooBaseline();
  
  // Step 1b: Reset DB to match Yahoo
  const notFoundInYahoo = await step1b_resetTeamAssignments(yahooMap);
  
  // Step 2: Apply offseason trades
  await step2_applyTrades();
  
  // Steps 3 & 4: Set keeper labels + ECR rounds
  await step3_4_setKeeperLabels();
  
  // Step 5: Verify
  const summaries = await step5_verify();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ FRESH ROSTER FIX COMPLETE');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
