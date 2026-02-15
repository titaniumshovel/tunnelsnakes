# 🐍 TUNNEL SNAKES

> *"We're the Tunnel Snakes. And we rule!"* — Butch DeLoria, Vault 101

A Fallout-themed fantasy baseball trade portal for **The Sandlot** keeper league on Yahoo Fantasy. Built so your leaguemates can browse your trade block, see what you're willing to move, and submit offers — all wrapped in a Pip-Boy terminal aesthetic.

**Live:** [tunnelsnakes.vercel.app](https://tunnelsnakes.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![Supabase](https://img.shields.io/badge/Supabase-postgres-3ECF8E?logo=supabase) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss) ![Vercel](https://img.shields.io/badge/Deployed-Vercel-000?logo=vercel)

---

## ⚡ Features

- **Trade Block Dashboard** — Browse all players with headshots, positions, keeper status, and 2025 stats
- **Keeper Cost Tracking** — Every player shows their keeper round cost (drafted, traded, FA, ECR, minor leaguer)
- **Smart Sorting** — Sort by name, FantasyPros ECR ranking, or keeper cost value
- **Position Filters** — Filter by C, 1B, 2B, 3B, SS, OF, SP, RP
- **Trade Offers** — Leaguemates can submit trade proposals with draft pick packages
- **Vault-Tec Aesthetic** — Pip-Boy green, CRT scanlines, amber accents, vault flavor text, the whole deal

## 🎨 The Aesthetic

This isn't your average fantasy baseball site. It's a **Vault-Tec terminal**.

- **Colors:** Pip-Boy green (`#14fe17`) primary, amber accents, dark vault backgrounds
- **Fonts:** Roboto Condensed (bold industrial headings) + Share Tech Mono (terminal text)
- **Effects:** CRT scanline overlay, neon glow shadows, terminal cursor animations
- **Flavor:** Random vault quotes, Fallout terminology throughout ("wasteland", "faction", "assets")

## 🏗 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| Database | [Supabase](https://supabase.com) (Postgres + Row Level Security) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) + tailwindcss-animate |
| Animation | [Framer Motion](https://www.framer.com/motion/) |
| Validation | [Zod](https://zod.dev) |
| Toasts | [Sonner](https://sonner.emilkowal.dev/) |
| Icons | [Lucide React](https://lucide.dev) |
| Deploy | [Vercel](https://vercel.com) |
| Data | [Yahoo Fantasy API](https://developer.yahoo.com/fantasysports/) |

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone https://github.com/titaniumshovel/tunnelsnakes.git
cd tunnelsnakes
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** and run the schema file:
   ```sql
   -- Paste contents of supabase/schema.sql
   ```
3. Run migrations in order:
   ```
   supabase/migrations/0002_fantasypros.sql
   supabase/migrations/0003_yahoo_stats_2025.sql
   supabase/migrations/0004_easy_offers.sql
   supabase/migrations/0005_keeper_cost.sql
   ```

### 3. Set up Yahoo Developer App

1. Go to [developer.yahoo.com/apps](https://developer.yahoo.com/apps/)
2. Create a new app with **Fantasy Sports** API access
3. Note your Client ID and Client Secret
4. Get a refresh token via OAuth2 flow

### 4. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials, Yahoo API keys, and an admin secret.

### 5. Run it

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) 🐍

## 📄 Pages

| Route | Description |
|-------|-------------|
| `/` | Trade block dashboard — browse players, sort, filter |
| `/offer` | Full trade proposal form for leaguemates |

## 🔧 Admin Endpoints

All admin endpoints require the `x-import-secret` header matching your `IMPORT_SECRET` env var.

### Import players from Yahoo

Seeds the database with your team's roster from the Yahoo Fantasy API.

```bash
curl -X POST http://localhost:3000/api/admin/import-keepers \
  -H "x-import-secret: YOUR_SECRET"
```

### Run keeper cost migration

Adds keeper cost columns and populates costs for all players based on draft history, trades, and FA pickups.

```bash
curl -X POST http://localhost:3000/api/admin/run-migration \
  -H "x-import-secret: YOUR_SECRET"
```

### Enrich with FantasyPros ECR

Scrapes FantasyPros Expert Consensus Rankings and updates player records.

```bash
curl -X POST http://localhost:3000/api/admin/enrich-fantasypros \
  -H "x-import-secret: YOUR_SECRET"
```

### Enrich with Yahoo 2025 stats

Pulls 2025 season stats from Yahoo Fantasy API for all rostered players.

```bash
curl -X POST http://localhost:3000/api/admin/enrich-yahoo-stats-2025 \
  -H "x-import-secret: YOUR_SECRET"
```

### Import draft costs from text

Parse draft results text and assign keeper costs by round.

```bash
curl -X POST http://localhost:3000/api/admin/import-draft-costs \
  -H "x-import-secret: YOUR_SECRET" \
  -H "content-type: application/json" \
  -d '{"text": "<paste draft results>"}'
```

## 🗃 Database Schema

**`players`** — All MLB players on your roster
- `yahoo_player_id`, `full_name`, `mlb_team`, `primary_position`, `eligible_positions`
- `headshot_url`, `fantasypros_ecr`, `stats_2025`
- `keeper_cost_round`, `keeper_cost_label`, `keeper_cost_source`

**`my_roster_players`** — Your roster entries with keeper decisions
- `player_id` → players, `keeper_status` (keeping/available/undecided), `notes`

**`managers`** — League teams/managers

**`trade_offers`** — Submitted trade proposals
- `team_name`, `requested_player_id`, `offer_text`, `message`, `status`

## 🏈 League Info

- **League:** The Sandlot (Yahoo Fantasy Baseball)
- **Format:** 12-team H2H 5x5 Categories
- **Keepers:** Up to 6 + 4 minor leaguers (NA)
- **Categories:** HR, OBP, RBI, R, SB / W, ERA, WHIP, K, SV+H
- **Draft:** Snake draft, 23 rounds

## 📜 Credits

Inspired by [Red Stagz](https://github.com/nickgag626/redstagz) by Nick Gagliardi. Same league, different vault.

---

*War. War never changes. But your fantasy roster should.* 🐍
