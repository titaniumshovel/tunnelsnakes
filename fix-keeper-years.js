#!/usr/bin/env node

// Fix keeper year data in The Sandlot fantasy baseball database
// Cross-reference 2025 keeper data with current 2026 roster players

const fs = require('fs');

// Load environment variables manually
function loadEnv() {
  const envPath = '.env.local';
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    });
  }
}

loadEnv();

// 2025 keeper data from the reference image
const KEEPERS_2025 = {
  // Team mapping: displayName -> yahooTeamKey
  'Bob': '469.l.24701.t.9',      // Runs-N-Roses
  'Pudge': '469.l.24701.t.3',    // Bleacher Creatures  
  'Sean': '469.l.24701.t.4',     // ClutchHutch
  'Chris': '469.l.24701.t.1',    // Tunnel Snakes
  'Alex': '469.l.24701.t.2',     // Alex in Chains
  'Web': '469.l.24701.t.7',      // Lollygaggers
  'Tom': '469.l.24701.t.5',      // Goin' Yahdgoats
  'Greasy': '469.l.24701.t.6',   // Greasy Cap Advisors
  'Mike': '469.l.24701.t.10',    // The Dirty Farm
  'Nick': '469.l.24701.t.8',     // Red Stagz
  'Tyler': '469.l.24701.t.12',   // I Fielder Boobs
  'Thomas': '469.l.24701.t.11',  // Lake Monsters
};

// 2025 keeper data: playerName -> { originalTeam, yearsKept, round }
const KEEPER_DATA_2025 = {
  // Bob
  'Bobby Witt Jr.': { originalTeam: 'Bob', yearsKept: 3, round: 1 },
  'Gunnar Henderson': { originalTeam: 'Bob', yearsKept: 2, round: 2 },
  'Julio Rodriguez': { originalTeam: 'Bob', yearsKept: 3, round: 3 },
  'Adley Rutschman': { originalTeam: 'Bob', yearsKept: 3, round: 4 },
  'Cody Bellinger': { originalTeam: 'Bob', yearsKept: 2, round: 5 },
  'Ceddanne Rafaela': { originalTeam: 'Bob', yearsKept: 1, round: 23 },
  
  // Pudge
  'Francisco Lindor': { originalTeam: 'Pudge', yearsKept: 3, round: 2 },
  'Jose Altuve': { originalTeam: 'Pudge', yearsKept: 4, round: 5 },
  'Blake Snell': { originalTeam: 'Pudge', yearsKept: 2, round: 6 },
  'Kyle Schwarber': { originalTeam: 'Pudge', yearsKept: 1, round: 7 },
  'Salvador Perez': { originalTeam: 'Pudge', yearsKept: 1, round: 13 },
  'Josh Naylor': { originalTeam: 'Pudge', yearsKept: 1, round: 17 },
  
  // Sean
  'Elly De La Cruz': { originalTeam: 'Sean', yearsKept: 2, round: 1 },
  'Tarik Skubal': { originalTeam: 'Sean', yearsKept: 1, round: 2 },
  'Matt Olson': { originalTeam: 'Sean', yearsKept: 4, round: 4 },
  'Corey Seager': { originalTeam: 'Sean', yearsKept: 2, round: 5 },
  'Marcus Semien': { originalTeam: 'Sean', yearsKept: 3, round: 6 },
  'Brent Rooker': { originalTeam: 'Sean', yearsKept: 1, round: 23 },
  
  // Chris
  'Yordan Alvarez': { originalTeam: 'Chris', yearsKept: 4, round: 2 },
  'Zack Wheeler': { originalTeam: 'Chris', yearsKept: 2, round: 3 },
  'Austin Riley': { originalTeam: 'Chris', yearsKept: 4, round: 4 },
  'Pete Alonso': { originalTeam: 'Chris', yearsKept: 4, round: 5 },
  'Chris Sale': { originalTeam: 'Chris', yearsKept: 1, round: 12 },
  'Jackson Merrill': { originalTeam: 'Chris', yearsKept: 1, round: 20 },
  
  // Alex
  'Trea Turner': { originalTeam: 'Alex', yearsKept: 5, round: 3 },
  'Rafael Devers': { originalTeam: 'Alex', yearsKept: 4, round: 4 },
  'Manny Machado': { originalTeam: 'Alex', yearsKept: 3, round: 5 },
  'Wyatt Langford': { originalTeam: 'Alex', yearsKept: 1, round: 9 },
  'Jarren Duran': { originalTeam: 'Alex', yearsKept: 1, round: 13 },
  'Lawrence Butler': { originalTeam: 'Alex', yearsKept: 1, round: 22 },
  
  // Web
  'Fernando Tatis Jr.': { originalTeam: 'Web', yearsKept: 5, round: 1 },
  'Vladimir Guerrero Jr.': { originalTeam: 'Web', yearsKept: 4, round: 2 },
  'Emmanuel Clase': { originalTeam: 'Web', yearsKept: 1, round: 7 },
  'Paul Skenes': { originalTeam: 'Web', yearsKept: 1, round: 13 },
  'Willy Adames': { originalTeam: 'Web', yearsKept: 1, round: 14 },
  'Jackson Chourio': { originalTeam: 'Web', yearsKept: 1, round: 23 },
  
  // Tom
  'Logan Gilbert': { originalTeam: 'Tom', yearsKept: 1, round: 4 },
  'CJ Abrams': { originalTeam: 'Tom', yearsKept: 2, round: 5 },
  'Dylan Cease': { originalTeam: 'Tom', yearsKept: 1, round: 9 },
  'Mike Trout': { originalTeam: 'Tom', yearsKept: 5, round: 12 },
  'Bryce Miller': { originalTeam: 'Tom', yearsKept: 1, round: 17 },
  'Matt Chapman': { originalTeam: 'Tom', yearsKept: 1, round: 23 },
  
  // Greasy
  'Kyle Tucker': { originalTeam: 'Greasy', yearsKept: 5, round: 1 },
  'Corbin Carroll': { originalTeam: 'Greasy', yearsKept: 2, round: 2 },
  'Ronald Acuña Jr.': { originalTeam: 'Greasy', yearsKept: 5, round: 3 },
  'Jazz Chisholm Jr.': { originalTeam: 'Greasy', yearsKept: 3, round: 4 },
  'James Wood': { originalTeam: 'Greasy', yearsKept: 1, round: 6 },
  'Ketel Marte': { originalTeam: 'Greasy', yearsKept: 1, round: 10 },
  'Riley Greene': { originalTeam: 'Greasy', yearsKept: 1, round: 23 },
  
  // Mike
  'Shohei Ohtani': { originalTeam: 'Mike', yearsKept: 4, round: 1 }, // Batter version
  'Juan Soto': { originalTeam: 'Mike', yearsKept: 5, round: 2 },
  'Mookie Betts': { originalTeam: 'Mike', yearsKept: 5, round: 3 },
  'Junior Caminero': { originalTeam: 'Mike', yearsKept: 1, round: 8 },
  'Garrett Crochet': { originalTeam: 'Mike', yearsKept: 1, round: 17 },
  'Jacob deGrom': { originalTeam: 'Mike', yearsKept: 1, round: 18 },
  
  // Nick
  'Aaron Judge': { originalTeam: 'Nick', yearsKept: 4, round: 1 },
  'José Ramírez': { originalTeam: 'Nick', yearsKept: 3, round: 2 },
  'Bryce Harper': { originalTeam: 'Nick', yearsKept: 5, round: 3 },
  'Freddie Freeman': { originalTeam: 'Nick', yearsKept: 3, round: 4 },
  'Corbin Burnes': { originalTeam: 'Nick', yearsKept: 5, round: 5 },
};

// Known trades for 2026 season
const KNOWN_TRADES = {
  'Kyle Schwarber': { from: 'Pudge', to: 'Alex' },
  'Wyatt Langford': { from: 'Alex', to: 'Pudge' }
};

async function fetchFromSupabase(endpoint, params = '') {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${endpoint}${params}`;
  const response = await fetch(url, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  
  return await response.json();
}

async function updateRosterPlayer(id, updates) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/my_roster_players?id=eq.${id}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
}

function normalizePlayerName(name) {
  // Handle common name variations
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace('Jr.', 'Jr')
    .replace('Shohei Ohtani, Batter', 'Shohei Ohtani')
    .replace('Shohei Ohtani, Pitcher', 'Shohei Ohtani'); 
}

function getManagerNameByTeamKey(teamKey) {
  for (const [manager, key] of Object.entries(KEEPERS_2025)) {
    if (key === teamKey) return manager;
  }
  return 'Unknown';
}

async function main() {
  console.log('🔍 Fetching all roster players with keeper cost data...');
  
  // Get all players with keeper cost labels
  const rosterPlayers = await fetchFromSupabase(
    'my_roster_players', 
    '?select=id,player_id,yahoo_team_key,keeper_cost_round,keeper_cost_label,players(full_name,fantasypros_ecr)&keeper_cost_label=not.is.null&limit=1000'
  );
  
  console.log(`Found ${rosterPlayers.length} players with keeper cost data`);
  
  let updatedPlayers = [];
  let anomalies = [];
  
  for (const player of rosterPlayers) {
    const playerName = normalizePlayerName(player.players.full_name);
    const currentTeam = getManagerNameByTeamKey(player.yahoo_team_key);
    const keeperData = KEEPER_DATA_2025[playerName];
    
    // Check if this player was kept in 2025
    if (!keeperData) {
      // Player was NOT kept in 2025, so their current label should be correct
      continue;
    }
    
    // Player WAS kept in 2025, so they should be at least a 2nd year keeper in 2026
    const newYearsKept = keeperData.yearsKept + 1;
    let expectedLabel = `${newYearsKept === 2 ? '2nd' : newYearsKept === 3 ? '3rd' : newYearsKept === 4 ? '4th' : newYearsKept === 5 ? '5th' : newYearsKept === 6 ? '6th' : `${newYearsKept}th`} yr keeper — ECR`;
    
    // Calculate ECR round (ceil(ecr_rank / 12))
    const ecrRank = player.players.fantasypros_ecr;
    let newEcrRound = ecrRank ? Math.ceil(ecrRank / 12) : 23; // Default to 23 if no ECR
    
    // Cap at round 23 (league max)
    if (newEcrRound > 23) newEcrRound = 23;
    
    // Check if this is correct
    const currentLabel = player.keeper_cost_label;
    const currentRound = player.keeper_cost_round;
    
    // Check for trades
    const trade = KNOWN_TRADES[playerName];
    let wasTraded = false;
    if (trade && currentTeam !== keeperData.originalTeam) {
      wasTraded = true;
      // Player was traded, but keeper cost logic stays the same
    }
    
    // Check if update is needed
    if (currentLabel !== expectedLabel || currentRound !== newEcrRound) {
      console.log(`🔄 Updating ${playerName}:`);
      console.log(`   Team: ${keeperData.originalTeam}${wasTraded ? ` → ${currentTeam} (traded)` : ` (${currentTeam})`}`);
      console.log(`   Old: "${currentLabel}" - Rd ${currentRound}`);
      console.log(`   New: "${expectedLabel}" - Rd ${newEcrRound}`);
      console.log(`   ECR: ${ecrRank || 'N/A'}`);
      
      // Update the record
      try {
        await updateRosterPlayer(player.id, {
          keeper_cost_label: expectedLabel,
          keeper_cost_round: newEcrRound
        });
        
        updatedPlayers.push({
          name: playerName,
          team: currentTeam,
          wasTraded,
          oldLabel: currentLabel,
          newLabel: expectedLabel,
          oldRound: currentRound,
          newRound: newEcrRound,
          ecr: ecrRank
        });
      } catch (error) {
        console.error(`❌ Failed to update ${playerName}:`, error.message);
        anomalies.push(`Failed to update ${playerName}: ${error.message}`);
      }
    } else {
      console.log(`✅ ${playerName} (${currentTeam}) already correct: "${currentLabel}" - Rd ${currentRound}`);
    }
  }
  
  // Check for missing players (in 2025 keepers but not found in current rosters)
  console.log('\n🔍 Checking for players kept in 2025 but not found in current rosters...');
  for (const [playerName, data] of Object.entries(KEEPER_DATA_2025)) {
    const found = rosterPlayers.find(p => normalizePlayerName(p.players.full_name) === playerName);
    if (!found) {
      anomalies.push(`Player "${playerName}" was kept by ${data.originalTeam} in 2025 but not found in current 2026 rosters`);
    }
  }
  
  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 KEEPER YEAR UPDATE REPORT');
  console.log('='.repeat(60));
  console.log(`Updated players: ${updatedPlayers.length}`);
  console.log(`Anomalies found: ${anomalies.length}`);
  
  if (updatedPlayers.length > 0) {
    console.log('\n🔄 UPDATED PLAYERS:');
    for (const player of updatedPlayers) {
      console.log(`• ${player.name} (${player.team}${player.wasTraded ? ', traded' : ''})`);
      console.log(`  ${player.oldLabel} → ${player.newLabel}`);
      console.log(`  Rd ${player.oldRound} → Rd ${player.newRound} (ECR: ${player.ecr || 'N/A'})`);
    }
  }
  
  if (anomalies.length > 0) {
    console.log('\n⚠️ ANOMALIES:');
    for (const anomaly of anomalies) {
      console.log(`• ${anomaly}`);
    }
  }
  
  // Save detailed report for Telegram
  const report = {
    timestamp: new Date().toISOString(),
    updatedCount: updatedPlayers.length,
    updatedPlayers,
    anomalies
  };
  
  fs.writeFileSync('/tmp/keeper-update-report.json', JSON.stringify(report, null, 2));
  console.log('\n📋 Detailed report saved to /tmp/keeper-update-report.json');
}

main().catch(console.error);