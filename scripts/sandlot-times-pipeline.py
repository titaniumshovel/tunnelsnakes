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
import re
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
from dateutil.parser import parse as dateutil_parse

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

def _parse_entry_date(entry) -> datetime | None:
    """Try multiple strategies to parse an RSS entry's publication date."""
    # Strategy 1: feedparser's pre-parsed date (normalized to UTC struct_time)
    if hasattr(entry, 'published_parsed') and entry.published_parsed:
        return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
    if hasattr(entry, 'updated_parsed') and entry.updated_parsed:
        return datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)

    # Strategy 2: raw date string via dateutil (handles many formats)
    raw_date = getattr(entry, 'published', None) or getattr(entry, 'updated', None)
    if raw_date:
        try:
            dt = dateutil_parse(raw_date)
            # If naive (no timezone), assume UTC
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except (ValueError, OverflowError):
            pass

    return None


def fetch_feed(feed_config: dict, cutoff: datetime) -> list[dict]:
    """Fetch and parse a single RSS feed, returning items from the last N hours."""
    url = feed_config["url"]
    source = feed_config["source"]
    items = []
    now = datetime.now(timezone.utc)
    skipped_no_date = 0
    skipped_stale = 0

    try:
        feed = feedparser.parse(url)
        if feed.bozo and not feed.entries:
            print(f"  ⚠ {source}: Feed parse error — {feed.bozo_exception}")
            return []

        for entry in feed.entries:
            # Parse published date with multiple fallback strategies
            published = _parse_entry_date(entry)

            # STRICT: If no date can be parsed, EXCLUDE the item
            # This prevents stale undated articles from slipping through
            if published is None:
                skipped_no_date += 1
                continue

            # Cap future-dated articles at now (some feeds have bad dates)
            if published > now:
                published = now

            # Filter by cutoff — the core lookback check
            if published < cutoff:
                skipped_stale += 1
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
                "published_date": published.isoformat(),
            })

        log_parts = [f"{len(items)} items"]
        if skipped_stale:
            log_parts.append(f"{skipped_stale} stale")
        if skipped_no_date:
            log_parts.append(f"{skipped_no_date} undated/skipped")
        print(f"  ✓ {source}: {', '.join(log_parts)}")
    except Exception as e:
        print(f"  ✗ {source}: {e}")

    return items


def _normalize_title(title: str) -> str:
    """Normalize a title for dedup comparison."""
    # Lowercase, strip punctuation, collapse whitespace
    t = title.lower().strip()
    t = re.sub(r'[^\w\s]', '', t)
    t = re.sub(r'\s+', ' ', t)
    return t


def _dedup_items(items: list[dict]) -> list[dict]:
    """Deduplicate items by URL and normalized title."""
    seen_urls = set()
    seen_titles = set()
    deduped = []

    for item in items:
        # Dedup by URL (exact match, ignoring trailing slashes and query params)
        url = item.get("url", "").rstrip("/").split("?")[0]
        if url and url in seen_urls:
            continue

        # Dedup by normalized title (catches same story from different sources)
        norm_title = _normalize_title(item.get("title", ""))
        if norm_title and norm_title in seen_titles:
            continue

        if url:
            seen_urls.add(url)
        if norm_title:
            seen_titles.add(norm_title)
        deduped.append(item)

    return deduped


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

    # Deduplicate across all feeds
    before_count = len(all_items)
    all_items = _dedup_items(all_items)
    if before_count != len(all_items):
        print(f"  🔄 Dedup: {before_count} → {len(all_items)} items ({before_count - len(all_items)} duplicates removed)")

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

    # Prepare news digest for AI — include dates so AI can see recency
    news_text = ""
    for i, item in enumerate(news_items[:50], 1):  # Cap at 50 items
        date_str = item.get('published_date', 'unknown date')
        news_text += f"\n{i}. [{item['source']}] [{date_str}] {item['title']}"
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
  "hero_image_prompt": "Brief 1-sentence description of the top story's visual theme (e.g., 'A star pitcher returning from injury takes the mound at spring training'). This is used as a seed for detailed image prompt generation."
}}

GUIDELINES:
- Include 3-8 MLB headlines (the most important stories)
- Include 2-5 fantasy impact items (actionable analysis)
- Include 1-3 league watch items (only if news actually affects rostered players)
- The hot take should be entertaining and reference specific managers when relevant
- If it's offseason, focus on trades, signings, and spring training
- If league rosters are available, cross-reference affected players to specific managers
- Be accurate with URLs — use the source_url from the input when available

CRITICAL — ONLY use stories from the provided news items below. Do NOT invent, recall, or hallucinate stories from your training data. Every headline and fact in your output must trace back to a specific numbered item in the input. If there are few items, produce a shorter edition — do NOT pad with made-up stories."""

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
        "hero_image_prompt": "A warm vintage baseball newspaper front page, earth tones and sepia, classic sandlot field aesthetic, hand-painted feel",
    }


# ─── News-Driven Hero Image Prompt ────────────────────────────────

def generate_news_driven_image_prompt(edition: dict, news_items: list[dict]) -> str:
    """
    Generate a news-driven hero image prompt using a dedicated AI call.

    Instead of relying on a brief instruction buried in the main analysis prompt,
    this function takes the edition's top story and crafts a vivid, specific scene
    prompt that visually represents the day's most important baseball news.

    Inspired by news.aatf.ai's approach of creating banners that depict the actual
    news content rather than generic imagery.
    """
    print("🎨 Generating news-driven image prompt...")

    if not RDSEC_API_KEY:
        print("  ⚠ No API key — using fallback prompt from edition")
        return edition.get("hero_image_prompt", "A vintage baseball newspaper front page")

    # Gather the top story context
    top_headline = ""
    top_summary = ""
    hot_take = edition.get("hot_take", "")

    # Use the #1 MLB headline as the primary story
    mlb_headlines = edition.get("mlb_headlines", [])
    if mlb_headlines:
        top_headline = mlb_headlines[0].get("title", "")
        top_summary = mlb_headlines[0].get("summary", "")

    # Also gather the next 2-3 headlines for secondary context
    secondary_headlines = []
    for h in mlb_headlines[1:4]:
        secondary_headlines.append(h.get("title", ""))

    # Find the richest source article for the top story
    top_story_detail = ""
    if news_items and top_headline:
        for item in news_items:
            if any(word.lower() in item.get("title", "").lower()
                   for word in top_headline.split()[:3] if len(word) > 3):
                top_story_detail = item.get("summary", "")[:300]
                break

    edition_headline = edition.get("headline", "")

    system_prompt = """You are an expert editorial art director for The Sandlot Times, a fantasy baseball newsletter. Your job is to create a single, vivid image generation prompt that will produce a hero banner depicting today's top baseball news story.

RULES:
1. The image must VISUALLY TELL THE STORY — a viewer should understand the news from the image alone
2. Focus on the PRIMARY story. Don't try to cram multiple stories into one image.
3. Describe a SPECIFIC SCENE, not abstract concepts. Think editorial illustration, not stock photo.
4. Include concrete visual elements: specific players (describe their appearance/uniform), stadiums, actions, emotions
5. The style should be: warm vintage baseball illustration with rich earth tones (cream, burnt sienna, forest green, deep brown), painterly brushstrokes, golden hour lighting, classic Americana feel
6. NO text, NO logos, NO overlays in the image — pure illustration
7. NO neon colors, NO digital/tech aesthetics, NO terminal screens
8. DO NOT mention player names in the prompt (image models can't render specific people) — instead describe the scene, action, uniform colors/numbers, and context clues
9. Keep the prompt under 200 words but make every word count
10. Think like a newspaper illustrator capturing THE moment of the day

OUTPUT: Return ONLY the image generation prompt text. No JSON, no explanation, no preamble."""

    user_prompt = f"""TODAY'S EDITION: "{edition_headline}"

TOP STORY:
Headline: {top_headline}
Summary: {top_summary}
{f"Detail: {top_story_detail}" if top_story_detail else ""}

{f"OTHER HEADLINES: {'; '.join(secondary_headlines)}" if secondary_headlines else ""}

{f"EDITORIAL ANGLE: {hot_take[:200]}" if hot_take else ""}

Create a vivid image prompt that visually depicts the top story as an editorial illustration for today's Sandlot Times banner."""

    payload = {
        "model": RDSEC_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.8,
        "max_tokens": 500,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {RDSEC_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(RDSEC_API_URL, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        prompt = result["choices"][0]["message"]["content"].strip()

        # Clean up any markdown formatting the model might add
        prompt = prompt.strip('"').strip("'")
        if prompt.startswith("```"):
            prompt = prompt.split("```")[1] if "```" in prompt[3:] else prompt[3:]
        prompt = prompt.strip()

        print(f"  ✓ News-driven prompt generated ({len(prompt)} chars)")
        print(f"    Preview: {prompt[:120]}...")
        return prompt

    except Exception as e:
        print(f"  ⚠ News-driven prompt generation failed: {e}")
        # Fall back to the edition's basic prompt
        fallback = edition.get("hero_image_prompt",
            "A warm vintage baseball illustration, golden hour at a sandlot field, earth tones and classic Americana")
        print(f"    Using fallback: {fallback[:80]}...")
        return fallback


# ─── Hero Image Generation ───────────────────────────────────────

def generate_hero_image(prompt: str) -> str | None:
    """Generate hero banner image using the image generation script."""
    if not IMAGE_SCRIPT.exists():
        print(f"  ⚠ Image script not found at {IMAGE_SCRIPT}")
        return None

    output_path = f"/tmp/sandlot-times-hero-{datetime.now().strftime('%Y%m%d')}.png"

    print("🎨 Generating hero image...")
    print(f"  Prompt: {prompt[:150]}...")
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

    # Step 4: News-driven hero image
    hero_url = None
    if not args.no_image:
        print("\n─── STEP 4: Hero Image (News-Driven) ───")
        # Two-step process:
        # 1. Generate a vivid, story-specific prompt from the top headline
        # 2. Use that prompt to generate the actual image
        image_prompt = generate_news_driven_image_prompt(edition, all_items)
        edition["hero_image_prompt"] = image_prompt  # Update edition with the better prompt
        hero_url = generate_hero_image(image_prompt)
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
        print(f"\n  🎨 Hero Image Prompt (news-driven):")
        print(f"    {edition.get('hero_image_prompt', 'N/A')}")
        if hero_url:
            print(f"\n  🖼 Hero Image URL: {hero_url}")
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
