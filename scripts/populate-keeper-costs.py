#!/usr/bin/env python3
"""
Populate keeper costs for all players in Supabase using 2025 Yahoo draft results.

Logic:
- If player was drafted in 2025 → keeper_cost_round = draft round
- If player was NOT drafted → FA/waiver pickup → Rd 23
- NEVER overwrite players with keeper_cost_source = 'yahoo-api-analysis' (manually verified)

Usage:
  cd ~/clawd/tunnel-snakes
  source .env.local
  python3 scripts/populate-keeper-costs.py
"""

import json
import os
import sys
import urllib.request
import urllib.parse

# ─── Config ───────────────────────────────────────────────
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://jfmonkthavktqyvtdhtr.supabase.co")
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DRAFT_FILE = "/tmp/draft-results-2025.json"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# ─── Step 1: Parse draft results ─────────────────────────
print("Step 1: Parsing 2025 draft results...")
with open(DRAFT_FILE) as f:
    raw = json.load(f)

draft_results = raw["fantasy_content"]["league"][1]["draft_results"]
total_picks = draft_results["count"]

# Build lookup: player_id → {round, pick, team_key}
draft_lookup = {}  # key = player numeric ID (e.g., "11370")
for i in range(total_picks):
    pick = draft_results[str(i)]["draft_result"]
    # player_key format: "458.p.XXXXX"
    player_id = pick["player_key"].split(".p.")[1]
    draft_lookup[player_id] = {
        "round": pick["round"],
        "pick": pick["pick"],
        "team_key": pick["team_key"],
    }

print(f"  Parsed {len(draft_lookup)} draft picks across {total_picks} total picks")

# Save clean draft data for reference
with open("/tmp/draft-picks-clean.json", "w") as f:
    json.dump(draft_lookup, f, indent=2)

# ─── Step 2: Fetch all players from Supabase ─────────────
print("\nStep 2: Fetching all players from Supabase...")


def supabase_get(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def supabase_patch(table, filter_params, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filter_params}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        return resp.status


# Fetch all players (paginate if needed)
all_players = []
offset = 0
PAGE_SIZE = 1000
while True:
    batch = supabase_get(
        f"players?select=id,full_name,yahoo_player_key,keeper_cost_round,keeper_cost_label,keeper_cost_source"
        f"&offset={offset}&limit={PAGE_SIZE}"
    )
    all_players.extend(batch)
    if len(batch) < PAGE_SIZE:
        break
    offset += PAGE_SIZE

print(f"  Fetched {len(all_players)} players")

# ─── Step 3: Match and update ────────────────────────────
print("\nStep 3: Matching draft picks and updating keeper costs...")

stats = {
    "skipped_manual": 0,
    "updated_drafted": 0,
    "updated_fa": 0,
    "already_has_cost": 0,
    "no_yahoo_key": 0,
    "errors": 0,
}

spot_checks = []

for player in all_players:
    name = player["full_name"]
    yahoo_key = player.get("yahoo_player_key")
    current_source = player.get("keeper_cost_source")

    # Skip players without yahoo key
    if not yahoo_key:
        stats["no_yahoo_key"] += 1
        continue

    # NEVER overwrite manually-verified costs
    if current_source == "yahoo-api-analysis":
        stats["skipped_manual"] += 1
        continue

    # Extract player numeric ID from 2026 key (469.p.XXXXX → XXXXX)
    player_id = yahoo_key.split(".p.")[1] if ".p." in yahoo_key else None
    if not player_id:
        stats["no_yahoo_key"] += 1
        continue

    # Check if player was drafted in 2025
    draft_info = draft_lookup.get(player_id)

    if draft_info:
        # Player was drafted
        rd = draft_info["round"]
        update_data = {
            "keeper_cost_round": rd,
            "keeper_cost_label": f"Drafted Rd {rd}",
            "keeper_cost_source": "yahoo-draft-2025",
        }
        stats["updated_drafted"] += 1
        if len(spot_checks) < 10:
            spot_checks.append(f"  ✅ {name}: Drafted Rd {rd} (pick {draft_info['pick']})")
    else:
        # Not drafted → FA/waiver pickup
        update_data = {
            "keeper_cost_round": 23,
            "keeper_cost_label": "FA — Rd 23",
            "keeper_cost_source": "yahoo-draft-2025-fa",
        }
        stats["updated_fa"] += 1
        if len(spot_checks) < 10 and stats["updated_fa"] <= 3:
            spot_checks.append(f"  🆓 {name}: FA — Rd 23 (not in 2025 draft)")

    # Update in Supabase
    try:
        filter_param = f"id=eq.{player['id']}"
        status = supabase_patch("players", filter_param, update_data)
    except Exception as e:
        print(f"  ❌ Error updating {name}: {e}")
        stats["errors"] += 1

# ─── Step 4: Summary ─────────────────────────────────────
print("\n" + "=" * 60)
print("RESULTS SUMMARY")
print("=" * 60)
print(f"Total players:           {len(all_players)}")
print(f"Skipped (manual/verified): {stats['skipped_manual']}")
print(f"Updated (drafted):       {stats['updated_drafted']}")
print(f"Updated (FA/waiver):     {stats['updated_fa']}")
print(f"No Yahoo key:            {stats['no_yahoo_key']}")
print(f"Errors:                  {stats['errors']}")
print(f"\nTotal updated:           {stats['updated_drafted'] + stats['updated_fa']}")

print("\nSpot-check examples:")
for sc in spot_checks:
    print(sc)

print("\nDone!")
