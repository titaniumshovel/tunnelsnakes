'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users } from 'lucide-react'
import draftBoardData from '@/data/draft-board.json'
import { MANAGERS } from '@/data/managers'

type DraftPick = {
  slot: number
  originalOwner: string
  currentOwner: string
  traded: boolean
  path?: string[]
}

type DraftBoard = {
  draftOrder: string[]
  rounds: number
  naRounds: number[]
  trades: Array<{ description: string; source: string }>
  picks: Record<string, DraftPick[]>
}

type KeeperInfo = {
  playerName: string
  keeperStatus: 'keeping' | 'keeping-7th' | 'keeping-na'
  costRound: number
  effectiveRound: number
  stackedFrom: number | null
}

const TEAM_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Pudge:  { bg: 'bg-red-100',      border: 'border-red-400',      text: 'text-red-800',      dot: 'bg-red-500' },
  Nick:   { bg: 'bg-blue-100',     border: 'border-blue-400',     text: 'text-blue-800',     dot: 'bg-blue-500' },
  Web:    { bg: 'bg-green-100',    border: 'border-green-400',    text: 'text-green-800',    dot: 'bg-green-500' },
  Tom:    { bg: 'bg-yellow-100',   border: 'border-yellow-400',   text: 'text-yellow-800',   dot: 'bg-yellow-500' },
  Tyler:  { bg: 'bg-purple-100',   border: 'border-purple-400',   text: 'text-purple-800',   dot: 'bg-purple-500' },
  Thomas: { bg: 'bg-pink-100',     border: 'border-pink-400',     text: 'text-pink-800',     dot: 'bg-pink-500' },
  Chris:  { bg: 'bg-amber-100',    border: 'border-amber-400',    text: 'text-amber-800',    dot: 'bg-amber-500' },
  Alex:   { bg: 'bg-orange-100',   border: 'border-orange-400',   text: 'text-orange-800',   dot: 'bg-orange-500' },
  Greasy: { bg: 'bg-cyan-100',     border: 'border-cyan-400',     text: 'text-cyan-800',     dot: 'bg-cyan-500' },
  Bob:    { bg: 'bg-slate-200',    border: 'border-slate-400',    text: 'text-slate-800',    dot: 'bg-slate-500' },
  Mike:   { bg: 'bg-fuchsia-100',  border: 'border-fuchsia-400',  text: 'text-fuchsia-800',  dot: 'bg-fuchsia-500' },
  Sean:   { bg: 'bg-emerald-100',  border: 'border-emerald-400',  text: 'text-emerald-800',  dot: 'bg-emerald-500' },
}

/**
 * Snake-adjust a draft-order slot to the pick-in-round number.
 * In odd rounds, slot N picks Nth. In even rounds, slot N picks (13-N)th.
 * slot = draft order position (1=first in draft order, 12=last)
 * returns: pick position within the round (1=first pick, 12=last pick)
 */
export function snakePickInRound(round: number, slot: number): number {
  return round % 2 === 0 ? 13 - slot : slot
}

/**
 * Get keeper status indicator emoji
 */
function getKeeperStatusIcon(status: KeeperInfo['keeperStatus']): string {
  switch (status) {
    case 'keeping': return '🔒'
    case 'keeping-7th': return '⭐'
    case 'keeping-na': return '🔷'
    default: return '🔒'
  }
}

/**
 * Snake board keepers — maps owner → round → player display info.
 * NA keepers use virtual rounds 24-27 (one per slot).
 */
type SnakeKeeper = {
  first: string       // First name
  last: string        // Last name
  pos: string         // Primary position (CF, SP, C, etc.)
  team: string        // Team abbreviation (NYY, LAD, etc.)
  round: number       // Keeper cost round (for NA: virtual round 24+)
  year?: string       // e.g. "5yr", "1yr"
  isNA?: boolean
  is7th?: boolean
}

const SNAKE_KEEPERS: Record<string, SnakeKeeper[]> = {
  Alex: [
    { round: 2,  first: 'Kyle',   last: 'Schwarber', pos: 'OF', team: 'PHI', year: '2yr' },
    { round: 3,  first: 'Matt',   last: 'Olson',     pos: '1B', team: 'ATL', year: '5yr' },
    { round: 5,  first: 'Roman',  last: 'Anthony',   pos: 'OF', team: 'BOS', year: '1yr', is7th: true },
    { round: 12, first: 'Bryan',  last: 'Woo',       pos: 'SP', team: 'SEA', year: '1yr' },
    { round: 19, first: 'Byron',  last: 'Buxton',    pos: 'OF', team: 'MIN', year: '1yr' },
    { round: 23, first: 'Chase',  last: 'Burns',     pos: 'SP', team: 'CIN', year: '1yr' },
    { round: 23, first: 'Mike',   last: 'Trout',     pos: 'OF', team: 'LAA', year: '1yr' },
    { round: 24, first: 'Max',    last: 'Clark',     pos: 'OF', team: 'DET', isNA: true },
    { round: 25, first: 'Colt',   last: 'Emerson',   pos: 'SS', team: 'SEA', isNA: true },
    { round: 26, first: 'Bryce',  last: 'Eldridge',  pos: '1B', team: 'SF',  isNA: true },
    { round: 27, first: 'Carson', last: 'Benge',     pos: 'OF', team: 'NYM', isNA: true },
  ],
  Mike: [
    { round: 1,  first: 'Shohei',   last: 'Ohtani',          pos: 'DH', team: 'LAD', year: '1yr' },
    { round: 2,  first: 'Juan',     last: 'Soto',            pos: 'OF', team: 'NYM', year: '6yr' },
    { round: 3,  first: 'Junior',   last: 'Caminero',        pos: '3B', team: 'TB',  year: '2yr' },
    { round: 4,  first: 'Garrett',  last: 'Crochet',         pos: 'SP', team: 'BOS', year: '2yr' },
    { round: 5,  first: 'Jacob',    last: 'deGrom',          pos: 'SP', team: 'TEX', year: '2yr' },
    { round: 10, first: 'Jacob',    last: 'Misiorowski',     pos: 'SP', team: 'MIL', year: '1yr', is7th: true },
    { round: 11, first: 'Pete',     last: 'Crow-Armstrong',  pos: 'OF', team: 'CHC', year: '1yr' },
    { round: 24, first: 'Payton',   last: 'Tolle',           pos: 'SP', team: 'BOS', isNA: true },
    { round: 25, first: 'Jonah',    last: 'Tong',            pos: 'SP', team: 'NYM', isNA: true },
    { round: 26, first: 'Parker',   last: 'Messick',         pos: 'SP', team: 'CLE', isNA: true },
    { round: 27, first: 'Nolan',    last: 'McLean',          pos: 'SP', team: 'NYM', isNA: true },
  ],
  Thomas: [
    { round: 17, first: 'Nick',     last: 'Pivetta',         pos: 'SP', team: 'SD',  year: '1yr' },
    { round: 23, first: 'Yandy',    last: 'Díaz',            pos: '1B', team: 'TB',  year: '1yr' },
  ],
  Web: [
    { round: 1,  first: 'Fernando', last: 'Tatis Jr.',    pos: 'OF', team: 'SD',  year: '1yr' },
    { round: 2,  first: 'Paul',     last: 'Skenes',       pos: 'SP', team: 'PIT', year: '2yr' },
    { round: 3,  first: 'Vladimir', last: 'Guerrero Jr.', pos: '1B', team: 'TOR', year: '1yr' },
    { round: 4,  first: 'Jackson',  last: 'Chourio',      pos: 'OF', team: 'MIL', year: '2yr' },
    { round: 15, first: 'Dylan',    last: 'Crews',        pos: 'OF', team: 'WSH', year: '1yr' },
    { round: 16, first: 'Colson',   last: 'Montgomery',   pos: 'SS', team: 'CWS', year: '1yr', is7th: true },
    { round: 22, first: 'Shohei',   last: 'Ohtani',       pos: 'SP', team: 'LAD', year: '1yr' },
    { round: 24, first: 'Konnor',   last: 'Griffin',      pos: 'SS', team: 'PIT', isNA: true },
    { round: 25, first: 'Travis',   last: 'Bazzana',      pos: '2B', team: 'CLE', isNA: true },
    { round: 26, first: 'Kevin',    last: 'McGonigle',    pos: 'SS', team: 'DET', isNA: true },
    { round: 27, first: 'Walker',   last: 'Jenkins',      pos: 'OF', team: 'MIN', isNA: true },
  ],
  Nick: [
    { round: 1,  first: 'Aaron',    last: 'Judge',        pos: 'OF', team: 'NYY', year: '5yr' },
    { round: 2,  first: 'José',     last: 'Ramírez',      pos: '3B', team: 'CLE', year: '4yr' },
    { round: 3,  first: 'Manny',    last: 'Machado',      pos: '3B', team: 'SD',  year: '4yr' },
    { round: 4,  first: 'Bryce',    last: 'Harper',       pos: '1B', team: 'PHI', year: '6yr' },
    { round: 5,  first: 'Mookie',   last: 'Betts',        pos: 'SS', team: 'LAD', year: '6yr' },
    { round: 6,  first: 'Freddie',  last: 'Freeman',      pos: '1B', team: 'LAD', year: '4yr' },
    { round: 23, first: 'Jasson',   last: 'Domínguez',    pos: 'OF', team: 'NYY', year: '1yr', is7th: true },
    { round: 24, first: 'George',   last: 'Lombard Jr.',  pos: '2B', team: 'CLE', isNA: true },
    { round: 25, first: 'Spencer',  last: 'Jones',        pos: 'OF', team: 'NYY', isNA: true },
    { round: 26, first: 'Bubba',    last: 'Chandler',     pos: 'SP', team: 'PIT', isNA: true },
  ],
  Bob: [
    { round: 1,  first: 'Bobby',    last: 'Witt Jr.',     pos: 'SS', team: 'KC',  year: '1yr' },
    { round: 2,  first: 'Julio',    last: 'Rodríguez',    pos: 'OF', team: 'SEA', year: '1yr' },
    { round: 3,  first: 'Pete',     last: 'Alonso',       pos: '1B', team: 'BAL', year: '5yr' },
    { round: 5,  first: 'Austin',   last: 'Riley',        pos: '3B', team: 'ATL', year: '5yr' },
    { round: 18, first: 'Maikel',   last: 'Garcia',       pos: '2B', team: 'KC',  year: '1yr' },
    { round: 23, first: 'Ben',      last: 'Rice',         pos: '1B', team: 'NYY', year: '1yr' },
    { round: 24, first: 'Thomas',   last: 'White',        pos: 'SP', team: 'MIA', isNA: true },
    { round: 25, first: 'Luis',     last: 'Peña',         pos: 'SS', team: 'KC',  isNA: true },
    { round: 26, first: 'Jesús',    last: 'Made',         pos: 'SS', team: 'MIL', isNA: true },
  ],
  Tom: [
    { round: 4,  first: 'Logan',   last: 'Gilbert',    pos: 'SP', team: 'SEA', year: '2yr' },
    { round: 6,  first: 'Jarren',  last: 'Duran',      pos: 'OF', team: 'BOS', year: '2yr' },
    { round: 20, first: 'George',  last: 'Springer',   pos: 'OF', team: 'TOR', year: '1yr' },
    { round: 21, first: 'Jac',     last: 'Caglianone', pos: '1B', team: 'KC',  year: '1yr' },
    { round: 22, first: 'Framber', last: 'Valdez',     pos: 'SP', team: 'DET', year: '1yr' },
    { round: 23, first: 'Hunter',  last: 'Goodman',    pos: 'C',  team: 'COL', year: '1yr' },
    { round: 24, first: 'Samuel',  last: 'Basallo',    pos: 'C',  team: 'BAL', isNA: true },
    { round: 25, first: 'JJ',      last: 'Wetherholt', pos: 'SS', team: 'STL', isNA: true },
    { round: 26, first: 'Owen',    last: 'Caissie',    pos: 'OF', team: 'MIA', isNA: true },
    { round: 27, first: 'Andrew',  last: 'Painter',    pos: 'SP', team: 'PHI', isNA: true },
  ],
  Tyler: [
    { round: 3,  first: 'Trea',      last: 'Turner',      pos: 'SS', team: 'PHI', year: '6yr' },
    { round: 8,  first: 'Christian',  last: 'Yelich',      pos: 'OF', team: 'MIL', year: '1yr' },
    { round: 8,  first: 'Max',        last: 'Fried',       pos: 'SP', team: 'NYY', year: '1yr' },
    { round: 10, first: 'Hunter',     last: 'Brown',       pos: 'SP', team: 'HOU', year: '1yr' },
    { round: 13, first: 'Brice',      last: 'Turang',      pos: '2B', team: 'MIL', year: '1yr' },
    { round: 16, first: 'Taylor',     last: 'Ward',        pos: 'OF', team: 'LAA', year: '1yr' },
  ],
  Greasy: [
    { round: 1,  first: 'Ronald',  last: 'Acuña Jr.',  pos: 'OF', team: 'ATL', year: '1yr' },
    { round: 2,  first: 'Kyle',    last: 'Tucker',     pos: 'OF', team: 'LAD', year: '6yr' },
    { round: 3,  first: 'Gunnar',  last: 'Henderson',  pos: 'SS', team: 'BAL', year: '3yr' },
    { round: 4,  first: 'Corbin',  last: 'Carroll',    pos: 'OF', team: 'ARI', year: '3yr' },
    { round: 5,  first: 'James',   last: 'Wood',       pos: 'OF', team: 'WSH', year: '2yr' },
    { round: 6,  first: 'Ketel',   last: 'Marte',      pos: '2B', team: 'ARI', year: '2yr' },
    { round: 24, first: 'Charlie', last: 'Condon',     pos: '1B', team: 'COL', isNA: true },
    { round: 25, first: 'Druw',    last: 'Jones',      pos: 'OF', team: 'ARI', isNA: true },
    { round: 26, first: 'Harry',   last: 'Ford',       pos: 'C',  team: 'WSH', isNA: true },
  ],
  Sean: [
    { round: 1,  first: 'Elly',        last: 'De La Cruz', pos: 'SS', team: 'CIN', year: '3yr' },
    { round: 2,  first: 'Tarik',       last: 'Skubal',     pos: 'SP', team: 'DET', year: '2yr' },
    { round: 3,  first: 'Nick',        last: 'Kurtz',      pos: '1B', team: 'OAK', year: '1yr', is7th: true },
    { round: 4,  first: 'Jazz',        last: 'Chisholm Jr.', pos: '2B', team: 'NYY', year: '1yr' },
    { round: 5,  first: 'Rafael',      last: 'Devers',     pos: '1B', team: 'SF',  year: '5yr' },
    { round: 6,  first: 'Brent',       last: 'Rooker',     pos: 'OF', team: 'OAK', year: '2yr' },
    { round: 16, first: 'Cristopher',  last: 'Sánchez',    pos: 'SP', team: 'PHI', year: '1yr' },
    { round: 24, first: 'Sebastian',   last: 'Walcott',    pos: 'SS', team: 'TEX', isNA: true },
    { round: 25, first: 'Zyhir',       last: 'Hope',       pos: 'OF', team: 'CLE', isNA: true },
    { round: 26, first: 'Chase',       last: 'DeLauter',   pos: 'OF', team: 'CLE', isNA: true },
  ],
  Pudge: [
    { round: 2,  first: 'Cole',       last: 'Ragans',   pos: 'SP', team: 'KC',  year: '1yr' },
    { round: 3,  first: 'Francisco',  last: 'Lindor',   pos: 'SS', team: 'NYM', year: '4yr' },
    { round: 4,  first: 'Yoshinobu',  last: 'Yamamoto', pos: 'SP', team: 'LAD', year: '1yr' },
    { round: 5,  first: 'Wyatt',      last: 'Langford', pos: 'OF', team: 'TEX', year: '2yr' },
    { round: 6,  first: 'Edwin',      last: 'Díaz',     pos: 'RP', team: 'LAD', year: '1yr' },
    { round: 21, first: 'Luisangel',  last: 'Acuña',    pos: '2B', team: 'CWS', year: '1yr', is7th: true },
    { round: 22, first: 'Jesús',      last: 'Luzardo',  pos: 'SP', team: 'PHI', year: '1yr' },
    { round: 24, first: 'Leo',        last: 'De Vries', pos: 'SS', team: 'OAK', isNA: true },
    { round: 25, first: 'Noah',       last: 'Schultz',  pos: 'SP', team: 'CWS', isNA: true },
  ],
  Chris: [
    { round: 3,  first: 'Yordan',  last: 'Alvarez',   pos: 'OF', team: 'HOU', year: '5yr' },
    { round: 4,  first: 'Chris',   last: 'Sale',      pos: 'SP', team: 'ATL', year: '2yr' },
    { round: 5,  first: 'Jackson', last: 'Merrill',   pos: 'CF', team: 'SD',  year: '2yr' },
    { round: 6,  first: 'Cody',    last: 'Bellinger', pos: 'OF', team: 'NYY', year: '3yr' },
    { round: 9,  first: 'Cal',     last: 'Raleigh',   pos: 'C',  team: 'SEA', year: '1yr' },
    { round: 23, first: 'Eury',    last: 'Pérez',     pos: 'SP', team: 'MIA', year: '1yr' },
    { round: 24, first: 'Josue',   last: 'De Paula',  pos: 'SP', team: 'LAD', isNA: true },
    { round: 25, first: 'Lazaro',  last: 'Montes',    pos: 'OF', team: 'SEA', isNA: true },
    { round: 26, first: 'Ethan',   last: 'Salas',     pos: 'C',  team: 'SD',  isNA: true },
  ],
}

/**
 * 2025 Draft Pick Trades — applied to snake board
 * Each trade swaps pick SLOTS between two owners for specific rounds.
 */
const DRAFT_TRADES = [
  {
    date: 'Apr 26, 2025',
    parties: ['Alex', 'Mike'],
    swaps: [
      { rounds: [6, 7, 8, 9, 10, 11], fromSlotOwner: 'Alex', toOwner: 'Mike' },
      { rounds: [18, 19, 20, 21, 22, 23], fromSlotOwner: 'Mike', toOwner: 'Alex' },
    ],
  },
  {
    date: 'May 8, 2025',
    parties: ['Bob', 'Chris'],
    swaps: [
      { rounds: [12], fromSlotOwner: 'Chris', toOwner: 'Bob' },
      { rounds: [22], fromSlotOwner: 'Bob', toOwner: 'Chris' },
    ],
  },
  {
    date: 'Jun 1, 2025',
    parties: ['Bob', 'Nick'],
    swaps: [
      { rounds: [12], fromSlotOwner: 'Nick', toOwner: 'Bob' },
      { rounds: [20], fromSlotOwner: 'Bob', toOwner: 'Nick' },
    ],
  },
  {
    date: 'Jun 30, 2025',
    parties: ['Bob', 'Greasy'],
    swaps: [
      { rounds: [9], fromSlotOwner: 'Greasy', toOwner: 'Bob' },
      { rounds: [16], fromSlotOwner: 'Bob', toOwner: 'Greasy' },
    ],
  },
  {
    date: 'Jul 7, 2025',
    parties: ['Bob', 'Tom'],
    swaps: [
      { rounds: [15], fromSlotOwner: 'Tom', toOwner: 'Bob' },
      { rounds: [12], fromSlotOwner: 'Bob', toOwner: 'Tom' },
    ],
  },
  {
    date: 'Jul 10, 2025',
    parties: ['Mike', 'Nick'],
    swaps: [
      { rounds: [21, 22, 23], fromSlotOwner: 'Nick', toOwner: 'Mike' },
      { rounds: [7, 8, 9], fromSlotOwner: 'Mike', toOwner: 'Nick' },
    ],
  },
  {
    date: 'Jul 14, 2025',
    parties: ['Sean', 'Tom'],
    swaps: [
      { rounds: [17], fromSlotOwner: 'Tom', toOwner: 'Sean' },
      { rounds: [8], fromSlotOwner: 'Sean', toOwner: 'Tom' },
    ],
  },
  {
    date: 'Jul 26, 2025',
    parties: ['Bob', 'Nick'],
    swaps: [
      { rounds: [17], fromSlotOwner: 'Nick', toOwner: 'Bob' },
      { rounds: [11], fromSlotOwner: 'Bob', toOwner: 'Nick' },
    ],
  },
  {
    date: 'Aug 7, 2025',
    parties: ['Bob', 'Nick'],
    swaps: [
      { rounds: [20], fromSlotOwner: 'Nick', toOwner: 'Bob' },
      { rounds: [14], fromSlotOwner: 'Bob', toOwner: 'Nick' },
    ],
  },
  {
    date: 'Aug 7, 2025',
    parties: ['Chris', 'Pudge'],
    swaps: [
      { rounds: [20], fromSlotOwner: 'Pudge', toOwner: 'Chris' },
      { rounds: [9], fromSlotOwner: 'Chris', toOwner: 'Pudge' },
    ],
  },
  {
    date: 'Aug 8, 2025',
    parties: ['Chris', 'Nick'],
    swaps: [
      { rounds: [19], fromSlotOwner: 'Nick', toOwner: 'Chris' },
      { rounds: [10], fromSlotOwner: 'Chris', toOwner: 'Nick' },
    ],
  },
  {
    date: 'Aug 9, 2025',
    parties: ['Bob', 'Web'],
    swaps: [
      { rounds: [21, 23], fromSlotOwner: 'Web', toOwner: 'Bob' },
      { rounds: [9, 10], fromSlotOwner: 'Bob', toOwner: 'Web' },
    ],
  },
  {
    date: 'Aug 9, 2025',
    parties: ['Web', 'Mike'],
    swaps: [
      { rounds: [17], fromSlotOwner: 'Mike', toOwner: 'Web' },
      { rounds: [20], fromSlotOwner: 'Web', toOwner: 'Mike' },
    ],
  },
  {
    date: 'Aug 10, 2025',
    parties: ['Alex', 'Chris'],
    swaps: [
      { rounds: [7], fromSlotOwner: 'Chris', toOwner: 'Alex' },
      { rounds: [23], fromSlotOwner: 'Mike', toOwner: 'Chris' },  // originally Mike's, Alex got from Trade 1, now to Chris
    ],
  },
  {
    date: 'Aug 10, 2025',
    parties: ['Web', 'Bob'],
    swaps: [
      { rounds: [12], fromSlotOwner: 'Nick', toOwner: 'Web' },  // originally Nick's, Bob got from Trade 3, now to Web
      { rounds: [19], fromSlotOwner: 'Web', toOwner: 'Bob' },
    ],
  },
  {
    date: 'Oct 19, 2025',
    parties: ['Bob', 'Chris'],
    swaps: [
      { rounds: [13], fromSlotOwner: 'Chris', toOwner: 'Bob' },
      { rounds: [9], fromSlotOwner: 'Greasy', toOwner: 'Chris' },  // originally Greasy's, Bob got from Trade #4, now to Chris
    ],
  },
  {
    date: 'Feb 11, 2026',
    parties: ['Sean', 'Alex'],
    swaps: [
      { rounds: [13], fromSlotOwner: 'Sean', toOwner: 'Alex' },
      { rounds: [7], fromSlotOwner: 'Chris', toOwner: 'Sean' },  // originally Chris's, Alex got from #19, now to Sean
    ],
  },
  {
    date: 'Feb 13, 2026',
    parties: ['Greasy', 'Sean'],
    swaps: [
      { rounds: [18], fromSlotOwner: 'Greasy', toOwner: 'Sean' },
      { rounds: [7], fromSlotOwner: 'Sean', toOwner: 'Greasy' },  // Sean's original slot (7.12)
    ],
  },
  {
    date: 'Feb 14, 2026',
    parties: ['Alex', 'Tyler'],
    swaps: [
      { rounds: [18, 19, 20], fromSlotOwner: 'Alex', toOwner: 'Tyler' },  // Alex's original slots (18.5, 19.8, 20.5)
      { rounds: [6, 9, 13], fromSlotOwner: 'Tyler', toOwner: 'Alex' },
    ],
  },
  {
    date: 'Feb 15, 2026',
    parties: ['Alex', 'Nick'],
    swaps: [
      { rounds: [19, 20], fromSlotOwner: 'Mike', toOwner: 'Nick' },  // Mike's slots Alex had (21 removed — goes to Bob in #35)
      { rounds: [21, 22], fromSlotOwner: 'Alex', toOwner: 'Nick' },  // Alex's original slots
      { rounds: [23], fromSlotOwner: 'Alex', toOwner: 'Nick' },  // Alex's original Rd 23 (replaces 2nd Rd 21)
      { rounds: [7, 9], fromSlotOwner: 'Mike', toOwner: 'Alex' },  // Mike's slots Nick had
      { rounds: [8, 10], fromSlotOwner: 'Nick', toOwner: 'Alex' },  // Nick's original slots
      { rounds: [11], fromSlotOwner: 'Bob', toOwner: 'Alex' },  // Bob's slot Nick had
    ],
  },
  {
    date: 'Feb 15, 2026',
    parties: ['Alex', 'Mike'],
    swaps: [
      { rounds: [15], fromSlotOwner: 'Alex', toOwner: 'Mike' },  // Alex's original
      { rounds: [12], fromSlotOwner: 'Mike', toOwner: 'Alex' },  // Mike's original
    ],
  },
  {
    date: 'Feb 15, 2026',
    parties: ['Mike', 'Tyler'],
    swaps: [
      { rounds: [21, 22, 23], fromSlotOwner: 'Nick', toOwner: 'Tyler' },  // Nick's slots Mike had
      { rounds: [7, 8, 10], fromSlotOwner: 'Tyler', toOwner: 'Mike' },  // Tyler's original slots
    ],
  },
  {
    date: 'Feb 15, 2026',
    parties: ['Chris', 'Bob'],
    swaps: [
      { rounds: [11], fromSlotOwner: 'Chris', toOwner: 'Bob' },  // Chris's original
      { rounds: [7], fromSlotOwner: 'Bob', toOwner: 'Chris' },  // Bob's original (7.10)
    ],
  },
  {
    date: 'Feb 15, 2026',
    parties: ['Thomas', 'Tyler'],
    swaps: [
      { rounds: [4, 6, 8, 23], fromSlotOwner: 'Thomas', toOwner: 'Tyler' },
      { rounds: [1, 11, 12, 14], fromSlotOwner: 'Tyler', toOwner: 'Thomas' },
    ],
  },
  {
    date: 'Feb 16, 2026',
    parties: ['Nick', 'Alex'],
    swaps: [
      { rounds: [8], fromSlotOwner: 'Mike', toOwner: 'Alex' },  // Mike's slot Nick had (8.2)
      { rounds: [22], fromSlotOwner: 'Mike', toOwner: 'Nick' },  // Mike's slot Alex had (22.2)
    ],
  },
  {
    date: 'Feb 16, 2026',
    parties: ['Mike', 'Alex'],
    swaps: [
      { rounds: [20], fromSlotOwner: 'Web', toOwner: 'Alex' },  // Web's slot Mike had (20.10), modified from Rd 23
      { rounds: [13], fromSlotOwner: 'Sean', toOwner: 'Mike' },  // Sean's slot Alex had (13.12)
    ],
  },
  {
    date: 'Feb 16, 2026',
    parties: ['Tom', 'Alex'],
    swaps: [
      { rounds: [8, 10], fromSlotOwner: 'Tom', toOwner: 'Alex' },  // Tom's original slots
      { rounds: [13], fromSlotOwner: 'Alex', toOwner: 'Tom' },  // Alex's original slot
      { rounds: [18], fromSlotOwner: 'Mike', toOwner: 'Tom' },  // Mike's slot Alex had (18.2)
    ],
  },
  {
    date: 'Feb 16, 2026',
    parties: ['Alex', 'Tyler'],
    swaps: [
      { rounds: [8, 10], fromSlotOwner: 'Nick', toOwner: 'Tyler' },  // Nick's slots Alex had (8.11, 10.11)
      { rounds: [2], fromSlotOwner: 'Tyler', toOwner: 'Alex' },  // Tyler's original (2.8)
      { rounds: [6], fromSlotOwner: 'Thomas', toOwner: 'Alex' },  // Thomas's slot Tyler had from #29 (6.7)
    ],
  },
  {
    date: 'Feb 17, 2026',
    parties: ['Alex', 'Pudge'],
    swaps: [
      { rounds: [7], fromSlotOwner: 'Mike', toOwner: 'Pudge' },  // Mike's slot Alex had (7.11)
      { rounds: [20], fromSlotOwner: 'Web', toOwner: 'Pudge' },  // Web's slot Alex had (20.10)
      { rounds: [11], fromSlotOwner: 'Pudge', toOwner: 'Alex' },  // Pudge's original (11.1)
      { rounds: [23], fromSlotOwner: 'Pudge', toOwner: 'Alex' },  // Pudge's original (23.1)
    ],
  },
  {
    date: 'Feb 19, 2026',
    parties: ['Bob', 'Alex'],
    swaps: [
      { rounds: [16, 17], fromSlotOwner: 'Alex', toOwner: 'Bob' },  // Alex's original slots
      { rounds: [21], fromSlotOwner: 'Mike', toOwner: 'Bob' },  // Mike's slot Alex kept (21.11)
      { rounds: [15, 19, 23], fromSlotOwner: 'Bob', toOwner: 'Alex' },  // Bob's original slots (higher picks traded first)
    ],
  },
  {
    date: 'Feb 19, 2026',
    parties: ['Chris', 'Thomas'],
    swaps: [
      { rounds: [22], fromSlotOwner: 'Chris', toOwner: 'Thomas' },  // Chris's original (22.6)
      { rounds: [23], fromSlotOwner: 'Mike', toOwner: 'Thomas' },  // Mike's slot Chris had (23.11)
      { rounds: [12], fromSlotOwner: 'Tyler', toOwner: 'Chris' },  // Tyler's slot Thomas had from #29 (12.8)
      { rounds: [16], fromSlotOwner: 'Thomas', toOwner: 'Chris' },  // Thomas's original (16.7)
    ],
  },
  {
    date: 'Feb 19, 2026',
    parties: ['Nick', 'Tyler'],
    swaps: [
      { rounds: [13], fromSlotOwner: 'Nick', toOwner: 'Tyler' },  // Nick's original (13.2)
      { rounds: [23], fromSlotOwner: 'Thomas', toOwner: 'Nick' },  // Thomas's slot Tyler had from #29 (23.6)
    ],
  },
]

/**
 * Build trade override map: trades[round][slotIndex] = { newOwner, originalOwner }
 * slotIndex = index in draftOrder array (0-based)
 */
function buildTradeMap(draftOrder: string[]): Map<number, Map<number, { newOwner: string; originalOwner: string }>> {
  const tradeMap = new Map<number, Map<number, { newOwner: string; originalOwner: string }>>()

  for (const trade of DRAFT_TRADES) {
    for (const swap of trade.swaps) {
      const slotIdx = draftOrder.indexOf(swap.fromSlotOwner)
      if (slotIdx === -1) continue

      for (const round of swap.rounds) {
        if (!tradeMap.has(round)) {
          tradeMap.set(round, new Map())
        }
        tradeMap.get(round)!.set(slotIdx, {
          newOwner: swap.toOwner,
          originalOwner: swap.fromSlotOwner,
        })
      }
    }
  }

  return tradeMap
}

export default function DraftBoardPage() {
  const [fontSize, setFontSize] = useState(0.75)
  const [keepers, setKeepers] = useState<Map<string, Map<number, KeeperInfo>>>(new Map())
  const [, setKeepersLoading] = useState(true)
  const data = draftBoardData as DraftBoard

  // Fetch keeper data on mount
  useEffect(() => {
    const fetchKeepers = async () => {
      try {
        const response = await fetch('/api/keepers')
        if (response.ok) {
          const keeperRows = await response.json()
          
          // Build lookup map: displayName → round → KeeperInfo
          // NA keepers go into NA rounds (24-27), not their cost round
          const keeperMap = new Map<string, Map<number, KeeperInfo>>()
          
          // Track NA keeper assignments per owner (rounds 24-27)
          const naCounters = new Map<string, number>()
          
          // First pass: regular + 7th keepers (they use their effective round)
          for (const row of keeperRows) {
            if (!row.keeper_cost_round) continue
            if (!['keeping', 'keeping-7th'].includes(row.keeper_status)) continue
            
            const manager = MANAGERS.find(m => m.yahooTeamKey === row.yahoo_team_key)
            if (!manager) continue
            
            const displayName = manager.displayName
            const effectiveRound = row.stacking?.effective_round ?? row.keeper_cost_round
            
            const keeperInfo: KeeperInfo = {
              playerName: row.players?.full_name ?? 'Unknown Player',
              keeperStatus: row.keeper_status,
              costRound: row.keeper_cost_round,
              effectiveRound,
              stackedFrom: row.stacking?.stacked_from ?? null
            }
            
            if (!keeperMap.has(displayName)) {
              keeperMap.set(displayName, new Map())
            }
            
            const ownerMap = keeperMap.get(displayName)!
            ownerMap.set(effectiveRound, keeperInfo)
          }
          
          // Second pass: NA keepers → assign to rounds 24-27 sequentially
          for (const row of keeperRows) {
            if (row.keeper_status !== 'keeping-na') continue
            
            const manager = MANAGERS.find(m => m.yahooTeamKey === row.yahoo_team_key)
            if (!manager) continue
            
            const displayName = manager.displayName
            const naIdx = naCounters.get(displayName) ?? 0
            const naRound = 24 + naIdx // NA rounds: 24, 25, 26, 27
            naCounters.set(displayName, naIdx + 1)
            
            if (naRound > 27) continue // Max 4 NA slots
            
            const keeperInfo: KeeperInfo = {
              playerName: row.players?.full_name ?? 'Unknown Player',
              keeperStatus: 'keeping-na',
              costRound: row.keeper_cost_round,
              effectiveRound: naRound,
              stackedFrom: null
            }
            
            if (!keeperMap.has(displayName)) {
              keeperMap.set(displayName, new Map())
            }
            
            const ownerMap = keeperMap.get(displayName)!
            ownerMap.set(naRound, keeperInfo)
          }
          
          setKeepers(keeperMap)
        }
      } catch (error) {
        console.error('Failed to fetch keepers:', error)
        // Graceful fallback - just show board without keepers
      } finally {
        setKeepersLoading(false)
      }
    }
    
    fetchKeepers()
  }, [])

  return (
    <main className="min-h-screen bg-background">
      {/* Page Header (nav is in layout) */}
      <div className="bg-background/80 border-b border-primary/10">
        <div className="mx-auto max-w-[1400px] px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-primary">
              🎯 2026 DRAFT BOARD
            </h1>
            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> March 6, 2026</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> 12 Teams • 27 Rounds</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] p-4 space-y-4">
        {/* Font Size Controls */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-1 bg-card rounded-lg border border-primary/20 p-0.5">
            <button
              onClick={() => setFontSize(prev => Math.max(0.55, prev - 0.05))}
              className="px-2 py-1 rounded text-xs font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
              title="Decrease font size"
            >
              A-
            </button>
            <span className="px-1.5 text-[10px] font-mono text-muted-foreground">{Math.round(fontSize * 100)}%</span>
            <button
              onClick={() => setFontSize(prev => Math.min(1.1, prev + 0.05))}
              className="px-2 py-1 rounded text-xs font-mono font-bold text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
              title="Increase font size"
            >
              A+
            </button>
          </div>
        </div>

        {/* Snake View — snake-order draft board with trade overrides */}
        {(() => {
          const draftOrder = data.draftOrder
          const totalRounds = 27
          const teamCount = draftOrder.length // 12
          const tradeMap = buildTradeMap(draftOrder)

          // Build keeper placement map: "round-slotIdx" → SnakeKeeper
          const keeperPlacements = new Map<string, SnakeKeeper>()
          for (const [ownerName, keepers] of Object.entries(SNAKE_KEEPERS)) {
            for (const keeper of keepers) {
              // Find which slots this owner has in this round
              const ownerSlots: number[] = []
              for (let s = 0; s < teamCount; s++) {
                const tradeOverride = tradeMap.get(keeper.round)?.get(s)
                const cellOwner = tradeOverride ? tradeOverride.newOwner : draftOrder[s]
                if (cellOwner === ownerName) ownerSlots.push(s)
              }
              if (ownerSlots.length > 0) {
                // Place keeper in first available slot not already taken by another keeper
                const slot = ownerSlots.find(s => !keeperPlacements.has(`${keeper.round}-${s}`)) ?? ownerSlots[0]
                keeperPlacements.set(`${keeper.round}-${slot}`, keeper)
              }
            }
          }

          return (
            <div className="overflow-x-auto rounded-lg border border-primary/20">
              <table className="border-collapse w-full" style={{ minWidth: '960px', fontSize: `${fontSize}rem` }}>
                <thead>
                  <tr className="bg-card">
                    <th className="sticky left-0 z-[5] bg-card p-2 text-center font-mono text-xs text-muted-foreground border-b border-r border-primary/20 w-14">
                      RND
                    </th>
                    {Array.from({ length: teamCount }, (_, i) => (
                      <th key={i} className="p-2 text-center border-b border-primary/20 min-w-[80px] bg-card">
                        <span className="font-mono font-bold text-muted-foreground" style={{ fontSize: `${Math.max(fontSize * 0.85, 0.55)}rem` }}>
                          Pick {i + 1}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
                    const isOdd = round % 2 === 1
                    const roundTrades = tradeMap.get(round)

                    return (
                      <tr key={round} className="hover:bg-primary/5 transition-colors">
                        <td className={`sticky left-0 z-[5] p-2 text-center font-mono font-bold border-r border-primary/20 ${
                          isOdd ? 'bg-background' : 'bg-card/90'
                        }`} style={{ fontSize: `${fontSize * 1.1}rem` }}>
                          <div className="flex items-center justify-center gap-1">
                            <span>{round > 23 ? 'NA' : round}</span>
                            {round <= 23 && (
                              <span className="text-muted-foreground" style={{ fontSize: `${fontSize * 0.75}rem` }}>
                                {isOdd ? '→' : '←'}
                              </span>
                            )}
                          </div>
                        </td>
                        {Array.from({ length: teamCount }, (_, colIdx) => {
                          const pickNum = colIdx + 1
                          const slotIdx = isOdd ? colIdx : (teamCount - 1 - colIdx)
                          const tradeOverride = roundTrades?.get(slotIdx)
                          const owner = tradeOverride ? tradeOverride.newOwner : draftOrder[slotIdx]
                          const isTraded = !!tradeOverride
                          const originalOwner = tradeOverride?.originalOwner ?? ''
                          const colors = TEAM_COLORS[owner]
                          const keeper = keeperPlacements.get(`${round}-${slotIdx}`)

                          return (
                            <td
                              key={colIdx}
                              className="p-0.5 text-center border border-border/10"
                              title={keeper
                                ? `${keeper.first} ${keeper.last} (${keeper.pos}, ${keeper.team}) — ${owner}, Round ${round}`
                                : isTraded
                                  ? `Round ${round}, Pick ${pickNum} — ${owner} (from ${originalOwner})`
                                  : `Round ${round}, Pick ${pickNum} — ${owner}`
                              }
                            >
                              <div
                                className={`rounded border ${colors?.bg ?? 'bg-muted'} ${colors?.border ?? 'border-border'} h-[60px] min-h-[60px] max-h-[60px] flex flex-col overflow-hidden`}
                                style={{ opacity: 0.9 }}
                              >
                                {/* Row 1: Owner name — always present, always the same */}
                                <div
                                  className={`text-center font-bold border-b border-black/10 shrink-0 ${colors?.text ?? 'text-foreground'}`}
                                  style={{ fontSize: `${Math.max(fontSize * 0.72, 0.46)}rem`, lineHeight: 1.4 }}
                                >
                                  {owner}
                                </div>
                                {/* Row 2: Content area */}
                                <div className="flex-1 flex flex-col items-center justify-center">
                                  {keeper ? (
                                    <>
                                      <div className="font-bold text-black text-center leading-tight" style={{ fontSize: `${Math.max(fontSize * 0.75, 0.48)}rem` }}>
                                        {keeper.first}
                                      </div>
                                      <div className="font-bold text-black text-center leading-tight" style={{ fontSize: `${Math.max(fontSize * 0.75, 0.48)}rem` }}>
                                        {keeper.last}
                                      </div>
                                      <div className="text-center text-black/40" style={{ fontSize: `${Math.max(fontSize * 0.4, 0.28)}rem`, lineHeight: 1 }}>
                                        {keeper.isNA ? '(NA)' : keeper.is7th ? '(7th)' : '(K)'}
                                      </div>
                                    </>
                                  ) : round > 23 ? (
                                    null
                                  ) : isTraded ? (
                                    <>
                                      <div className="font-mono font-bold text-black text-center" style={{ fontSize: `${Math.max(fontSize * 0.85, 0.55)}rem` }}>
                                        {round}.{pickNum}
                                      </div>
                                      <div className="font-mono font-bold text-black text-center" style={{ fontSize: `${Math.max(fontSize * 0.55, 0.38)}rem` }}>
                                        ← {originalOwner}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="font-mono font-bold text-black text-center" style={{ fontSize: `${Math.max(fontSize * 0.85, 0.55)}rem` }}>
                                      {round}.{pickNum}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {/* NA rounds (24-27) rendered inline via totalRounds=27 */}
                </tbody>
              </table>
            </div>
          )
        })()}

        {/* Legend & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Team Legend */}
          <div className="p-4 bg-card rounded-lg border border-primary/20">
            <h3 className="font-bold text-primary mb-3 font-mono text-sm">TEAMS</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {data.draftOrder.map((team) => {
                const colors = TEAM_COLORS[team]
                const pickCount = Object.values(data.picks).reduce((acc, round) =>
                  acc + (round as DraftPick[]).filter(p => p.currentOwner === team).length, 0
                )
                return (
                  <div key={team} className={`flex items-center gap-1.5 rounded px-2 py-1 ${colors?.bg} ${colors?.border} border`}>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${colors?.dot}`} />
                    <span className={`text-xs font-mono font-bold ${colors?.text}`}>{team}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto">{pickCount}pk</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Key Info */}
          <div className="p-4 bg-card rounded-lg border border-primary/20">
            <h3 className="font-bold text-primary mb-3 font-mono text-sm">FORMAT</h3>
            <ul className="text-xs space-y-1.5 font-mono text-muted-foreground">
              <li>• <span className="text-foreground">Snake draft:</span> Odd rounds pick 1→12, even rounds 12→1</li>
              <li>• <span className="text-foreground">Rounds 1-23:</span> Regular players</li>
              <li>• <span className="text-amber-700">Rounds 24-27:</span> NA/Minor League only</li>
              <li>• <span className="text-accent">↔ symbol:</span> Pick was traded once (shows original owner)</li>
              <li>• <span className="text-yellow-700">Multi-hop path:</span> Pick traded through multiple teams (e.g. Mike→Nick→Alex)</li>
              <li>• <span className="text-foreground">← arrow:</span> Even rounds flow right-to-left</li>
              <li className="pt-2 border-t border-border space-y-1">
                <div>• <span className="text-green-600">🔒 = Keeper (locked)</span></div>
                <div>• <span className="text-yellow-600">⭐ = 7th Keeper</span></div>
                <div>• <span className="text-blue-600">🔷 = NA Keeper (minor league)</span></div>
                <div>• <span className="text-yellow-600">↕ = Stacked from different round</span></div>
              </li>
              <li className="pt-2 border-t border-border">• <span className="text-foreground">Hover</span> any cell for full details</li>
            </ul>
          </div>

          {/* Trade Log */}
          <div className="p-4 bg-card rounded-lg border border-primary/20">
            <h3 className="font-bold text-primary mb-3 font-mono text-sm">📋 TRADES</h3>
            <ul className="text-xs space-y-2 font-mono text-muted-foreground">
              {DRAFT_TRADES.map((trade, i) => (
                <li key={i} className="leading-snug">
                  <span className="text-foreground font-bold">{trade.date}</span>
                  {' — '}
                  <span className={TEAM_COLORS[trade.parties[0]]?.text}>{trade.parties[0]}</span>
                  {' ↔ '}
                  <span className={TEAM_COLORS[trade.parties[1]]?.text}>{trade.parties[1]}</span>
                  <div className="mt-0.5 pl-2 text-muted-foreground">
                    {trade.swaps.map((swap, j) => {
                      const rounds = swap.rounds
                      const rangeStr = rounds.length > 1 ? `Rd ${rounds[0]}-${rounds[rounds.length - 1]}` : `Rd ${rounds[0]}`
                      return (
                        <div key={j}>
                          <span className={TEAM_COLORS[swap.toOwner]?.text}>{swap.toOwner}</span>
                          {' gets '}
                          {rangeStr}
                        </div>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs font-mono text-muted-foreground">
            THE SANDLOT — 2026 FANTASY BASEBALL DRAFT • MARCH 6, 2026
          </p>
        </div>
      </div>
    </main>
  )
}
