#!/usr/bin/env python3
"""
The Sandlot Times — Daily Edition Pipeline
============================================
Fetches MLB news from RSS feeds + Reddit, analyzes with AI,
generates a hero image, and writes the edition to Supabase.

Usage:
    python3 sandlot-times-pipeline.py              # Normal run
    python3 sandlot-times-pipeline.py --dry-run    # Skip Supabase write
    python3 sandlot-times-pipeline.py --lookback 48  # Hours to look back (default 24)
"""

import json
import os
import sys
import subprocess
import time
import hashlib
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin

# Third-party
import feedparser
import requests

# ─── Configuration ────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_DIR = SCRIPT_DIR.parent
ENV_FILE = PROJECT_DIR / ".env.local"

# Also check .env if .env.local doesn't exist
if not ENV_FILE.exists():
    ENV_FILE = PROJECT_DIR / ".env"

def load_env(path: Path) -> dict:
    """Load .env file into a dict (simple key=value parser)."""
    env = {}
    if not path.exists():
        return env
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, _, value = line.partition('=')
                env[key.strip()] = value.strip()
    return env

# Load environment
dotenv = load_env(ENV_FILE)
# Also try the clawd-level .env for RDSEC_API_KEY
clawd_env = load_env(Path.home() / "clawd" / ".env")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or dotenv.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or dotenv.get("SUPABASE_SERVICE_ROLE_KEY")
RDSEC_API_KEY = os.environ.get("RDSEC_API_KEY") or dotenv.get("RDSEC_API_KEY") or clawd_env.get("RDSEC_API_KEY")

RDSEC_API_URL = "https://api.rdsec.trendmicro.com/prod/aiendpoint/v1/chat/completions"
RDSEC_MODEL = "claude-4.5-haiku"

IMAGE_SCRIPT = Path.home() / "clawd" / "scripts" / "generate-image.sh"

# Manager mapping
MANAGERS = {
    "469.l.24701.t.1": "Chris",
    "469.l.24701.t.2": "Alex",
    "469.l.24701.t.3": "Pudge",
    "469.l.24701.t.4": "Sean",
    "469.l.24701.t.5": "Tom",
    "469.l.24701.t.6": "Greasy",
    "469.l.24701.t.7": "Web",
    "469.l.24701.t.8": "Nick",
    "469.l.24701.t.9": "Bob",
    "469.l.24701.t.10": "Mike",
    "469.l.24701.t.11": "Thomas",
    "469.l.24701.t.12": "Tyler",
}

MANAGER_NAMES = list(MANAGERS.values())

# RSS feeds
RSS_FEEDS = [
    {"url": "https://www.mlb.com/feeds/news/rss.xml", "source": "MLB.com"},
    {"url": "https://www.espn.com/espn/rss/mlb/news", "source": "ESPN"},
    {"url": "https://www.cbssports.com/rss/headlines/mlb/", "source": "CBS Sports"},
    {"url": "https://www.rotoworld.com/rss/feed.xml", "source": "Rotoworld"},
]

REDDIT_URL = "https://www.reddit.com/r/fantasybaseball/hot.json?limit=20"
REDDIT_HEADERS = {"User-Agent": "SandlotTimes/1.0 (Fantasy Baseball League Newsletter)"}


# ─── RSS Fetching ─────────────────────────────────────────────────

def fetch_feed(feed_config: dict, cutoff: datetime) -> list[dict]:
    """Fetch and parse a single RSS feed, returning items from the last N hours."""
    url = feed_config["url"]
    source = feed_config["source"]
    items = []

    try:
        feed = feedparser.parse(url)
        if feed.bozo and not feed.entries:
            print(f"  ⚠ {source}: Feed parse error — {feed.bozo_exception}")
            return []

        for entry in feed.entries:
            # Parse published date
            published = None
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                published = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)

            # If no date, include it anyway (better to have too much than miss)
            if published and published < cutoff:
                continue

            summary = ""
            if hasattr(entry, 'summary'):
                summary = entry.summary[:500]  # Truncate long summaries
            elif hasattr(entry, 'description'):
                summary = entry.description[:500]

            items.append({
                "title": entry.get("title", "Untitled"),
                "summary": summary,
                "url": entry.get("link", ""),
                "source": source,
                "published_date": published.isoformat() if published else None,
            })

        print(f"  ✓ {source}: {len(items)} items")
    except Exception as e:
        print(f"  ✗ {source}: {e}")

    return items


def fetch_all_feeds(lookback_hours: int = 24) -> list[dict]:
    """Fetch all RSS feeds in parallel."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
    all_items = []

    print("📡 Fetching RSS feeds...")
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(fetch_feed, feed, cutoff): feed["source"]
            for feed in RSS_FEEDS
        }
        for future in as_completed(futures):
            items = future.result()
            all_items.extend(items)

    return all_items


def fetch_reddit(lookback_hours: int = 24) -> list[dict]:
    """Fetch hot posts from r/fantasybaseball."""
    cutoff_ts = (datetime.now(timezone.utc) - timedelta(hours=lookback_hours)).timestamp()
    items = []

    print("📡 Fetching Reddit r/fantasybaseball...")
    try:
        resp = requests.get(REDDIT_URL, headers=REDDIT_HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        for post in data.get("data", {}).get("children", []):
            pdata = post.get("data", {})
            created = pdata.get("created_utc", 0)

            # Filter by recency
            if created < cutoff_ts:
                continue

            # Skip stickied mod posts
            if pdata.get("stickied"):
                continue

            items.append({
                "title": pdata.get("title", ""),
                "summary": (pdata.get("selftext", "") or "")[:500],
                "url": f"https://reddit.com{pdata.get('permalink', '')}",
                "source": "r/fantasybaseball",
                "published_date": datetime.fromtimestamp(created, tz=timezone.utc).isoformat(),
            })

        print(f"  ✓ Reddit: {len(items)} posts")
    except Exception as e:
        print(f"  ✗ Reddit: {e}")

    return items


# ─── Supabase Queries ─────────────────────────────────────────────

def supabase_get(table: str, params: dict = None) -> list[dict]:
    """Query Supabase REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  ⚠ Supabase credentials not configured, skipping query")
        return []

    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
    }

    try:
        resp = requests.get(url, headers=headers, params=params or {}, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  ⚠ Supabase query {table}: {e}")
        return []


def fetch_league_rosters() -> str:
    """Fetch current league rosters for AI context."""
    print("📋 Fetching league roster data...")

    # Get roster assignments
    rosters = supabase_get("my_roster_players", {"select": "team_key,player_id"})
    # Get player names
    players = supabase_get("players", {"select": "id,full_name,editorial_team_abbr,display_position"})

    if not rosters or not players:
        return "League roster data unavailable."

    # Build player lookup
    player_map = {p["id"]: p for p in players}

    # Group by manager
    manager_rosters = {}
    for r in rosters:
        team_key = r.get("team_key", "")
        manager = MANAGERS.get(team_key, team_key)
        player = player_map.get(r.get("player_id"))
        if player:
            if manager not in manager_rosters:
                manager_rosters[manager] = []
            manager_rosters[manager].append(
                f"{player.get('full_name', '?')} ({player.get('display_position', '?')}, {player.get('editorial_team_abbr', '?')})"
            )

    # Format as text
    lines = []
    for mgr, players_list in sorted(manager_rosters.items()):
        lines.append(f"\n{mgr}'s roster: {', '.join(players_list[:15])}")
        if len(players_list) > 15:
            lines.append(f"  ...and {len(players_list) - 15} more")

    return "\n".join(lines) if lines else "No roster data found."


# ─── AI Analysis ──────────────────────────────────────────────────

def analyze_with_ai(news_items: list[dict], roster_context: str) -> dict:
    """Send news items to AI for analysis and edition generation."""
    print("🤖 Analyzing with AI...")

    if not RDSEC_API_KEY:
        print("  ✗ RDSEC_API_KEY not set!")
        return generate_fallback_edition(news_items)

    today = datetime.now().strftime("%A, %B %d, %Y")

    # Prepare news digest for AI
    news_text = ""
    for i, item in enumerate(news_items[:50], 1):  # Cap at 50 items
        news_text += f"\n{i}. [{item['source']}] {item['title']}"
        if item.get('summary'):
            news_text += f"\n   {item['summary'][:200]}"
        if item.get('url'):
            news_text += f"\n   URL: {item['url']}"
        news_text += "\n"

    system_prompt = f"""You are the editor of The Sandlot Times, a daily newsletter for "The Sandlot" — a 12-team Yahoo fantasy baseball league. Your tone is fun, knowledgeable, and slightly irreverent. Think of yourself as the Bill Simmons of fantasy baseball newsletters.

Today is {today}.

LEAGUE MANAGERS: {', '.join(MANAGER_NAMES)}

LEAGUE ROSTERS (current):
{roster_context}

Analyze the following MLB news items and produce a daily edition of The Sandlot Times.

OUTPUT FORMAT — respond with valid JSON only, no markdown code fences:
{{
  "headline": "Catchy edition title for today (e.g., 'Shohei Does It Again' or 'Trade Deadline Chaos')",
  "mlb_headlines": [
    {{
      "title": "Headline title",
      "summary": "2-3 sentence summary of the story",
      "source_url": "original URL if available",
      "tags": ["injuries", "trades", "rookies", etc.]
    }}
  ],
  "fantasy_impact": [
    {{
      "title": "Fantasy-relevant headline",
      "analysis": "How this affects fantasy owners — pickups, drops, lineup advice",
      "affected_players": ["Player Name 1", "Player Name 2"]
    }}
  ],
  "league_watch": [
    {{
      "title": "How this affects our league specifically",
      "analysis": "Which managers should care and why",
      "affected_managers": ["Manager Name"],
      "affected_team_keys": ["469.l.24701.t.X"]
    }}
  ],
  "hot_take": "A fun, opinionated editorial paragraph from Smalls (the league AI). Be witty, make predictions, call out managers by name, reference the league. 3-5 sentences.",
  "hero_image_prompt": "A descriptive prompt for generating a hero banner image based on today's top story. Style: vintage baseball card meets newspaper front page, dramatic lighting."
}}

GUIDELINES:
- Include 3-8 MLB headlines (the most important stories)
- Include 2-5 fantasy impact items (actionable analysis)
- Include 1-3 league watch items (only if news actually affects rostered players)
- The hot take should be entertaining and reference specific managers when relevant
- If it's offseason, focus on trades, signings, and spring training
- If league rosters are available, cross-reference affected players to specific managers
- Be accurate with URLs — use the source_url from the input when available"""

    user_prompt = f"Here are today's MLB news items:\n{news_text}"

    payload = {
        "model": RDSEC_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 4000,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {RDSEC_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(RDSEC_API_URL, json=payload, headers=headers, timeout=120)
        resp.raise_for_status()
        result = resp.json()

        content = result["choices"][0]["message"]["content"]

        # Strip markdown code fences if present
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        edition = json.loads(content)
        print(f"  ✓ AI analysis complete — {len(edition.get('mlb_headlines', []))} headlines")
        return edition

    except json.JSONDecodeError as e:
        print(f"  ✗ AI returned invalid JSON: {e}")
        print(f"    Raw content: {content[:200]}...")
        return generate_fallback_edition(news_items)
    except Exception as e:
        print(f"  ✗ AI analysis failed: {e}")
        return generate_fallback_edition(news_items)


def generate_fallback_edition(news_items: list[dict]) -> dict:
    """Generate a basic edition without AI if the API fails."""
    print("  ⚠ Using fallback edition generator")
    headlines = []
    for item in news_items[:5]:
        headlines.append({
            "title": item["title"],
            "summary": item.get("summary", "")[:200],
            "source_url": item.get("url", ""),
            "tags": [item.get("source", "unknown")],
        })

    return {
        "headline": f"MLB News Roundup — {datetime.now().strftime('%B %d')}",
        "mlb_headlines": headlines,
        "fantasy_impact": [],
        "league_watch": [],
        "hot_take": "The Sandlot Times AI editor is taking a personal day. Here are the raw headlines. — Smalls 🤖",
        "hero_image_prompt": "A vintage newspaper front page about baseball, dramatic sepia tones, 'EXTRA EXTRA' headline",
    }


# ─── Hero Image Generation ───────────────────────────────────────

def generate_hero_image(prompt: str) -> str | None:
    """Generate hero banner image using the image generation script."""
    if not IMAGE_SCRIPT.exists():
        print(f"  ⚠ Image script not found at {IMAGE_SCRIPT}")
        return None

    output_path = f"/tmp/sandlot-times-hero-{datetime.now().strftime('%Y%m%d')}.png"

    print("🎨 Generating hero image...")
    try:
        result = subprocess.run(
            [str(IMAGE_SCRIPT), prompt, output_path, "16:9"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0 and Path(output_path).exists():
            print(f"  ✓ Hero image saved to {output_path}")
            # Upload to Supabase Storage or return local path
            # For now, we'll upload to Supabase storage
            return upload_image_to_supabase(output_path)
        else:
            print(f"  ✗ Image generation failed: {result.stderr[:200]}")
            return None
    except subprocess.TimeoutExpired:
        print("  ✗ Image generation timed out")
        return None
    except Exception as e:
        print(f"  ✗ Image generation error: {e}")
        return None


def upload_image_to_supabase(local_path: str) -> str | None:
    """Upload image to Supabase Storage and return public URL."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None

    filename = f"sandlot-times-{datetime.now().strftime('%Y%m%d')}.png"
    bucket = "images"
    storage_path = f"editions/{filename}"

    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/png",
        "x-upsert": "true",
    }

    try:
        with open(local_path, "rb") as f:
            resp = requests.post(url, headers=headers, data=f, timeout=30)

        if resp.status_code in (200, 201):
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}"
            print(f"  ✓ Image uploaded: {public_url}")
            return public_url
        else:
            print(f"  ⚠ Image upload failed ({resp.status_code}): {resp.text[:200]}")
            # Fall back to no image
            return None
    except Exception as e:
        print(f"  ⚠ Image upload error: {e}")
        return None


# ─── Supabase Write ───────────────────────────────────────────────

def write_edition_to_supabase(edition: dict, raw_count: int, hero_url: str | None) -> bool:
    """Write the edition to Supabase editions table."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("  ✗ Supabase credentials missing!")
        return False

    today = datetime.now().strftime("%Y-%m-%d")
    url = f"{SUPABASE_URL}/rest/v1/editions"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",  # Upsert on unique(date)
    }

    payload = {
        "date": today,
        "headline": edition.get("headline", f"The Sandlot Times — {today}"),
        "hero_image_url": hero_url,
        "hero_image_prompt": edition.get("hero_image_prompt"),
        "mlb_headlines": edition.get("mlb_headlines", []),
        "fantasy_impact": edition.get("fantasy_impact", []),
        "league_watch": edition.get("league_watch", []),
        "hot_take": edition.get("hot_take"),
        "power_rankings": edition.get("power_rankings", []),
        "raw_items_count": raw_count,
        "status": "published",
    }

    print("💾 Writing edition to Supabase...")
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=15)
        if resp.status_code in (200, 201):
            print(f"  ✓ Edition saved for {today}")
            return True
        else:
            print(f"  ✗ Supabase write failed ({resp.status_code}): {resp.text[:300]}")
            return False
    except Exception as e:
        print(f"  ✗ Supabase write error: {e}")
        return False


# ─── Main Pipeline ────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="The Sandlot Times — Daily Edition Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Skip Supabase write")
    parser.add_argument("--lookback", type=int, default=24, help="Hours to look back for news (default: 24)")
    parser.add_argument("--no-image", action="store_true", help="Skip hero image generation")
    args = parser.parse_args()

    print("=" * 60)
    print("📰 THE SANDLOT TIMES — Daily Edition Pipeline")
    print(f"   {datetime.now().strftime('%A, %B %d, %Y at %I:%M %p')}")
    print("=" * 60)

    # Validate credentials
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n⚠ WARNING: Supabase credentials not found!")
        if not args.dry_run:
            print("  Run with --dry-run or set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")

    if not RDSEC_API_KEY:
        print("\n⚠ WARNING: RDSEC_API_KEY not found — AI analysis will use fallback")

    # Step 1: Fetch news
    print("\n─── STEP 1: Gather News ───")
    rss_items = fetch_all_feeds(args.lookback)
    reddit_items = fetch_reddit(args.lookback)
    all_items = rss_items + reddit_items

    print(f"\n📊 Total items collected: {len(all_items)}")
    if not all_items:
        print("  No news items found! Try increasing --lookback")
        # Still generate an edition with a "slow news day" take
        all_items = [{"title": "Slow news day in baseball", "summary": "No major news in the last 24 hours", "url": "", "source": "Editor"}]

    # Step 2: Fetch league context
    print("\n─── STEP 2: League Context ───")
    roster_context = fetch_league_rosters()

    # Step 3: AI analysis
    print("\n─── STEP 3: AI Analysis ───")
    edition = analyze_with_ai(all_items, roster_context)

    # Step 4: Hero image
    hero_url = None
    if not args.no_image and edition.get("hero_image_prompt"):
        print("\n─── STEP 4: Hero Image ───")
        hero_url = generate_hero_image(edition["hero_image_prompt"])
    else:
        print("\n─── STEP 4: Hero Image (skipped) ───")

    # Step 5: Write to Supabase
    print("\n─── STEP 5: Publish ───")
    if args.dry_run:
        print("  🔸 DRY RUN — skipping Supabase write")
        print(f"\n  Edition preview:")
        print(f"    Headline: {edition.get('headline', 'N/A')}")
        print(f"    MLB Headlines: {len(edition.get('mlb_headlines', []))}")
        print(f"    Fantasy Impact: {len(edition.get('fantasy_impact', []))}")
        print(f"    League Watch: {len(edition.get('league_watch', []))}")
        print(f"    Hot Take: {(edition.get('hot_take', '') or '')[:100]}...")
        print(f"\n  Full JSON:")
        print(json.dumps(edition, indent=2))
    else:
        success = write_edition_to_supabase(edition, len(all_items), hero_url)
        if not success:
            print("\n❌ Pipeline failed to publish edition")
            sys.exit(1)

    # Summary
    print("\n" + "=" * 60)
    print("✅ Pipeline complete!")
    print(f"   📰 \"{edition.get('headline', 'N/A')}\"")
    print(f"   📊 {len(all_items)} raw items → {len(edition.get('mlb_headlines', []))} headlines")
    print(f"   🎯 {len(edition.get('fantasy_impact', []))} fantasy impacts")
    print(f"   👀 {len(edition.get('league_watch', []))} league watch items")
    if hero_url:
        print(f"   🎨 Hero image: {hero_url}")
    print("=" * 60)


if __name__ == "__main__":
    main()
