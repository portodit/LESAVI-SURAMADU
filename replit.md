# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
This is a **SharePoint Bot / Telkom AM Dashboard** project — a full-stack dashboard for Account Manager (AM) performance monitoring with Telegram Bot integration.

## Key Master Tables (Data Quality)
- **master_am**: Canonical list of AM Witel Suramadu (57 total; 19 active, 38 historical). Auto-populated on import. NIK 850099 (Reni) always remapped → 870022 (Havea).
- **master_customer**: 262 unique corporate customers, auto-populated from funnel imports.
- On funnel import: null `nama_am` resolved via master_am lookup; garbage NIKs (< 4 digits or > 9999999) rejected.
- API: `GET/POST/PATCH/DELETE /api/master-am` for master AM CRUD.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Telegram**: Bot integration for AM reminders
- **Auth**: Session-based with bcryptjs

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/src/
│   │   ├── app.ts                 # Express app setup
│   │   ├── index.ts               # Server entry point
│   │   ├── shared/
│   │   │   ├── auth.ts            # Auth middleware + password utils
│   │   │   └── logger.ts          # Pino logger
│   │   ├── features/
│   │   │   ├── performance/       # routes.ts, publicRoutes.ts
│   │   │   ├── funnel/            # routes.ts
│   │   │   ├── activity/          # routes.ts
│   │   │   ├── import/            # routes.ts, excel.ts
│   │   │   ├── am/                # routes.ts, publicRoutes.ts
│   │   │   ├── telegram/          # routes.ts, service.ts, poller.ts, ai.ts
│   │   │   ├── auth/              # routes.ts
│   │   │   ├── settings/          # routes.ts
│   │   │   └── health/            # routes.ts
│   │   └── routes/
│   │       └── index.ts           # Aggregates all feature routes
│   └── telkom-am-dashboard/src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── shared/
│       │   ├── ui/                # Design system (shadcn/ui components)
│       │   ├── hooks/             # use-auth, use-mobile, use-toast
│       │   ├── lib/utils.ts       # Tailwind cn() util
│       │   └── layout.tsx         # DashboardLayout
│       └── features/
│           ├── auth/              # LoginPage.tsx
│           ├── dashboard/         # DashboardPage.tsx
│           ├── import/            # ImportPage.tsx, ImportDetailPage.tsx
│           ├── performance/       # PerformaPage.tsx, PresentationPage.tsx
│           ├── funnel/            # FunnelPage.tsx
│           ├── activity/          # ActivityPage.tsx
│           ├── telegram/          # TelegramPage.tsx
│           └── settings/          # PengaturanPage.tsx
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Fonts
- `--font-sans`: Inter (body text, UI elements) — via Google Fonts
- `--font-display`: Satoshi (headings, brand names, bold labels) — via Fontshare CDN

## Database Schema

- `account_managers` — AM profiles with Telegram chat IDs
- `admin_users` — Admin login credentials
- `app_settings` — Application configuration (Telegram bot token, etc.)
- `data_imports` — Import history log
- `performance_data` — AM performance metrics
- `sales_activity` — Sales activity records
- `sales_funnel` — Sales funnel data
- `telegram_logs` — Telegram message send logs

## API Routes

- `GET/POST /api/auth/*` — Authentication (login, logout, me)
- `GET/POST/PATCH/DELETE /api/am/*` — Account Manager CRUD
- `GET /api/performance/*` — Performance data
- `GET /api/activity/*` — Sales activity
- `GET /api/funnel/*` — Sales funnel
- `POST /api/import/*` — Data import (Excel/SharePoint)
- `GET/POST /api/settings/*` — App settings
- `GET/POST /api/telegram/*` — Telegram bot operations
- `GET /api/public-am/*` — Public AM profile (no auth)
- `GET /api/healthz` — Health check

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Development

- API Server: `pnpm --filter @workspace/api-server run dev`
- Frontend: `pnpm --filter @workspace/telkom-am-dashboard run dev`
- DB push: `pnpm --filter @workspace/db run push`
- Codegen: `pnpm --filter @workspace/api-spec run codegen`

## Environment Variables Required

- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `TELEGRAM_BOT_TOKEN` — Telegram bot token (set via app settings)
- `SESSION_SECRET` — Express session secret (optional, has default)
