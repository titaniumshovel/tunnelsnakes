#!/usr/bin/env node

// Update keeper costs for 2026 based on 2025 keepers reference
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

// 2025 keeper data: playerName -> { originalTeam, yearsKept, round }
const KEEPER_DATA_2025 = {
  // Bob
  'Bobby Witt Jr.': { originalTeam: 'Bob', yearsKept: 3, round: 1 },
  'Gunnar Henderson': { originalTeam: 'Bob', yearsKept: 2, round: 2 },
  'Julio Rodriguez': { originalTeam: 'Bob', yearsKept: 3, round: 3 },
  'Adley Rutschman': { originalTeam: 'Bob', yearsKept: 3, round: 4 },
  'Cody Bellinger': { originalTeam: 'Bob', yearsKept: 2, round: 5 },
  'Ceddanne Rafaela': { originalTeam: 'Bob', yearsKept: 1, round: 23 },
  // Bob's NA keepers: Walter Jenkins, Jackson Jobe, Thomas White (handle separately)
  
  // Pudge
  'Francisco Lindor': { originalTeam: 'Pudge', yearsKept: 3, round: 2 },
  'Jose Altuve': { originalTeam: 'Pudge', yearsKept: 4, round: 5 },
  'Blake Snell': { originalTeam: 'Pudge', yearsKept: 2, round: 6 },
  'Kyle Schwarber': { originalTeam: 'Pudge', yearsKept: 1, round: 7 },  // TRADED to Alex
  'Salvador Perez': { originalTeam: 'Pudge', yearsKept: 1, round: 13 },
  'Josh Naylor': { originalTeam: 'Pudge', yearsKept: 1, round: 17 },
  // Pudge's NA: Luisangel Acuña
  
  // Sean  
  'Elly De La Cruz': { originalTeam: 'Sean', yearsKept: 2, round: 1 },
  'Tarik Skubal': { originalTeam: 'Sean', yearsKept: 1, round: 2 },
  'Matt Olson': { originalTeam: 'Sean', yearsKept: 4, round: 4 },  // TRADED to Alex
  'Corey Seager': { originalTeam: 'Sean', yearsKept: 2, round: 5 },
  'Marcus Semien': { originalTeam: 'Sean', yearsKept: 3, round: 6 },
  'Brent Rooker': { originalTeam: 'Sean', yearsKept: 1, round: 23 },
  // Sean's NA: Roman Anthony, Matt Shaw, Carson Williams
  
  // Chris
  'Yordan Alvarez': { originalTeam: 'Chris', yearsKept: 4, round: 2 },
  'Zack Wheeler': { originalTeam: 'Chris', yearsKept: 2, round: 3 },
  'Austin Riley': { originalTeam: 'Chris', yearsKept: 4, round: 4 },  // TRADED to Bob
  'Pete Alonso': { originalTeam: 'Chris', yearsKept: 4, round: 5 },   // TRADED to Bob
  'Chris Sale': { originalTeam: 'Chris', yearsKept: 1, round: 12 },
  'Jackson Merrill': { originalTeam: 'Chris', yearsKept: 1, round: 20 },
  // Chris's NA: Marcelo Mayer, Noah Schultz
  
  // Alex
  'Trea Turner': { originalTeam: 'Alex', yearsKept: 5, round: 3 },    // TRADED to Tyler
  'Rafael Devers': { originalTeam: 'Alex', yearsKept: 4, round: 4 },
  'Manny Machado': { originalTeam: 'Alex', yearsKept: 3, round: 5 },  // TRADED to Nick
  'Wyatt Langford': { originalTeam: 'Alex', yearsKept: 1, round: 9 }, // TRADED to Pudge
  'Jarren Duran': { originalTeam: 'Alex', yearsKept: 1, round: 13 },  // TRADED to Tom
  'Lawrence Butler': { originalTeam: 'Alex', yearsKept: 1, round: 22 },
  // Alex's NA: Max Clark, Colt Emerson
  
  // Web
  'Fernando Tatis Jr.': { originalTeam: 'Web', yearsKept: 5, round: 1 },
  'Vladimir Guerrero Jr.': { originalTeam: 'Web', yearsKept: 4, round: 2 },
  'Emmanuel Clase': { originalTeam: 'Web', yearsKept: 1, round: 7 },
  'Paul Skenes': { originalTeam: 'Web', yearsKept: 1, round: 13 },
  'Willy Adames': { originalTeam: 'Web', yearsKept: 1, round: 14 },
  'Jackson Chourio': { originalTeam: 'Web', yearsKept: 1, round: 23 },
  // Web's NA: Colson Montgomery, Jordan Walker, Dylan Crews
  
  // Tom
  'Logan Gilbert': { originalTeam: 'Tom', yearsKept: 1, round: 4 },
  'CJ Abrams': { originalTeam: 'Tom', yearsKept: 2, round: 5 },
  'Dylan Cease': { originalTeam: 'Tom', yearsKept: 1, round: 9 },
  'Mike Trout': { originalTeam: 'Tom', yearsKept: 5, round: 12 },     // Contract reset per Chris
  'Bryce Miller': { originalTeam: 'Tom', yearsKept: 1, round: 17 },
  'Matt Chapman': { originalTeam: 'Tom', yearsKept: 1, round: 23 },
  // Tom's NA: Samuel Basallo, Jordan Lawlar
  
  // Greasy
  'Kyle Tucker': { originalTeam: 'Greasy', yearsKept: 5, round: 1 },
  'Corbin Carroll': { originalTeam: 'Greasy', yearsKept: 2, round: 2 },
  'Ronald Acuña Jr.': { originalTeam: 'Greasy', yearsKept: 5, round: 3 },
  'Jazz Chisholm Jr.': { originalTeam: 'Greasy', yearsKept: 3, round: 4 }, // TRADED to Sean
  'James Wood': { originalTeam: 'Greasy', yearsKept: 1, round: 6 },
  'Ketel Marte': { originalTeam: 'Greasy', yearsKept: 1, round: 10 },
  'Riley Greene': { originalTeam: 'Greasy', yearsKept: 1, round: 23 },
  // Greasy's NA: Marco Luicano, Druw Jones
  
  // Mike
  'Shohei Ohtani': { originalTeam: 'Mike', yearsKept: 4, round: 1 },  // Batter version
  'Juan Soto': { originalTeam: 'Mike', yearsKept: 5, round: 2 },
  'Mookie Betts': { originalTeam: 'Mike', yearsKept: 5, round: 3 },    // TRADED to Nick
  'Junior Caminero': { originalTeam: 'Mike', yearsKept: 1, round: 8 },
  'Garrett Crochet': { originalTeam: 'Mike', yearsKept: 1, round: 17 },
  'Jacob deGrom': { originalTeam: 'Mike', yearsKept: 1, round: 18 },
  // Mike's NA: Kristian Campbel, Ethan Salas, Heston Kjerstad
  
  // Nick  
  'Aaron Judge': { originalTeam: 'Nick', yearsKept: 4, round: 1 },
  'José Ramírez': { originalTeam: 'Nick', yearsKept: 3, round: 2 },
  'Bryce Harper': { originalTeam: 'Nick', yearsKept: 5, round: 3 },
  'Freddie Freeman': { originalTeam: 'Nick', yearsKept: 3, round: 4 },
  'Corbin Burnes': { originalTeam: 'Nick', yearsKept: 5, round: 5 },
  // Nick's NA: Jasson Dominguez, Spencer Jones
};

// Team mapping
const TEAM_MAPPING = {
  '469.l.24701.t.1': 'Bob',
  '469.l.24701.t.2': 'Alex', 
  '469.l.24701.t.3': 'Pudge',
  '469.l.24701.t.4': 'Sean',
  '469.l.24701.t.5': 'Nick',
  '469.l.24701.t.6': 'Chris',
  '469.l.24701.t.7': 'Tom',
  '469.l.24701.t.8': 'Greasy',
  '469.l.24701.t.9': 'Web',
  '469.l.24701.t.10': 'Mike',
  '469.l.24701.t.12': 'Tyler'
};

// Special cases (contract resets, known issues)
const SPECIAL_CASES = {
  'Mike Trout': { resetToFirstYear: true, reason: 'Dropped mid-year, re-drafted by Bob at Rd 19' }
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

async function updatePlayer(id, updates) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/players?id=eq.${id}`;
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
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace('Jr.', 'Jr')
    .replace('Shohei Ohtani, Batter', 'Shohei Ohtani')
    .replace('Shohei Ohtani, Pitcher', 'Shohei Ohtani'); 
}

function getYearLabel(years) {
  if (years === 2) return '2nd';
  if (years === 3) return '3rd';  
  if (years >= 4 && years <= 20) return years + 'th';
  if (years === 21) return '21st';
  if (years === 22) return '22nd';
  if (years === 23) return '23rd';
  return years + 'th';
}

async function main() {
  console.log('🔍 Fetching all roster players...');
  
  const rosterPlayers = await fetchFromSupabase(
    'my_roster_players', 
    '?select=id,yahoo_team_key,keeper_cost_round,keeper_cost_label,players(id,full_name,fantasypros_ecr)&limit=1000'
  );
  
  console.log(`Found ${rosterPlayers.length} roster players`);
  
  let updatedPlayers = [];
  let anomalies = [];
  
  for (const rosterPlayer of rosterPlayers) {
    const playerName = normalizePlayerName(rosterPlayer.players.full_name);
    const currentTeam = TEAM_MAPPING[rosterPlayer.yahoo_team_key];
    const keeperData = KEEPER_DATA_2025[playerName];
    const specialCase = SPECIAL_CASES[playerName];
    
    let newLabel = null;
    let newRound = null;
    
    if (keeperData && !specialCase?.resetToFirstYear) {
      // Player was kept in 2025, so they are at least 2nd year keeper in 2026
      const newYearsKept = keeperData.yearsKept + 1;
      newLabel = `${getYearLabel(newYearsKept)} yr keeper — ECR`;
      
      // Calculate ECR round (ceil(ecr_rank / 12))
      const ecrRank = rosterPlayer.players.fantasypros_ecr;
      newRound = ecrRank ? Math.ceil(ecrRank / 12) : 23; // Default to 23 if no ECR
      
      // Cap at round 23 (league max)
      if (newRound > 23) newRound = 23;
      
    } else {
      // Player was NOT kept in 2025 OR has contract reset
      // They are 1st year keepers - need to determine if drafted, traded, or FA
      
      if (specialCase?.resetToFirstYear) {
        // Special case like Mike Trout
        newLabel = "FA — Rd 23";  // Per Chris confirmation
        newRound = 23;
      } else {
        // Need to determine if they were drafted, traded, or FA pickup
        // For now, default to "Drafted Rd X" - would need draft data to be more specific
        const ecrRank = rosterPlayer.players.fantasypros_ecr;
        newRound = ecrRank ? Math.ceil(ecrRank / 12) : 23;
        if (newRound > 23) newRound = 23;
        newLabel = `Drafted Rd ${newRound}`;
      }
    }
    
    // Check if update is needed
    const currentLabel = rosterPlayer.keeper_cost_label;
    const currentRound = rosterPlayer.keeper_cost_round;
    
    if (currentLabel !== newLabel || currentRound !== newRound) {
      console.log(`🔄 Updating ${playerName} (${currentTeam}):`);
      console.log(`   Old: "${currentLabel}" - Rd ${currentRound}`);
      console.log(`   New: "${newLabel}" - Rd ${newRound}`);
      console.log(`   ECR: ${rosterPlayer.players.fantasypros_ecr || 'N/A'}`);
      
      try {
        // Update my_roster_players table
        await updateRosterPlayer(rosterPlayer.id, {
          keeper_cost_label: newLabel,
          keeper_cost_round: newRound
        });
        
        // Update players table
        await updatePlayer(rosterPlayer.players.id, {
          keeper_cost_label: newLabel,
          keeper_cost_round: newRound
        });
        
        updatedPlayers.push({
          name: playerName,
          team: currentTeam,
          oldLabel: currentLabel,
          newLabel: newLabel,
          oldRound: currentRound,
          newRound: newRound,
          ecr: rosterPlayer.players.fantasypros_ecr
        });
        
      } catch (error) {
        console.error(`❌ Failed to update ${playerName}:`, error.message);
        anomalies.push(`Failed to update ${playerName}: ${error.message}`);
      }
    } else {
      console.log(`✅ ${playerName} (${currentTeam}) already correct: "${currentLabel}" - Rd ${currentRound}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 KEEPER COST UPDATE REPORT');
  console.log('='.repeat(60));
  console.log(`Updated players: ${updatedPlayers.length}`);
  console.log(`Anomalies: ${anomalies.length}`);
  
  if (updatedPlayers.length > 0) {
    console.log('\n🔄 UPDATED PLAYERS:');
    for (const player of updatedPlayers) {
      console.log(`• ${player.name} (${player.team})`);
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
  
  console.log('\n📋 Steps 3 & 4 complete!');
}

main().catch(console.error);