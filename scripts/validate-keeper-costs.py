#!/usr/bin/env python3
"""
Keeper Cost Validation Script for The Sandlot Fantasy Baseball League
=====================================================================

Calculates the CORRECT keeper cost for every active keeper from scratch
using Yahoo API + FantasyPros ECR data, then compares to current DB values.

Usage:
    cd ~/clawd/tunnel-snakes
    source .env.local
    python3 scripts/validate-keeper-costs.py
"""

import json
import csv
import os
import sys
import math
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

# ── Configuration ──────────────────────────────────────────────────────────

LEAGUE_KEYS = {
    2024: "431.l.27405",
    2025: "458.l.5221",
    2026: "469.l.24701",
}

TEAM_NAMES = {
    "1": "Chris", "2": "Alex", "3": "Pudge", "4": "Sean", "5": "Tom",
    "6": "Greasy", "7": "Web", "8": "Nick", "9": "Bob", "10": "Mike",
    "11": "Thomas", "12": "Tyler",
}

YAHOO_BASE = "https://fantasysports.yahooapis.com/fantasy/v2"
YAHOO_TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token"

CACHE_DIR = Path("/tmp")
PROJECT_DIR = Path.home() / "clawd" / "tunnel-snakes"
ECR_CSV = PROJECT_DIR / "data" / "fantasypros-ecr-2026.csv"
TOKEN_FILE = PROJECT_DIR / ".yahoo-token.json"
ENV_FILE = PROJECT_DIR / ".env.local"
DRAFT_BOARD_FILE = PROJECT_DIR / "scripts" / "draft-board-verified.json"

# Cache file paths
CACHE_DRAFT_2024 = CACHE_DIR / "draft_results_2024.json"
CACHE_DRAFT_2025 = CACHE_DIR / "draft-results-2025.json"
CACHE_PICKS_2025 = CACHE_DIR / "draft-picks-clean.json"
CACHE_TXNS_2025 = CACHE_DIR / "transactions_2025.json"
CACHE_KEEPERS_DB = CACHE_DIR / "all-keepers-db.json"
CACHE_ROSTERS_2024_END = CACHE_DIR / "rosters-2024-end.json"

# ── Environment Loading ───────────────────────────────────────────────────

def load_env():
    """Load .env.local file into a dict."""
    env = {}
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
                env[key.strip()] = val.strip()
    return env

ENV = load_env()


# ── Yahoo API ─────────────────────────────────────────────────────────────

def refresh_yahoo_token():
    """Refresh the Yahoo OAuth2 token and save to file."""
    print("🔄 Refreshing Yahoo API token...")
    token_data = json.load(open(TOKEN_FILE))
    refresh_token = token_data.get("refresh_token", ENV.get("YAHOO_REFRESH_TOKEN", ""))

    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": ENV["YAHOO_CLIENT_ID"],
        "client_secret": ENV["YAHOO_CLIENT_SECRET"],
    }).encode()

    req = urllib.request.Request(YAHOO_TOKEN_URL, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req) as resp:
            new_token = json.loads(resp.read())
        with open(TOKEN_FILE, "w") as f:
            json.dump(new_token, f)
        print("  ✅ Token refreshed successfully")
        return new_token["access_token"]
    except urllib.error.HTTPError as e:
        print(f"  ⚠️  Token refresh failed: {e.code} {e.read().decode()}")
        # Fall back to existing token
        return token_data["access_token"]


def yahoo_api(endpoint, access_token):
    """Make a Yahoo Fantasy API request."""
    url = f"{YAHOO_BASE}/{endpoint}"
    sep = "&" if "?" in url else "?"
    url += f"{sep}format=json"

    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {access_token}")

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  ❌ API error for {endpoint}: {e.code}")
        body = e.read().decode()
        print(f"     {body[:200]}")
        return None


# ── Data Loading ──────────────────────────────────────────────────────────

def load_ecr():
    """Load FantasyPros ECR CSV and return {player_name_normalized: ecr_rank}."""
    print("📊 Loading FantasyPros ECR data...")
    ecr = {}
    with open(ECR_CSV, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rk = row.get("RK", "").strip()
            if not rk:
                continue  # skip empty rows
            try:
                rank = int(rk)
            except ValueError:
                continue
            name = row["PLAYER NAME"].strip()
            ecr[normalize_name(name)] = rank
    print(f"  Loaded {len(ecr)} players from ECR CSV")
    return ecr


def normalize_name(name):
    """Normalize player name for matching."""
    # Remove periods, extra spaces, common suffixes
    name = name.strip()
    # Handle abbreviated first names like "S. Ohtani" -> try both
    # But also keep full names
    name = name.replace(".", "").replace("  ", " ").strip()
    return name.lower()


def ecr_to_round(ecr_rank):
    """Convert ECR rank to keeper round (ceil(rank/12), cap at 23)."""
    if ecr_rank is None:
        return None
    return min(math.ceil(ecr_rank / 12), 23)


def load_draft_results(year, access_token):
    """Load draft results for a given year. Uses cache if available."""
    cache_files = {
        2024: CACHE_DRAFT_2024,
        2025: CACHE_DRAFT_2025,
    }
    cache = cache_files.get(year)

    if cache and cache.exists():
        print(f"  📁 Using cached {year} draft results from {cache}")
        data = json.load(open(cache))
    else:
        print(f"  🌐 Fetching {year} draft results from Yahoo API...")
        league_key = LEAGUE_KEYS[year]
        data = yahoo_api(f"league/{league_key}/draft_results", access_token)
        if data and cache:
            with open(cache, "w") as f:
                json.dump(data, f, indent=2)

    if not data:
        return {}

    # Parse into {player_id: {round, pick, team_key}}
    draft = {}
    dr = data["fantasy_content"]["league"][1]["draft_results"]
    for k, v in dr.items():
        if k == "count":
            continue
        pick = v["draft_result"]
        player_key = pick["player_key"]
        player_id = player_key.split(".p.")[1]
        team_key = pick["team_key"]
        team_num = team_key.split(".t.")[1]
        draft[player_id] = {
            "round": pick["round"],
            "pick": pick["pick"],
            "team_key": team_key,
            "team_num": team_num,
            "player_key": player_key,
        }
    return draft


def load_transactions_2025(access_token):
    """Load all 2025 transactions. Uses cache if available."""
    # Check for the combined cache file first
    if CACHE_TXNS_2025.exists():
        print("  📁 Using cached 2025 transactions")
        data = json.load(open(CACHE_TXNS_2025))
        txns_raw = data["fantasy_content"]["league"][1]["transactions"]
    else:
        print("  🌐 Fetching 2025 transactions from Yahoo API (paginated)...")
        league_key = LEAGUE_KEYS[2025]
        all_txns = {}
        offset = 0
        idx = 0
        while True:
            data = yahoo_api(f"league/{league_key}/transactions?start={offset}&count=25", access_token)
            if not data:
                break
            txns = data["fantasy_content"]["league"][1].get("transactions", {})
            count = txns.get("count", 0)
            added = 0
            for k, v in txns.items():
                if k == "count":
                    continue
                all_txns[str(idx)] = v
                idx += 1
                added += 1
            print(f"    Fetched offset={offset}, got {added} transactions")
            if added < 25:
                break
            offset += 25

        txns_raw = all_txns
        txns_raw["count"] = len(all_txns)

        # Save cache
        cache_data = {
            "fantasy_content": {
                "league": [
                    {"league_key": LEAGUE_KEYS[2025]},
                    {"transactions": txns_raw}
                ]
            }
        }
        with open(CACHE_TXNS_2025, "w") as f:
            json.dump(cache_data, f, indent=2)

    return parse_transactions(txns_raw)


def parse_transactions(txns_raw):
    """Parse raw Yahoo transactions into structured data.
    
    Returns list of:
    {
        type: add|drop|add/drop|trade|commish,
        timestamp: int,
        transaction_id: str,
        players: [{player_id, player_name, action, source_type, source_team, dest_type, dest_team}],
        trader_team, tradee_team (for trades)
    }
    """
    transactions = []
    for k, v in txns_raw.items():
        if k == "count":
            continue

        txn_meta = v["transaction"][0]
        txn_type = txn_meta.get("type", "unknown")
        txn_id = txn_meta.get("transaction_id", "")
        timestamp = int(txn_meta.get("timestamp", 0))

        entry = {
            "type": txn_type,
            "timestamp": timestamp,
            "transaction_id": txn_id,
            "players": [],
        }

        if txn_type == "trade":
            entry["trader_team_key"] = txn_meta.get("trader_team_key", "")
            entry["tradee_team_key"] = txn_meta.get("tradee_team_key", "")

        # Parse players
        if len(v["transaction"]) > 1:
            players_data = v["transaction"][1].get("players", {})
            for pk, pv in players_data.items():
                if pk == "count":
                    continue
                player_info = pv["player"]
                # player_info[0] is list of player attributes
                # player_info[1] is transaction_data
                attrs = player_info[0]
                player_id = None
                player_name = None
                for attr in attrs:
                    if isinstance(attr, dict):
                        if "player_id" in attr:
                            player_id = attr["player_id"]
                        if "name" in attr:
                            player_name = attr["name"].get("full", "Unknown")

                txn_data = {}
                if len(player_info) > 1 and isinstance(player_info[1], dict):
                    td_raw = player_info[1].get("transaction_data", [])
                    if isinstance(td_raw, dict):
                        # Single transaction_data as dict (e.g., drops)
                        txn_data = td_raw
                    elif isinstance(td_raw, list) and td_raw:
                        txn_data = td_raw[0] if isinstance(td_raw[0], dict) else {}

                action = txn_data.get("type", txn_type)
                source_type = txn_data.get("source_type", "")
                source_team = txn_data.get("source_team_key", "")
                dest_type = txn_data.get("destination_type", "")
                dest_team = txn_data.get("destination_team_key", "")

                entry["players"].append({
                    "player_id": player_id,
                    "player_name": player_name,
                    "action": action,
                    "source_type": source_type,
                    "source_team_key": source_team,
                    "dest_type": dest_type,
                    "dest_team_key": dest_team,
                })

        transactions.append(entry)

    # Sort by timestamp (ascending)
    transactions.sort(key=lambda x: x["timestamp"])
    return transactions


def load_keepers_from_db():
    """Load current keeper data from Supabase."""
    cache = CACHE_KEEPERS_DB
    if cache.exists():
        print("  📁 Using cached keeper DB data")
        return json.load(open(cache))

    print("  🌐 Fetching keepers from Supabase...")
    supabase_url = ENV["NEXT_PUBLIC_SUPABASE_URL"]
    service_key = ENV["SUPABASE_SERVICE_ROLE_KEY"]

    url = (
        f"{supabase_url}/rest/v1/my_roster_players"
        f"?keeper_status=neq.not-keeping"
        f"&select=player_id,yahoo_team_key,keeper_status,keeper_cost_round,"
        f"players(id,yahoo_player_id,yahoo_player_key,full_name,fantasypros_ecr,"
        f"keeper_cost_round,keeper_cost_source)"
    )
    req = urllib.request.Request(url)
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")

    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())

    with open(cache, "w") as f:
        json.dump(data, f, indent=2)

    return data


def load_end_of_2024_rosters(access_token):
    """Fetch end-of-2024-season rosters for all teams.
    
    This is critical for identifying 2025 keepers — a player on a team's 
    roster at end of 2024 who also appears in the 2025 draft for that team 
    was KEPT in 2025.
    
    Returns: {team_num: set(player_ids)}
    """
    if CACHE_ROSTERS_2024_END.exists():
        print("  📁 Using cached 2024 end-of-season rosters")
        data = json.load(open(CACHE_ROSTERS_2024_END))
        # Convert lists back to sets
        return {k: set(v) for k, v in data.items()}

    print("  🌐 Fetching 2024 end-of-season rosters from Yahoo API...")
    league_key = LEAGUE_KEYS[2024]
    rosters = {}

    for team_num in range(1, 11):  # 2024 had 10 teams
        team_key = f"{league_key}.t.{team_num}"
        endpoint = f"team/{team_key}/roster;date=2024-09-29"
        data = yahoo_api(endpoint, access_token)
        if not data:
            print(f"    ⚠️  Failed to fetch roster for t.{team_num}")
            continue

        roster = data["fantasy_content"]["team"][1]["roster"]
        players_data = roster.get("0", {}).get("players", {})
        player_ids = set()

        for k, v in players_data.items():
            if k == "count":
                continue
            attrs = v["player"][0]
            for attr in attrs:
                if isinstance(attr, dict) and "player_id" in attr:
                    player_ids.add(attr["player_id"])
                    break

        rosters[str(team_num)] = player_ids
        owner = TEAM_NAMES.get(str(team_num), f"Team {team_num}")
        print(f"    t.{team_num} ({owner}): {len(player_ids)} players")

    # Cache (convert sets to lists for JSON)
    cache_data = {k: list(v) for k, v in rosters.items()}
    with open(CACHE_ROSTERS_2024_END, "w") as f:
        json.dump(cache_data, f, indent=2)

    return rosters


def load_draft_board():
    """Load offseason trade data from draft-board-verified.json."""
    if not DRAFT_BOARD_FILE.exists():
        return {}
    return json.load(open(DRAFT_BOARD_FILE))


# ── Player Name Matching ─────────────────────────────────────────────────

def build_ecr_lookup(ecr_data):
    """Build multiple lookup strategies for ECR matching.
    
    Returns a function that takes a full_name and returns ecr_rank or None.
    """
    # Direct normalized lookup
    direct = ecr_data  # already normalized

    # Build abbreviated -> full mapping
    # ECR has "S. Ohtani" style, DB has "Shohei Ohtani" style
    # We need to match both ways
    abbrev_map = {}  # "s ohtani" -> rank
    for name, rank in ecr_data.items():
        parts = name.split()
        if len(parts) >= 2 and len(parts[0]) <= 2:
            # Already abbreviated: "s ohtani"
            last = " ".join(parts[1:])
            abbrev_map[f"{parts[0][0]} {last}"] = rank

    def lookup(full_name, db_ecr=None):
        """Try to find ECR rank for a player. Falls back to DB ECR if not found."""
        norm = normalize_name(full_name)
        # Direct match
        if norm in direct:
            return direct[norm]

        # Try abbreviating the full name
        parts = norm.split()
        if len(parts) >= 2:
            # "shohei ohtani" -> "s ohtani"
            abbrev = f"{parts[0][0]} {' '.join(parts[1:])}"
            if abbrev in direct:
                return direct[abbrev]

            # Try last name only (risky, but fallback)
            last = parts[-1]
            matches = [(k, v) for k, v in direct.items() if k.endswith(f" {last}")]
            if len(matches) == 1:
                return matches[0][1]

        # Use DB ECR as final fallback
        if db_ecr is not None:
            return db_ecr

        return None

    return lookup


# ── Core Logic ────────────────────────────────────────────────────────────

def get_team_num(team_key):
    """Extract team number from a team key like '469.l.24701.t.5'."""
    return team_key.split(".t.")[-1]


def get_team_name(team_key):
    """Get friendly team name from team key."""
    num = get_team_num(team_key)
    return TEAM_NAMES.get(num, f"Team {num}")


def identify_2025_keepers(draft_2024, draft_2025, rosters_2024_end):
    """Identify players who were kept in 2025.
    
    A player is a 2025 keeper if they were on a team's roster at end of 2024
    AND appeared in the 2025 draft for that SAME team (same team number).
    
    This captures both:
    - Players drafted in 2024 and kept → appear in 2024 draft + 2024 roster + 2025 draft
    - FA pickups during 2024 and kept → appear in 2024 roster + 2025 draft (NOT in 2024 draft)
    
    Returns: set of player_ids that were 2025 keepers.
    """
    keepers_2025 = set()
    keeper_details = {}  # pid -> {team, method}

    # Method 1: Player on 2024 end-of-season roster AND in 2025 draft for same team
    for team_num, roster_pids in rosters_2024_end.items():
        for pid in roster_pids:
            if pid in draft_2025:
                d25 = draft_2025[pid]
                if d25["team_num"] == team_num:
                    keepers_2025.add(pid)
                    # Determine if they were drafted in 2024 or FA pickup
                    was_in_2024_draft = pid in draft_2024
                    keeper_details[pid] = {
                        "team": team_num,
                        "in_2024_draft": was_in_2024_draft,
                        "draft_round_2025": d25["round"],
                    }

    # Method 2: Also check for traded keepers
    # If a player was on team A's roster end-of-2024, traded to team B in offseason,
    # and appears in 2025 draft for team B
    # This is harder to detect without offseason trade data, but we handle it 
    # by checking if a player on ANY 2024 roster appears in 2025 draft for a different team
    # AND was not freshly drafted (round suggests keeper cost)
    all_2024_roster_pids = set()
    pid_to_2024_team = {}
    for team_num, roster_pids in rosters_2024_end.items():
        for pid in roster_pids:
            all_2024_roster_pids.add(pid)
            pid_to_2024_team[pid] = team_num

    for pid in all_2024_roster_pids:
        if pid in keepers_2025:
            continue  # Already identified
        if pid in draft_2025:
            d25 = draft_2025[pid]
            # Player was on team A in 2024 but drafted by team B in 2025
            # This COULD be an offseason trade keeper or just a re-draft
            # We'll flag these as potential keepers but also check 2024 draft
            old_team = pid_to_2024_team.get(pid)
            new_team = d25["team_num"]
            if old_team != new_team:
                # Check if there's evidence of a trade (2025 transactions won't help,
                # this happened in offseason). Use a heuristic: if draft round in 2025
                # doesn't match typical ADP for this player, they were likely a keeper.
                # For now, conservatively mark as keeper since they were rostered in 2024
                keepers_2025.add(pid)
                keeper_details[pid] = {
                    "team_2024": old_team,
                    "team_2025": new_team,
                    "traded_offseason": True,
                    "draft_round_2025": d25["round"],
                }

    return keepers_2025, keeper_details


def build_player_history(draft_2025, transactions_2025):
    """Build a history of each player's movements during the 2025 season.
    
    Returns: {player_id: {
        drafted_round: int or None,
        drafted_by: team_num or None,
        was_dropped: bool,
        dropped_by: [team_nums],
        fa_pickups: [{team_num, timestamp}],
        trades: [{from_team, to_team, timestamp}],
        last_team: team_num,  # last known team
        acquisition_chain: list of events in chronological order
    }}
    """
    history = {}

    # Start with draft data
    for pid, info in draft_2025.items():
        history[pid] = {
            "drafted_round": info["round"],
            "drafted_by": info["team_num"],
            "was_dropped": False,
            "dropped_by": [],
            "fa_pickups": [],
            "trades": [],
            "last_team": info["team_num"],
            "acquisition_chain": [{
                "type": "draft",
                "round": info["round"],
                "team": info["team_num"],
                "timestamp": 0,
            }],
        }

    # Process transactions in chronological order
    for txn in transactions_2025:
        txn_type = txn["type"]
        timestamp = txn["timestamp"]

        for player in txn["players"]:
            pid = player["player_id"]
            action = player["action"]

            if pid not in history:
                history[pid] = {
                    "drafted_round": None,
                    "drafted_by": None,
                    "was_dropped": False,
                    "dropped_by": [],
                    "fa_pickups": [],
                    "trades": [],
                    "last_team": None,
                    "acquisition_chain": [],
                }

            h = history[pid]

            if action == "add":
                source = player["source_type"]
                dest_team = get_team_num(player["dest_team_key"]) if player["dest_team_key"] else None

                if source == "freeagents" or source == "waivers":
                    h["fa_pickups"].append({
                        "team": dest_team,
                        "timestamp": timestamp,
                    })
                    h["last_team"] = dest_team
                    h["acquisition_chain"].append({
                        "type": "fa_pickup",
                        "team": dest_team,
                        "source": source,
                        "timestamp": timestamp,
                    })

            elif action == "drop":
                source_team = get_team_num(player["source_team_key"]) if player.get("source_team_key") else h.get("last_team")
                h["was_dropped"] = True
                h["dropped_by"].append(source_team)
                h["acquisition_chain"].append({
                    "type": "drop",
                    "team": source_team,
                    "timestamp": timestamp,
                })

            elif action == "trade":
                source_team = get_team_num(player["source_team_key"]) if player.get("source_team_key") else None
                dest_team = get_team_num(player["dest_team_key"]) if player.get("dest_team_key") else None

                h["trades"].append({
                    "from_team": source_team,
                    "to_team": dest_team,
                    "timestamp": timestamp,
                })
                h["last_team"] = dest_team
                h["acquisition_chain"].append({
                    "type": "trade",
                    "from_team": source_team,
                    "to_team": dest_team,
                    "timestamp": timestamp,
                })

    return history


def trace_acquisition(player_id, current_team_num, history, draft_2025):
    """Trace a player's acquisition method for their current team.
    
    Returns: {
        method: 'drafted' | 'fa_pickup' | 'traded' | 'unknown',
        original_method: 'drafted' | 'fa_pickup' | 'unknown',  (before any trades)
        draft_round: int or None,
        was_dropped_and_reacquired: bool,
        original_team: team_num,
    }
    """
    h = history.get(player_id)
    if not h:
        return {
            "method": "unknown",
            "original_method": "unknown",
            "draft_round": None,
            "was_dropped_and_reacquired": False,
            "original_team": None,
        }

    chain = h["acquisition_chain"]
    if not chain:
        return {
            "method": "unknown",
            "original_method": "unknown",
            "draft_round": h.get("drafted_round"),
            "was_dropped_and_reacquired": False,
            "original_team": h.get("drafted_by"),
        }

    # Walk the chain to find how the current team got this player
    # and what the ORIGINAL acquisition was (before any trades)

    # Current holding: who last held this player?
    current_holder = None
    last_acquisition_for_current = None
    was_dropped = False

    # Track the "contract" — resets on drop+pickup
    contract_origin = chain[0]  # starts with first event

    for event in chain:
        if event["type"] == "draft":
            current_holder = event["team"]
            contract_origin = event

        elif event["type"] == "fa_pickup":
            current_holder = event["team"]
            contract_origin = event  # Contract resets on FA pickup

        elif event["type"] == "drop":
            was_dropped = True
            current_holder = None
            # After a drop, the next pickup resets the contract
            contract_origin = None

        elif event["type"] == "trade":
            current_holder = event["to_team"]
            # Trade does NOT reset contract — inherits from previous owner

    # Determine the method for the current team
    # Walk chain backwards to find how current_team_num got this player
    method = "unknown"
    for event in reversed(chain):
        if event["type"] == "draft" and event["team"] == current_team_num:
            method = "drafted"
            break
        elif event["type"] == "fa_pickup" and event["team"] == current_team_num:
            method = "fa_pickup"
            break
        elif event["type"] == "trade" and event.get("to_team") == current_team_num:
            method = "traded"
            break

    # Determine original acquisition method (what the contract is based on)
    original_method = "unknown"
    draft_round = None

    if contract_origin:
        if contract_origin["type"] == "draft":
            original_method = "drafted"
            draft_round = contract_origin["round"]
        elif contract_origin["type"] == "fa_pickup":
            original_method = "fa_pickup"
            draft_round = None
    else:
        # Contract was reset (dropped and never picked up with a new event?)
        original_method = "unknown"

    # Check if player was dropped and reacquired
    was_dropped_and_reacquired = was_dropped and method in ("fa_pickup", "traded")

    return {
        "method": method,
        "original_method": original_method,
        "draft_round": draft_round,
        "was_dropped_and_reacquired": was_dropped_and_reacquired,
        "original_team": h.get("drafted_by"),
        "contract_origin": contract_origin,
    }


def calculate_keeper_cost(keeper, ecr_lookup, draft_2024, draft_2025, 
                           keepers_2025, history, transactions_2025):
    """Calculate the correct keeper cost for a single keeper.
    
    Returns: (cost, reasoning_string)
    """
    player = keeper["players"]
    player_name = player["full_name"]
    yahoo_player_id = str(player["yahoo_player_id"])
    db_ecr = player.get("fantasypros_ecr")
    team_key = keeper["yahoo_team_key"]
    team_num = get_team_num(team_key)
    team_name = get_team_name(team_key)
    keeper_status = keeper["keeper_status"]

    # Get ECR rank
    ecr_rank = ecr_lookup(player_name, db_ecr)
    ecr_round = ecr_to_round(ecr_rank) if ecr_rank else 23

    # ── Special cases ──
    if keeper_status == "keeping-na":
        return (None, f"NA keeper — skipped (no regular cost)")

    if keeper_status == "keeping-7th":
        reason = f"7th keeper → always ECR cost. ECR rank {ecr_rank} → Rd {ecr_round}"
        if ecr_rank is None:
            reason = f"7th keeper → ECR cost, but no ECR rank found → Rd 23"
            ecr_round = 23
        return (ecr_round, reason)

    # ── Step 1: Determine acquisition method ──
    acq = trace_acquisition(yahoo_player_id, team_num, history, draft_2025)

    # ── Step 2: Was this player a 2025 keeper? ──
    is_2025_keeper = yahoo_player_id in keepers_2025

    # If player was dropped and re-acquired as FA, they're treated as new acquisition
    # Check if the contract was reset
    contract = acq.get("contract_origin")
    if contract and contract["type"] == "fa_pickup":
        # Contract was reset by FA pickup (after a drop)
        is_2025_keeper_for_cost = False  # Reset even if they were a 2025 keeper before
    else:
        is_2025_keeper_for_cost = is_2025_keeper

    # ── Step 3: Calculate cost ──
    reasoning_parts = []

    # Describe acquisition
    if acq["method"] == "drafted":
        reasoning_parts.append(f"Drafted Rd {acq['draft_round']} in 2025 by {TEAM_NAMES.get(str(acq.get('original_team', team_num)), team_num)}")
    elif acq["method"] == "fa_pickup":
        reasoning_parts.append(f"FA pickup in 2025 by {team_name}")
    elif acq["method"] == "traded":
        orig = acq["original_method"]
        if orig == "drafted":
            reasoning_parts.append(f"Traded to {team_name} (originally drafted Rd {acq['draft_round']})")
        elif orig == "fa_pickup":
            reasoning_parts.append(f"Traded to {team_name} (originally FA pickup)")
        else:
            reasoning_parts.append(f"Traded to {team_name}")
    elif acq["method"] == "unknown":
        # Try to figure out from draft data
        if yahoo_player_id in draft_2025:
            d = draft_2025[yahoo_player_id]
            reasoning_parts.append(f"Found in 2025 draft Rd {d['round']} by {TEAM_NAMES.get(d['team_num'], d['team_num'])}")
            acq["draft_round"] = d["round"]
            acq["original_method"] = "drafted"
        else:
            reasoning_parts.append(f"Unknown acquisition for {team_name}")

    # Describe keeper year
    if is_2025_keeper:
        reasoning_parts.append("was 2025 keeper (in both 2024 + 2025 drafts)")
    else:
        reasoning_parts.append("1st year keeper (new in 2025)")

    # Determine cost
    if is_2025_keeper_for_cost:
        # 2nd+ year → ECR cost
        cost = ecr_round
        if ecr_rank:
            reasoning_parts.append(f"2nd+ yr → ECR {ecr_rank} → Rd {ecr_round}")
        else:
            reasoning_parts.append(f"2nd+ yr → no ECR found → Rd 23")
            cost = 23
    else:
        # 1st year
        if acq["original_method"] == "drafted":
            cost = acq["draft_round"]
            reasoning_parts.append(f"1st yr, drafted → Rd {cost}")
        elif acq["original_method"] == "fa_pickup":
            cost = 23
            reasoning_parts.append(f"1st yr, FA pickup → Rd 23")
        else:
            # Unknown — check if in draft
            if yahoo_player_id in draft_2025:
                cost = draft_2025[yahoo_player_id]["round"]
                reasoning_parts.append(f"1st yr, found in draft → Rd {cost}")
            else:
                cost = 23
                reasoning_parts.append(f"1st yr, not in draft → Rd 23 (FA)")

    # ── Step 4: Drop + Pickup Protection Rule ──
    if acq.get("was_dropped_and_reacquired") or (contract and contract["type"] == "fa_pickup"):
        if ecr_rank and ecr_rank <= 60:
            # Top 5 rounds protection
            protected_cost = ecr_round
            original_draft = acq.get("draft_round")
            if original_draft:
                protected_cost = min(ecr_round, original_draft)
            if cost == 23 and protected_cost < 23:
                reasoning_parts.append(
                    f"⚠️ DROP PROTECTION: ECR {ecr_rank} (top 60), "
                    f"cannot keep at Rd 23 → Rd {protected_cost}"
                )
                cost = protected_cost

    reason = " | ".join(reasoning_parts)
    return (cost, reason)


# ── Main ──────────────────────────────────────────────────────────────────

def main():
    print("=" * 80)
    print("🏟️  THE SANDLOT — Keeper Cost Validation Script")
    print("=" * 80)
    print()

    # ── Step 1: Refresh token ──
    access_token = refresh_yahoo_token()
    print()

    # ── Step 2: Load all data ──
    print("📥 Loading data sources...")

    # ECR
    ecr_data = load_ecr()
    ecr_lookup = build_ecr_lookup(ecr_data)

    # Draft results
    print("  Loading 2024 draft results...")
    draft_2024 = load_draft_results(2024, access_token)
    print(f"    {len(draft_2024)} picks loaded")

    print("  Loading 2025 draft results...")
    draft_2025 = load_draft_results(2025, access_token)
    print(f"    {len(draft_2025)} picks loaded")

    # Also load clean picks if available
    if CACHE_PICKS_2025.exists():
        clean_picks = json.load(open(CACHE_PICKS_2025))
        # Merge into draft_2025 if missing
        for pid, info in clean_picks.items():
            if pid not in draft_2025:
                draft_2025[pid] = {
                    "round": info["round"],
                    "pick": info["pick"],
                    "team_key": info["team_key"],
                    "team_num": get_team_num(info["team_key"]),
                    "player_key": f"458.p.{pid}",
                }

    # Transactions
    print("  Loading 2025 transactions...")
    transactions_2025 = load_transactions_2025(access_token)
    print(f"    {len(transactions_2025)} transactions loaded")

    # Count by type
    type_counts = {}
    for t in transactions_2025:
        type_counts[t["type"]] = type_counts.get(t["type"], 0) + 1
    print(f"    Types: {type_counts}")

    # Keepers from DB
    print("  Loading keepers from database...")
    keepers_db = load_keepers_from_db()
    print(f"    {len(keepers_db)} keepers loaded")

    # End-of-2024 rosters (critical for keeper identification)
    print("  Loading 2024 end-of-season rosters...")
    rosters_2024_end = load_end_of_2024_rosters(access_token)
    total_rostered = sum(len(v) for v in rosters_2024_end.values())
    print(f"    {total_rostered} total players across {len(rosters_2024_end)} teams")

    # Draft board (offseason trades)
    print("  Loading draft board for offseason trades...")
    draft_board = load_draft_board()
    if draft_board:
        print("    ✅ Draft board loaded")

    print()

    # ── Step 3: Identify 2025 keepers ──
    print("🔍 Identifying 2025 keepers...")
    keepers_2025, keeper_details = identify_2025_keepers(
        draft_2024, draft_2025, rosters_2024_end
    )
    print(f"  Found {len(keepers_2025)} players who were kept in 2025")
    same_team = sum(1 for d in keeper_details.values() if not d.get("traded_offseason"))
    traded = sum(1 for d in keeper_details.values() if d.get("traded_offseason"))
    print(f"    Same team: {same_team}, Traded offseason: {traded}")
    print()

    # ── Step 4: Build player history ──
    print("📜 Building player movement history from transactions...")
    history = build_player_history(draft_2025, transactions_2025)
    print(f"  Tracking {len(history)} players")
    print()

    # ── Step 5: Calculate costs ──
    print("=" * 80)
    print("🧮 KEEPER COST VALIDATION RESULTS")
    print("=" * 80)
    print()

    results = []
    matches = 0
    mismatches = 0
    skipped = 0
    corrections = []

    # Group keepers by team for display
    keepers_by_team = {}
    for k in keepers_db:
        team_key = k["yahoo_team_key"]
        team_num = get_team_num(team_key)
        if team_num not in keepers_by_team:
            keepers_by_team[team_num] = []
        keepers_by_team[team_num].append(k)

    for team_num in sorted(keepers_by_team.keys(), key=lambda x: int(x)):
        team_name = TEAM_NAMES.get(team_num, f"Team {team_num}")
        team_keepers = keepers_by_team[team_num]
        print(f"── {team_name} (t.{team_num}) ──────────────────────────────")

        for keeper in sorted(team_keepers, key=lambda k: k["keeper_cost_round"] or 99):
            player = keeper["players"]
            player_name = player["full_name"]
            db_cost = keeper["keeper_cost_round"]
            status = keeper["keeper_status"]

            calc_cost, reason = calculate_keeper_cost(
                keeper, ecr_lookup, draft_2024, draft_2025,
                keepers_2025, history, transactions_2025
            )

            if status == "keeping-na":
                skipped += 1
                icon = "⏭️"
                match_str = "NA"
            elif calc_cost is None:
                skipped += 1
                icon = "⏭️"
                match_str = "SKIP"
            elif calc_cost == db_cost:
                matches += 1
                icon = "✅"
                match_str = "MATCH"
            else:
                mismatches += 1
                icon = "❌"
                match_str = f"MISMATCH (DB: Rd {db_cost}, Calc: Rd {calc_cost})"
                corrections.append({
                    "player_id": keeper["player_id"],
                    "player_name": player_name,
                    "yahoo_player_id": player["yahoo_player_id"],
                    "team": team_name,
                    "team_key": keeper["yahoo_team_key"],
                    "keeper_status": status,
                    "current_cost": db_cost,
                    "correct_cost": calc_cost,
                    "reason": reason,
                })

            status_tag = f" [{status}]" if status != "keeping" else ""
            print(f"  {icon} {player_name}{status_tag}: Rd {db_cost} → {match_str}")
            print(f"     {reason}")

            results.append({
                "player_name": player_name,
                "team": team_name,
                "status": status,
                "db_cost": db_cost,
                "calc_cost": calc_cost,
                "match": calc_cost == db_cost if calc_cost is not None else None,
                "reason": reason,
            })

        print()

    # ── Summary ──
    print("=" * 80)
    print("📊 SUMMARY")
    print("=" * 80)
    total = matches + mismatches + skipped
    print(f"  Total keepers: {total}")
    print(f"  ✅ Matches:    {matches}")
    print(f"  ❌ Mismatches: {mismatches}")
    print(f"  ⏭️  Skipped:    {skipped} (NA keepers)")
    print()

    if corrections:
        print("🔧 CORRECTIONS NEEDED:")
        print("-" * 80)
        for c in corrections:
            print(f"  {c['player_name']} ({c['team']})")
            print(f"    DB: Rd {c['current_cost']} → Should be: Rd {c['correct_cost']}")
            print(f"    Reason: {c['reason']}")
            print()

    # ── JSON Output ──
    output_file = CACHE_DIR / "keeper-cost-corrections.json"
    with open(output_file, "w") as f:
        json.dump(corrections, f, indent=2)
    print(f"📁 Corrections written to {output_file}")

    # Also write full results
    full_output = CACHE_DIR / "keeper-cost-full-results.json"
    with open(full_output, "w") as f:
        json.dump(results, f, indent=2)
    print(f"📁 Full results written to {full_output}")

    return mismatches


if __name__ == "__main__":
    sys.exit(main())
