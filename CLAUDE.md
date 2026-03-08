# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"The Sandlot" — a fantasy baseball league hub for a 12-team keeper league. Live at thesandlot.app. Built with Next.js 16 (App Router), Tailwind CSS 4, Supabase (PostgreSQL + Auth), and deployed on Vercel.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (next/core-web-vitals + typescript)
npm run test         # Run all tests (vitest)
npm run test:watch   # Watch mode
npx vitest run src/__tests__/keepers.test.ts  # Run a single test file
```

## Architecture

### Stack
- **Next.js 16** with App Router and React Server Components (React 19)
- **Tailwind CSS 4** with `@tailwindcss/postcss`
- **Supabase** for PostgreSQL, auth (magic link email), and storage
- **Vitest** + Testing Library for tests (node environment, `@` alias resolved)
- **Zod** for schema validation
- **RDSec LiteLLM proxy** for AI features (Ask Smalls chatbot, Sandlot Times digest)

### Key Directories
- `src/app/` — Next.js App Router pages and API routes
- `src/app/api/` — API route handlers (chat, trades, keepers, offers, editions, admin endpoints)
- `src/app/ui/` — Shared layout components (NavHeader, Footer, toaster, stats)
- `src/components/` — Reusable UI components (ThemeToggle, TeamLogo, LogoModal, MarkdownMessage)
- `src/lib/` — Core business logic (`league-knowledge.ts`, `keeper-stacking.ts`, Supabase clients)
- `src/data/` — Static data files (managers.ts, draft-board.json, ecr-top500.json, historical/)
- `src/__tests__/` — All test files live here (not co-located with source)
- `supabase/migrations/` — Sequential SQL migrations (0002–0013)
- `scripts/` — Python/JS/shell scripts for data pipelines (ECR scraping, keeper costs, daily digest)

### Supabase Client Pattern
Three Supabase client variants:
- `src/lib/supabase.ts` — Simple client via `createClient()` (anon key, used in league-knowledge)
- `src/lib/supabase/server.ts` — Server Component client via `@supabase/ssr` + `cookies()`
- `src/lib/supabase/client.ts` — Browser client via `createBrowserClient()`

Admin API routes use `SUPABASE_SERVICE_ROLE_KEY` for elevated access.

### Auth Flow
- Magic link email auth via Supabase
- `src/middleware.ts` protects non-public routes, redirecting unauthenticated users to `/login`
- Public routes: `/`, `/teams`, `/team/*`, `/draft-board`, `/offer`, `/login`, `/trades`, `/keepers`, `/ask-smalls`
- API routes handle their own auth; admin routes use `IMPORT_SECRET` token

### Manager Data
`src/data/managers.ts` is the source of truth for all 12 managers. Each has: displayName, teamName, teamSlug, yahooTeamKey, email, draftPosition, logo path, theme (gradient, tagline, textColor), and color mappings. Lookup helpers: `getManagerBySlug()`, `getManagerByEmail()`, `getManagerByYahooTeamKey()`.

### AI Features
- **Ask Smalls** (`/ask-smalls`, API at `/api/chat`) — League-aware chatbot. `src/lib/league-knowledge.ts` builds a full context string from managers, rosters, trades, ECR rankings, draft board, and keeper rules. Streamed via SSE through RDSec LiteLLM proxy.
- **Sandlot Times** — AI-generated daily news digest (generated via `scripts/sandlot-times-pipeline.py`)

### Keeper Cost Logic
`src/lib/keeper-stacking.ts` handles the same-round conflict rule: when two keepers share a round, the better-ECR player keeps the round, the other bumps forward (or backward from Rd 23). Regular keeper rounds cap at 23; rounds 24-27 are NA-only. 7th-keeper-rule players always cost ceil(ECR/12).

### Dynamic Routes
- `/team/[slug]` — Individual team pages using `teamSlug` from managers data
- `/api/trades/[id]/react` and `/api/trades/[id]/comment` — Trade interaction endpoints

### Database Schema
Core tables: `players`, `my_roster_players` (with keeper_status), `managers`, `trade_offers`. RLS enabled on all tables. Migrations in `supabase/migrations/` add features incrementally (fantasypros ECR, yahoo stats, trades, chat history, NA eligibility, etc.).

## Environment Variables

Required (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public config
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side elevated access
- `RDSEC_API_KEY` — AI proxy for Ask Smalls + Sandlot Times
- `IMPORT_SECRET` — Protects admin API endpoints
- Yahoo OAuth creds and Telegram bot token for data pipelines and notifications
