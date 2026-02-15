# 🐍 Tunnel Snakes — Yahoo Fantasy Baseball Trade Terminal

> *"War never changes... but your lineup should."*

A Fallout-themed fantasy baseball trade portal for the Vault 101 league. Built with Next.js, Supabase, and Tailwind CSS. Inspired by [Red Stagz](https://github.com/nickgag626/redstagz).

## Aesthetic

- **Theme:** Vault-Tec industrial / Pip-Boy terminal
- **Colors:** Pip-Boy green (#14fe17) primary, amber accents, dark vault backgrounds
- **Font:** Roboto Condensed (bold industrial) + Share Tech Mono (terminal)
- **Vibe:** CRT scanlines, neon glow, retro-futuristic post-apocalyptic

## League Teams

| Team | Team |
|------|------|
| Tunnel Snakes | Alex in Chains |
| Bleacher Creatures | ClutchHutch |
| Goin' Yahdgoats | Greasy Cap Advisors |
| Lollygaggers | Red Stagz |
| Runs-N-Roses | The Dirty Farm |
| Lake Monsters | Tyler's Slugfest |

## Setup

### 1) Create Supabase project
- Create a project at [supabase.com](https://supabase.com)
- In SQL Editor, run: `supabase/schema.sql`
- Then run migrations in order: `0002` → `0003` → `0004` → `0005`

### 2) Configure env vars
```bash
cp .env.example .env.local
```
Fill in all values (see `.env.example` for documentation).

### 3) Install & run
```bash
npm install
npm run dev
```

## Pages
- `/` — Public trade block (Pip-Boy terminal view)
- `/offer` — Full trade proposal form

## Admin Endpoints

All admin endpoints require `x-import-secret` header.

### Import keepers (one-time seed)
```bash
curl -X POST -H "x-import-secret: $IMPORT_SECRET" \
  http://localhost:3000/api/admin/import-keepers
```

### Import draft costs
```bash
curl -X POST -H "x-import-secret: $IMPORT_SECRET" \
  -H "content-type: application/json" \
  -d '{"text": "<paste draft results here>"}' \
  http://localhost:3000/api/admin/import-draft-costs
```

### Enrich with FantasyPros ECR
```bash
curl -X POST -H "x-import-secret: $IMPORT_SECRET" \
  http://localhost:3000/api/admin/enrich-fantasypros
```

### Enrich with Yahoo 2025 stats
Requires `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`, `YAHOO_REFRESH_TOKEN`.
```bash
curl -X POST -H "x-import-secret: $IMPORT_SECRET" \
  http://localhost:3000/api/admin/enrich-yahoo-stats-2025
```

## Config
- `YAHOO_LEAGUE_KEY`: `469.l.24701`
- `YAHOO_TEAM_KEY`: `469.l.24701.t.1`
- All players default to `undecided` keeper status

## Tech Stack
- **Next.js 16** (App Router)
- **Supabase** (Postgres + RLS + Auth)
- **Tailwind CSS 4** + tailwindcss-animate
- **Framer Motion** (animations)
- **Zod** (validation)
- **Sonner** (toast notifications)

---

*Tunnel Snakes rule! 🐍*
