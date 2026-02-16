# The Sandlot ⚾

> *"Heroes get remembered, but legends never die."*

Fantasy baseball league hub for **The Sandlot** — a 12-team keeper league, Est. 2020. Built with Next.js 16, Tailwind 4, and Supabase.

**🌐 Live at [thesandlot.app](https://thesandlot.app)**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![Supabase](https://img.shields.io/badge/Supabase-postgres-3ECF8E?logo=supabase) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss) ![Vercel](https://img.shields.io/badge/Deployed-Vercel-000?logo=vercel)

---

## ⚡ Features

- **12-Team Roster Management** — Full rosters for all 12 teams with keeper tracking (6 keepers + 4 NA slots per team)
- **Ask Smalls 🧢** — AI chatbot powered by Claude/GPT via RDSec LiteLLM proxy. Knows everything about the league — keepers, trades, rosters, rules, and rankings. Ask it anything.
- **The Sandlot Times 📰** — AI-generated daily digest with hero images. MLB news filtered through a Sandlot lens, with league-specific callouts for affected managers.
- **Trade Center** — Full trade proposal form with reactions, comments, and pick trail visualization. See every deal, vote on it, talk trash about it.
- **Draft Board** — 27-round snake draft (March 6, 2026) with keeper slots auto-populated and pick ownership tracking.
- **FantasyPros ECR Integration** — Expert Consensus Rankings updated daily via cron. See keeper value at a glance.
- **Magic Link Auth** — Supabase-powered email authentication. No passwords, no friction.
- **Night Game 🌙** — Dark mode toggle for late-night roster tinkering.
- **AI-Generated Team Logos** — 12 unique logos generated via Gemini, one for each team.
- **Custom Domain** — [thesandlot.app](https://thesandlot.app) via Porkbun

---

## 🏗 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React Server Components) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Database | [Supabase](https://supabase.com) (PostgreSQL, Auth, Storage) |
| AI | [RDSec LiteLLM Proxy](https://litellm.ai) (Claude, GPT, Gemini) |
| Hosting | [Vercel](https://vercel.com) |
| Cron | [OpenClaw](https://openclaw.com) (daily digest + ECR updates) |

---

## 📄 Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — league overview, news highlights |
| `/teams` | All 12 teams with logos, records, and links |
| `/team/[slug]` | Individual team page — roster, keepers, draft picks |
| `/trades` | Trade Center — proposals, reactions, comments, pick trail |
| `/keepers` | League-wide keeper tracker with deadline countdown |
| `/draft-board` | 27-round draft board with keeper slots filled |
| `/ask-smalls` | AI chatbot — ask anything about the league |
| `/news` | The Sandlot Times — daily AI-generated digest |
| `/dashboard` | Owner dashboard (authenticated) — manage your team |
| `/login` | Magic link authentication |

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/titaniumshovel/tunnelsnakes.git
cd tunnelsnakes
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `RDSEC_API_KEY` | RDSec LiteLLM proxy key (for Ask Smalls + Sandlot Times) |

### 3. Run

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) ⚾

---

## 🔧 Scripts

| Script | Description |
|--------|-------------|
| `scripts/sandlot-times-pipeline.py` | Daily digest generation — gathers MLB news, cross-references league rosters, generates editorial + hero image, writes to Supabase |
| `scripts/update-ecr-daily.sh` | FantasyPros ECR scraper — updates expert consensus rankings for all rostered players |
| `scripts/enrich-ecr-all.py` | Bulk ECR enrichment — backfill ECR data for all players |
| `scripts/populate-keeper-costs.py` | Keeper cost calculator — computes keeper round costs based on draft history, trades, and FA rules |

---

## 🏟 League Info

| Detail | Value |
|--------|-------|
| **League** | The Sandlot |
| **Platform** | Yahoo Fantasy Baseball |
| **Yahoo League ID** | `469.l.24701` |
| **Format** | 12-team H2H 5×5 Categories |
| **Buy-in** | $200 |
| **Est.** | 2020 |
| **Draft** | March 6, 2026 (27 rounds, snake) |
| **Keeper Deadline** | February 20, 2026 |
| **Keepers** | 6 per team + 4 NA (minor league) slots |

### Categories
- **Offense:** HR, OBP, RBI, Runs, SB
- **Pitching:** Wins, ERA, WHIP, K's, Saves+Holds

### Teams

| # | Team | Manager |
|---|------|---------|
| 1 | Tunnel Snakes | Chris *(commissioner)* |
| 2 | Alex in Chains | Alex |
| 3 | Bleacher Creatures | Pudge |
| 4 | ClutchHutch | Sean |
| 5 | Goin' Yahdgoats | Tom |
| 6 | Greasy Cap Advisors | Greasy |
| 7 | Lollygaggers | Web |
| 8 | Red Stagz | Nick |
| 9 | Runs-N-Roses | Bob |
| 10 | The Dirty Farm | Mike |
| 11 | Lake Monsters | Thomas *(new 2026)* |
| 12 | Tyler's Slugfest | Tyler *(new 2026)* |

---

## 📜 Credits

Inspired by [Red Stagz](https://github.com/nickgag626/redstagz) by Nick Gagliardi — same league, different vibe.

Built with ❤️ and way too much time that should've been spent on actual draft prep.

---

*"You're killing me, Smalls!"* 🧢
