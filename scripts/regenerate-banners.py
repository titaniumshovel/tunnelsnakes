#!/usr/bin/env python3
"""
One-off script: Regenerate hero banners for existing Sandlot Times editions
using the new news-driven image prompt generation.

Usage:
    python3 regenerate-banners.py --dates 2026-02-16 2026-02-17 2026-02-18 2026-02-19
    python3 regenerate-banners.py --dates 2026-02-16 --dry-run  # preview prompts only
"""

import json
import os
import sys
import subprocess
import time
from datetime import datetime
from pathlib import Path

import requests

# ─── Configuration ────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_DIR = SCRIPT_DIR.parent
ENV_FILE = PROJECT_DIR / ".env.local"
if not ENV_FILE.exists():
    ENV_FILE = PROJECT_DIR / ".env"

def load_env(path: Path) -> dict:
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

dotenv = load_env(ENV_FILE)
clawd_env = load_env(Path.home() / "clawd" / ".env")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or dotenv.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or dotenv.get("SUPABASE_SERVICE_ROLE_KEY")
RDSEC_API_KEY = os.environ.get("RDSEC_API_KEY") or dotenv.get("RDSEC_API_KEY") or clawd_env.get("RDSEC_API_KEY")
RDSEC_API_URL = "https://api.rdsec.trendmicro.com/prod/aiendpoint/v1/chat/completions"
RDSEC_MODEL = "claude-4.5-haiku"
IMAGE_SCRIPT = Path.home() / "clawd" / "scripts" / "generate-image.sh"


def fetch_edition(date_str: str) -> dict | None:
    """Fetch a single edition from Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/editions"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
    }
    params = {
        "date": f"eq.{date_str}",
        "select": "date,headline,hero_image_url,hero_image_prompt,mlb_headlines,hot_take",
    }
    resp = requests.get(url, headers=headers, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return data[0] if data else None


def generate_news_driven_prompt(edition: dict) -> str:
    """Generate a vivid, story-specific image prompt from edition content."""
    top_headline = ""
    top_summary = ""
    hot_take = edition.get("hot_take", "")
    edition_headline = edition.get("headline", "")

    mlb_headlines = edition.get("mlb_headlines", [])
    if mlb_headlines:
        top_headline = mlb_headlines[0].get("title", "")
        top_summary = mlb_headlines[0].get("summary", "")

    secondary_headlines = [h.get("title", "") for h in mlb_headlines[1:4]]

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

    resp = requests.post(RDSEC_API_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    result = resp.json()
    prompt = result["choices"][0]["message"]["content"].strip().strip('"').strip("'")
    if prompt.startswith("```"):
        prompt = prompt.split("```")[1] if "```" in prompt[3:] else prompt[3:]
    return prompt.strip()


def generate_image(prompt: str, date_str: str) -> str | None:
    """Generate image and return local path."""
    output_path = f"/tmp/sandlot-times-hero-{date_str.replace('-', '')}.png"

    result = subprocess.run(
        [str(IMAGE_SCRIPT), prompt, output_path, "16:9"],
        capture_output=True, text=True, timeout=120,
    )
    if result.returncode == 0 and Path(output_path).exists():
        return output_path
    else:
        print(f"    ✗ Image generation failed: {result.stderr[:200]}")
        return None


def upload_image(local_path: str, date_str: str) -> str | None:
    """Upload to Supabase storage, return public URL."""
    filename = f"sandlot-times-{date_str.replace('-', '')}.png"
    bucket = "images"
    storage_path = f"editions/{filename}"

    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{storage_path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "image/png",
        "x-upsert": "true",
    }

    with open(local_path, "rb") as f:
        resp = requests.post(url, headers=headers, data=f, timeout=30)

    if resp.status_code in (200, 201):
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}"
        return public_url
    else:
        print(f"    ✗ Upload failed ({resp.status_code}): {resp.text[:200]}")
        return None


def update_edition(date_str: str, hero_url: str, hero_prompt: str) -> bool:
    """Update the edition record in Supabase with new image."""
    url = f"{SUPABASE_URL}/rest/v1/editions?date=eq.{date_str}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    payload = {
        "hero_image_url": hero_url,
        "hero_image_prompt": hero_prompt,
    }
    resp = requests.patch(url, json=payload, headers=headers, timeout=15)
    return resp.status_code in (200, 204)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Regenerate Sandlot Times hero banners")
    parser.add_argument("--dates", nargs="+", required=True, help="Dates to regenerate (YYYY-MM-DD)")
    parser.add_argument("--dry-run", action="store_true", help="Only generate prompts, skip image gen + upload")
    args = parser.parse_args()

    results = {}

    for date_str in args.dates:
        print(f"\n{'='*60}")
        print(f"📰 Processing {date_str}")
        print(f"{'='*60}")

        # Fetch edition
        edition = fetch_edition(date_str)
        if not edition:
            print(f"  ✗ No edition found for {date_str}")
            continue

        old_prompt = edition.get("hero_image_prompt", "N/A")
        old_url = edition.get("hero_image_url", "None")
        print(f"  📋 Headline: {edition['headline']}")
        print(f"  🖼 Old prompt: {old_prompt[:80]}...")
        print(f"  🔗 Old URL: {old_url}")

        # Generate news-driven prompt
        print(f"\n  🎨 Generating news-driven prompt...")
        new_prompt = generate_news_driven_prompt(edition)
        print(f"  ✓ New prompt ({len(new_prompt)} chars):")
        print(f"    {new_prompt[:150]}...")

        results[date_str] = {
            "headline": edition["headline"],
            "top_story": edition.get("mlb_headlines", [{}])[0].get("title", "N/A"),
            "old_prompt": old_prompt,
            "new_prompt": new_prompt,
            "old_url": old_url,
            "new_url": None,
        }

        if args.dry_run:
            print(f"\n  🔸 DRY RUN — skipping image generation")
            continue

        # Generate image
        print(f"\n  🎨 Generating image...")
        local_path = generate_image(new_prompt, date_str)
        if not local_path:
            print(f"  ✗ Failed to generate image for {date_str}")
            continue
        print(f"  ✓ Image saved: {local_path}")

        # Upload
        print(f"  📤 Uploading to Supabase...")
        new_url = upload_image(local_path, date_str)
        if not new_url:
            print(f"  ✗ Failed to upload image for {date_str}")
            continue
        print(f"  ✓ Uploaded: {new_url}")
        results[date_str]["new_url"] = new_url

        # Update DB
        print(f"  💾 Updating edition record...")
        if update_edition(date_str, new_url, new_prompt):
            print(f"  ✓ Edition updated!")
        else:
            print(f"  ✗ Failed to update edition record")

        # Small delay between generations to avoid rate limits
        time.sleep(2)

    # Summary
    print(f"\n\n{'='*60}")
    print("📊 REGENERATION SUMMARY")
    print(f"{'='*60}")
    for date_str, r in results.items():
        print(f"\n📅 {date_str}: {r['headline']}")
        print(f"   Top story: {r['top_story']}")
        print(f"   Old URL: {r['old_url']}")
        print(f"   New URL: {r['new_url'] or '(not generated)'}")
        print(f"   New prompt: {r['new_prompt'][:100]}...")

    # Output JSON for easy consumption
    print(f"\n\n--- JSON RESULTS ---")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
