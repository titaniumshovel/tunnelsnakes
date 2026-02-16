#!/usr/bin/env python3
"""
Enrich ALL players in the Supabase `players` table with FantasyPros ECR data.
Mirrors the logic from the existing route.ts but covers every player, not just Chris's roster.
"""

import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone

import requests

# ── Config ──────────────────────────────────────────────────────────────────
# Load .env.local
env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = "https://jfmonkthavktqyvtdhtr.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
FP_URL = "https://www.fantasypros.com/mlb/rankings/overall.php"

HEADERS_FP = {
    "user-agent": "Mozilla/5.0 (compatible; tunnel-snakes/1.0; +https://tunnel-snakes.vercel.app)",
    "accept": "text/html,application/xhtml+xml",
}
HEADERS_SB = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


# ── Helpers ─────────────────────────────────────────────────────────────────
def normalize(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return s


def extract_ecr_data(html: str) -> dict:
    marker = "var ecrData = "
    idx = html.find(marker)
    if idx < 0:
        raise RuntimeError("Could not find ecrData in FantasyPros HTML")
    start = html.index("{", idx)
    level = 0
    end = -1
    for i in range(start, len(html)):
        ch = html[i]
        if ch == "{":
            level += 1
        elif ch == "}":
            level -= 1
            if level == 0:
                end = i + 1
                break
    if end < 0:
        raise RuntimeError("Could not find ecrData object end")
    return json.loads(html[start:end])


# ── Step 1: Fetch FantasyPros ───────────────────────────────────────────────
print("→ Fetching FantasyPros overall rankings…")
resp = requests.get(FP_URL, headers=HEADERS_FP, timeout=30)
resp.raise_for_status()
ecr = extract_ecr_data(resp.text)
fp_players = ecr.get("players", [])
print(f"  Got {len(fp_players)} players from FantasyPros")

# Build lookup: normalized name → best-ranked entry
fp_map: dict[str, dict] = {}
for p in fp_players:
    key = normalize(str(p.get("player_name", "")))
    if not key:
        continue
    existing = fp_map.get(key)
    if not existing or (p.get("rank_ecr") and p["rank_ecr"] < existing.get("rank_ecr", 9999)):
        fp_map[key] = p


# ── Step 2: Fetch ALL Supabase players ──────────────────────────────────────
print("→ Fetching all players from Supabase…")
sb_players = []
# Supabase default limit is 1000, but use pagination to be safe
offset = 0
PAGE = 1000
while True:
    url = f"{SUPABASE_URL}/rest/v1/players?select=id,full_name&offset={offset}&limit={PAGE}"
    r = requests.get(url, headers=HEADERS_SB, timeout=15)
    r.raise_for_status()
    page = r.json()
    sb_players.extend(page)
    if len(page) < PAGE:
        break
    offset += PAGE

print(f"  Got {len(sb_players)} players from Supabase")


# ── Step 3: Match & update ──────────────────────────────────────────────────
print("→ Matching and updating…")
now = datetime.now(timezone.utc).isoformat()
matched = 0
unmatched = []
match_details = []  # (player_name, ecr_rank)

for sp in sb_players:
    key = normalize(sp["full_name"])
    fp = fp_map.get(key)
    if not fp:
        unmatched.append(sp["full_name"])
        continue

    patch = {
        "fantasypros_ecr": fp.get("rank_ecr"),
    }
    url = f"{SUPABASE_URL}/rest/v1/players?id=eq.{sp['id']}"
    r = requests.patch(url, json=patch, headers=HEADERS_SB, timeout=10)
    if r.status_code < 300:
        matched += 1
        match_details.append((sp["full_name"], fp.get("rank_ecr"), fp.get("pos_rank")))
    else:
        print(f"  ⚠ PATCH failed for {sp['full_name']}: {r.status_code} {r.text}")

print(f"\n{'='*60}")
print(f"✅ Updated {matched}/{len(sb_players)} players with ECR data")

# ── Results ─────────────────────────────────────────────────────────────────
# Top 10 by ECR
match_details.sort(key=lambda x: x[1] if x[1] else 9999)
print(f"\n🏆 Top 10 by ECR (in our league):")
for i, (name, ecr, pos) in enumerate(match_details[:10], 1):
    print(f"  {i:2d}. {name} — ECR #{ecr} ({pos})")

# Chase Burns
chase = [m for m in match_details if "chase burns" in m[0].lower()]
if chase:
    print(f"\n🔥 Chase Burns: ECR #{chase[0][1]} ({chase[0][2]})")
else:
    print("\n⚠ Chase Burns: NOT FOUND in ECR matches")
    # check FantasyPros directly
    fp_chase = [p for p in fp_players if "chase burns" in p.get("player_name", "").lower()]
    if fp_chase:
        print(f"  (Found on FantasyPros: ECR #{fp_chase[0].get('rank_ecr')} — name mismatch?)")

# Unmatched
print(f"\n❌ Unmatched players ({len(unmatched)}):")
for name in sorted(unmatched):
    print(f"  - {name}")

# ── Write summary JSON for reporting ────────────────────────────────────────
summary = {
    "total_supabase": len(sb_players),
    "total_fp": len(fp_players),
    "matched": matched,
    "unmatched_count": len(unmatched),
    "unmatched_names": sorted(unmatched),
    "top10": [(n, e, p) for n, e, p in match_details[:10]],
    "chase_burns": chase[0] if chase else None,
}
summary_path = os.path.join(os.path.dirname(__file__), "ecr-summary.json")
with open(summary_path, "w") as f:
    json.dump(summary, f, indent=2)
print(f"\n📄 Summary written to {summary_path}")
