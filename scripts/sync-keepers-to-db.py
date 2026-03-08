#!/usr/bin/env python3
"""
Sync SNAKE_KEEPERS from draft-board/page.tsx → Supabase my_roster_players.

Overwrites ALL keeper data in Supabase to match the draft board source of truth.
"""

import os
import re
import sys
import json
import unicodedata
import urllib.request
import urllib.parse
import urllib.error

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

OWNER_TO_TEAM_KEY = {
    "Chris":  "469.l.24701.t.1",
    "Alex":   "469.l.24701.t.2",
    "Pudge":  "469.l.24701.t.3",
    "Sean":   "469.l.24701.t.4",
    "Tom":    "469.l.24701.t.5",
    "Greasy": "469.l.24701.t.6",
    "Web":    "469.l.24701.t.7",
    "Nick":   "469.l.24701.t.8",
    "Bob":    "469.l.24701.t.9",
    "Mike":   "469.l.24701.t.10",
    "Thomas": "469.l.24701.t.11",
    "Tyler":  "469.l.24701.t.12",
}

TSX_PATH = os.path.join(
    os.path.dirname(__file__), "..", "src", "app", "draft-board", "page.tsx"
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def supabase_get(endpoint: str) -> list:
    """GET from Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def supabase_patch(endpoint: str, body: dict) -> int:
    """PATCH Supabase REST API. Returns HTTP status."""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        print(f"  ⚠ PATCH {endpoint} → {e.code}: {e.read().decode()}")
        return e.code


def strip_accents(s: str) -> str:
    """Remove accent marks for fuzzy matching."""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def ordinal(n: int) -> str:
    """1→1st, 2→2nd, 3→3rd, 4→4th, etc."""
    if 11 <= (n % 100) <= 13:
        return f"{n}th"
    suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def make_label(keeper: dict) -> str:
    """Generate keeper_cost_label from keeper data."""
    if keeper.get("isNA"):
        return "NA keeper"
    if keeper.get("is7th"):
        year = keeper.get("year", "1yr")
        return f"7th keeper — {year}"
    year = keeper.get("year", "1yr")
    rd = keeper["round"]
    # Parse the year number
    m = re.match(r"(\d+)yr", year)
    if not m:
        return f"1st yr keeper — Rd {rd}"
    yr_num = int(m.group(1))
    if yr_num == 1:
        return f"1st yr keeper — Rd {rd}"
    elif yr_num == 2:
        return f"2nd yr keeper — ECR Rd {rd}"
    else:
        return f"{ordinal(yr_num)} yr keeper — ECR Rd {rd}"


def make_status(keeper: dict) -> str:
    """Determine keeper_status."""
    if keeper.get("isNA"):
        return "keeping-na"
    if keeper.get("is7th"):
        return "keeping-7th"
    return "keeping"


# ── Parse SNAKE_KEEPERS from TSX ────────────────────────────────────────────

def parse_snake_keepers(tsx_path: str) -> dict[str, list[dict]]:
    """Parse SNAKE_KEEPERS TypeScript constant into Python dicts."""
    with open(tsx_path, "r") as f:
        content = f.read()

    # Find the SNAKE_KEEPERS block
    start_match = re.search(
        r"const SNAKE_KEEPERS:\s*Record<string,\s*SnakeKeeper\[\]>\s*=\s*\{",
        content,
    )
    if not start_match:
        print("ERROR: Could not find SNAKE_KEEPERS in TSX file")
        sys.exit(1)

    # Find the closing of the object — track brace depth
    pos = start_match.start()
    brace_depth = 0
    block_start = None
    for i in range(pos, len(content)):
        if content[i] == "{":
            if brace_depth == 0:
                block_start = i
            brace_depth += 1
        elif content[i] == "}":
            brace_depth -= 1
            if brace_depth == 0:
                block_end = i + 1
                break
    
    block = content[block_start:block_end]

    # Parse each owner section
    keepers = {}
    # Match: OwnerName: [
    owner_pattern = re.compile(r"(\w+):\s*\[")
    
    for owner_match in owner_pattern.finditer(block):
        owner = owner_match.group(1)
        # Find the array contents — from [ to matching ]
        arr_start = owner_match.end() - 1  # position of [
        bracket_depth = 0
        arr_end = arr_start
        for i in range(arr_start, len(block)):
            if block[i] == "[":
                bracket_depth += 1
            elif block[i] == "]":
                bracket_depth -= 1
                if bracket_depth == 0:
                    arr_end = i + 1
                    break

        arr_content = block[arr_start:arr_end]

        # Parse each keeper object { ... }
        obj_pattern = re.compile(r"\{([^}]+)\}")
        owner_keepers = []
        for obj_match in obj_pattern.finditer(arr_content):
            obj_str = obj_match.group(1)
            keeper = {}

            # Extract fields
            # round: 2
            m = re.search(r"round:\s*(\d+)", obj_str)
            if m:
                keeper["round"] = int(m.group(1))

            # first: 'Name'
            m = re.search(r"first:\s*'([^']*)'", obj_str)
            if m:
                keeper["first"] = m.group(1)

            # last: 'Name'
            m = re.search(r"last:\s*'([^']*)'", obj_str)
            if m:
                keeper["last"] = m.group(1)

            # pos: 'XX'
            m = re.search(r"pos:\s*'([^']*)'", obj_str)
            if m:
                keeper["pos"] = m.group(1)

            # team: 'XXX'
            m = re.search(r"team:\s*'([^']*)'", obj_str)
            if m:
                keeper["team"] = m.group(1)

            # year?: 'Xyr'
            m = re.search(r"year:\s*'([^']*)'", obj_str)
            if m:
                keeper["year"] = m.group(1)

            # isNA?: true
            if re.search(r"isNA:\s*true", obj_str):
                keeper["isNA"] = True

            # is7th?: true
            if re.search(r"is7th:\s*true", obj_str):
                keeper["is7th"] = True

            if "first" in keeper and "last" in keeper:
                owner_keepers.append(keeper)

        if owner_keepers:
            keepers[owner] = owner_keepers

    return keepers


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("  SNAKE KEEPERS → SUPABASE SYNC")
    print("=" * 70)

    # Step 1: Parse SNAKE_KEEPERS
    tsx_path = os.path.abspath(TSX_PATH)
    print(f"\n📄 Parsing SNAKE_KEEPERS from:\n   {tsx_path}")
    snake_keepers = parse_snake_keepers(tsx_path)

    total_keepers = sum(len(v) for v in snake_keepers.values())
    print(f"   Found {len(snake_keepers)} owners, {total_keepers} total keepers")

    if total_keepers != 107:
        print(f"   ⚠ WARNING: Expected 107 keepers, found {total_keepers}")

    # Step 2: Process each team
    total_updated = 0
    total_not_keeping = 0
    total_not_found = 0

    for owner in sorted(snake_keepers.keys()):
        keepers = snake_keepers[owner]
        team_key = OWNER_TO_TEAM_KEY.get(owner)
        if not team_key:
            print(f"\n⚠ Unknown owner: {owner} — skipping")
            continue

        print(f"\n{'─' * 70}")
        print(f"👤 {owner} ({team_key}) — {len(keepers)} keepers")
        print(f"{'─' * 70}")

        # Fetch all roster players for this team
        endpoint = (
            f"my_roster_players?select=id,player_id,keeper_status,"
            f"keeper_cost_round,keeper_cost_label,players(full_name)"
            f"&yahoo_team_key=eq.{team_key}"
        )
        roster = supabase_get(endpoint)
        print(f"   Roster size: {len(roster)} players")

        # Build lookup: full_name → roster row
        name_to_row = {}
        for row in roster:
            fname = row.get("players", {}).get("full_name", "")
            if fname:
                name_to_row[fname] = row
                # Also index by stripped-accent version
                stripped = strip_accents(fname).lower()
                name_to_row[stripped] = row

        # Process each keeper
        keeper_ids = []
        for k in keepers:
            full_name = f"{k['first']} {k['last']}"
            status = make_status(k)
            label = make_label(k)
            cost_round = k["round"]

            # Find in roster
            row = name_to_row.get(full_name)
            if not row:
                # Try case-insensitive
                row = name_to_row.get(full_name.lower())
            if not row:
                # Try accent-stripped
                row = name_to_row.get(strip_accents(full_name).lower())
            if not row:
                # Special: Ohtani split — "(Batter)" for DH/OF, "(Pitcher)" for SP/RP
                pos = k.get("pos", "")
                if pos in ("SP", "RP"):
                    row = name_to_row.get(f"{full_name} (Pitcher)")
                else:
                    row = name_to_row.get(f"{full_name} (Batter)")

            if not row:
                print(f"   ❌ NOT FOUND: {full_name} — cannot update")
                total_not_found += 1
                continue

            row_id = row["id"]
            keeper_ids.append(row_id)
            db_name = row["players"]["full_name"]

            # Check if update needed
            old_status = row.get("keeper_status")
            old_round = row.get("keeper_cost_round")
            old_label = row.get("keeper_cost_label")

            changed = (
                old_status != status
                or old_round != cost_round
                or old_label != label
            )

            marker = "📝" if changed else "✅"
            print(f"   {marker} {db_name:<30s} → {status:<14s} Rd {cost_round:<3d} | {label}")

            if changed:
                patch_endpoint = f"my_roster_players?id=eq.{row_id}"
                patch_body = {
                    "keeper_status": status,
                    "keeper_cost_round": cost_round,
                    "keeper_cost_label": label,
                }
                code = supabase_patch(patch_endpoint, patch_body)
                if code < 300:
                    total_updated += 1
                    change_parts = []
                    if old_status != status:
                        change_parts.append(f"status: {old_status}→{status}")
                    if old_round != cost_round:
                        change_parts.append(f"round: {old_round}→{cost_round}")
                    if old_label != label:
                        change_parts.append(f"label: '{old_label}'→'{label}'")
                    print(f"      Changed: {', '.join(change_parts)}")

        # Set everyone else to not-keeping
        if keeper_ids:
            ids_csv = ",".join(keeper_ids)
            not_keeping_endpoint = (
                f"my_roster_players?yahoo_team_key=eq.{team_key}"
                f"&id=not.in.({ids_csv})"
            )
            patch_body = {
                "keeper_status": "not-keeping",
                "keeper_cost_round": None,
                "keeper_cost_label": None,
            }
            code = supabase_patch(not_keeping_endpoint, patch_body)
            # Count how many were set to not-keeping
            non_keeper_count = len(roster) - len(keeper_ids)
            total_not_keeping += non_keeper_count
            print(f"   → Set {non_keeper_count} other players to not-keeping")

    # Summary
    print(f"\n{'=' * 70}")
    print(f"  SUMMARY")
    print(f"{'=' * 70}")
    print(f"  Total keepers processed: {total_keepers}")
    print(f"  Updates applied:         {total_updated}")
    print(f"  Already correct:         {total_keepers - total_updated - total_not_found}")
    print(f"  Players not found:       {total_not_found}")
    print(f"  Set to not-keeping:      {total_not_keeping}")
    print(f"{'=' * 70}")

    if total_not_found > 0:
        print(f"\n⚠ {total_not_found} keeper(s) could not be matched — review above")
        sys.exit(1)
    else:
        print(f"\n✅ All {total_keepers} keepers synced successfully!")


if __name__ == "__main__":
    main()
