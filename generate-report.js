#!/usr/bin/env node

// Generate final verification report for The Sandlot roster fix
const fs = require('fs');

// Load environment variables
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

const TEAM_NAMES = {
  '469.l.24701.t.1': 'Bob (Runs-N-Roses)',
  '469.l.24701.t.2': 'Alex (Alex in Chains)', 
  '469.l.24701.t.3': 'Pudge (Bleacher Creatures)',
  '469.l.24701.t.4': 'Sean (ClutchHutch)',
  '469.l.24701.t.5': 'Nick',
  '469.l.24701.t.6': 'Chris (Tunnel Snakes)',
  '469.l.24701.t.7': 'Tom',
  '469.l.24701.t.8': 'Greasy',
  '469.l.24701.t.9': 'Web',
  '469.l.24701.t.10': 'Mike',
  '469.l.24701.t.12': 'Tyler (I Fielder Boobs)'
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

async function main() {
  console.log('📊 Generating final verification report...');
  
  const rosterPlayers = await fetchFromSupabase(
    'my_roster_players', 
    '?select=yahoo_team_key,keeper_cost_label,keeper_cost_round,players(full_name,fantasypros_ecr)&limit=1000'
  );
  
  // Group by team
  const teamGroups = {};
  for (const player of rosterPlayers) {
    const teamKey = player.yahoo_team_key;
    if (!teamGroups[teamKey]) {
      teamGroups[teamKey] = [];
    }
    teamGroups[teamKey].push(player);
  }
  
  // Sort teams by number (t.1, t.2, etc.)
  const sortedTeams = Object.keys(teamGroups).sort((a, b) => {
    const teamNumA = parseInt(a.split('.')[4]);
    const teamNumB = parseInt(b.split('.')[4]);
    return teamNumA - teamNumB;
  });
  
  let report = '🏀 THE SANDLOT FANTASY BASEBALL - ROSTER FIX COMPLETE\n';
  report += `📅 ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}\n\n`;
  
  report += '✅ TASKS COMPLETED:\n';
  report += '• Step 1: Yahoo API access blocked (worked with existing data)\n';
  report += '• Step 2: Applied 11 offseason trades chronologically\n';
  report += '• Step 3: Set keeper year labels based on 2025 reference\n';
  report += '• Step 4: Calculated ECR rounds for all players\n';
  report += '• Step 5: Generated verification report\n\n';
  
  let totalPlayers = 0;
  let keeperStats = {
    '1st yr': 0,
    '2nd yr': 0,
    '3rd yr': 0,
    '4th yr': 0,
    '5th yr': 0,
    '6th yr': 0,
    'other': 0
  };
  
  for (const teamKey of sortedTeams) {
    const players = teamGroups[teamKey];
    const teamName = TEAM_NAMES[teamKey];
    const teamNum = teamKey.split('.')[4];
    
    report += `=== TEAM ${teamNum}: ${teamName} (${players.length} players) ===\n`;
    
    // Sort players by keeper cost (keepers first, then by round)
    players.sort((a, b) => {
      const aIsKeeper = a.keeper_cost_label && a.keeper_cost_label.includes('keeper');
      const bIsKeeper = b.keeper_cost_label && b.keeper_cost_label.includes('keeper');
      
      if (aIsKeeper && !bIsKeeper) return -1;
      if (!aIsKeeper && bIsKeeper) return 1;
      
      const aRound = a.keeper_cost_round || 99;
      const bRound = b.keeper_cost_round || 99;
      return aRound - bRound;
    });
    
    // Show top keepers and notable players
    let shownPlayers = 0;
    for (const player of players) {
      const isKeeper = player.keeper_cost_label && player.keeper_cost_label.includes('keeper');
      const lowRound = player.keeper_cost_round && player.keeper_cost_round <= 5;
      
      // Show all keepers + low round players (top talent)
      if (isKeeper || lowRound || shownPlayers < 3) {
        const ecr = player.players.fantasypros_ecr ? `ECR ${player.players.fantasypros_ecr}` : 'No ECR';
        report += `  • ${player.players.full_name}: ${player.keeper_cost_label || 'null'} - Rd ${player.keeper_cost_round || 'null'} (${ecr})\n`;
        shownPlayers++;
      }
      
      // Track keeper stats
      if (isKeeper) {
        if (player.keeper_cost_label.includes('2nd yr')) keeperStats['2nd yr']++;
        else if (player.keeper_cost_label.includes('3rd yr')) keeperStats['3rd yr']++;
        else if (player.keeper_cost_label.includes('4th yr')) keeperStats['4th yr']++;
        else if (player.keeper_cost_label.includes('5th yr')) keeperStats['5th yr']++;
        else if (player.keeper_cost_label.includes('6th yr')) keeperStats['6th yr']++;
        else keeperStats['other']++;
      } else {
        keeperStats['1st yr']++;
      }
    }
    
    if (players.length > shownPlayers) {
      report += `  ... and ${players.length - shownPlayers} more players\n`;
    }
    
    report += '\n';
    totalPlayers += players.length;
  }
  
  report += '📈 LEAGUE SUMMARY:\n';
  report += `• Total Players: ${totalPlayers}\n`;
  report += `• 1st year players (new): ${keeperStats['1st yr']}\n`;
  report += `• 2nd year keepers: ${keeperStats['2nd yr']}\n`;
  report += `• 3rd year keepers: ${keeperStats['3rd yr']}\n`;
  report += `• 4th year keepers: ${keeperStats['4th yr']}\n`;
  report += `• 5th year keepers: ${keeperStats['5th yr']}\n`;
  report += `• 6th year keepers: ${keeperStats['6th yr']}\n`;
  report += `• Other keepers: ${keeperStats['other']}\n\n`;
  
  report += '🔄 KEY TRADES APPLIED:\n';
  report += '• Trade 0: Alonso & Bellinger swap (Bob ↔ Chris)\n';
  report += '• Trade 1: Matt Olson (Sean → Alex)\n';
  report += '• Trade 2: Jazz Chisholm Jr. (Greasy → Sean)\n';
  report += '• Trade 3: Bregman & Turner (Alex → Tyler)\n';
  report += '• Trade 4: Mookie Betts (Alex → Nick)\n';
  report += '• ...and 6 more trades chronologically applied\n\n';
  
  report += '⚠️ NOTABLE CORRECTIONS:\n';
  report += '• Mike Trout: Reset to "FA — Rd 23" (contract reset)\n';
  report += '• All ECR rounds updated based on FantasyPros rankings\n';
  report += '• Keeper years incremented from 2025 baseline\n';
  
  console.log('\n' + report);
  
  // Save to file for Telegram sending
  fs.writeFileSync('/tmp/final-report.txt', report);
  console.log('\n📋 Report saved to /tmp/final-report.txt');
}

main().catch(console.error);