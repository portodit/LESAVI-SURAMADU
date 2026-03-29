# Arsitektur & Struktur Proyek — LESAVI AM Dashboard

---

## Tech Stack

| Layer | Teknologi | Versi |
|---|---|---|
| **Frontend** | React | 19 |
| | Vite | 7 |
| | TypeScript | 5 |
| | Tailwind CSS | 4 |
| | shadcn/ui | latest |
| | Tanstack Query (React Query) | 5 |
| | React Router | 7 |
| **Backend** | Express | 5 |
| | TypeScript | 5 |
| | Drizzle ORM | latest |
| | Pino (logging) | latest |
| **Database** | PostgreSQL | 16 |
| **Monorepo** | pnpm workspaces | 9 |
| **Bot** | Telegram Bot API (polling) | — |

---

## Struktur Folder di Replit (Internal)

```
workspace/
├── artifacts/
│   ├── telkom-am-dashboard/     # Frontend React + Vite
│   │   ├── src/
│   │   │   ├── features/        # Fitur per halaman (feature-sliced)
│   │   │   │   ├── auth/        # Login, session
│   │   │   │   ├── dashboard/   # Halaman utama
│   │   │   │   ├── funnel/      # Sales Funnel (F0–F5)
│   │   │   │   ├── activity/    # Activity monitoring
│   │   │   │   ├── performance/ # Performance & presentasi
│   │   │   │   ├── import/      # Import data Excel/Drive
│   │   │   │   ├── settings/    # Pengaturan (bot, sync)
│   │   │   │   ├── am/          # Manajemen Account Manager
│   │   │   │   └── telegram/    # Telegram logs & manajemen
│   │   │   ├── shared/          # Komponen & utils bersama
│   │   │   │   ├── ui/          # shadcn/ui components
│   │   │   │   ├── hooks/       # Custom React hooks
│   │   │   │   └── lib/         # Utilities (cn, format, dll)
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── components.json      # shadcn/ui config
│   │   └── package.json
│   │
│   └── api-server/              # Backend Express 5
│       └── src/
│           ├── features/        # Feature modules (same domains)
│           │   ├── auth/        # Login/logout routes
│           │   ├── am/          # Account Manager CRUD
│           │   ├── funnel/      # Sales funnel data
│           │   ├── activity/    # Activity data
│           │   ├── performance/ # Performance data
│           │   ├── import/      # File upload & import
│           │   ├── gdrive/      # Google Drive scheduler
│           │   ├── gsheets/     # Google Sheets sync
│           │   ├── settings/    # App settings
│           │   └── telegram/    # Bot poller & service
│           ├── shared/          # Shared backend utils
│           │   ├── auth.ts      # Auth middleware
│           │   ├── divisi.ts    # Divisi constants
│           │   └── logger.ts    # Pino logger
│           ├── routes/
│           │   └── index.ts     # Route aggregator
│           ├── seeds/           # Database seeders
│           └── index.ts         # App entry point
│
├── lib/
│   ├── db/                      # Drizzle ORM schema (shared)
│   │   └── src/
│   │       └── schema/          # Table definitions
│   │           ├── accountManagers.ts
│   │           ├── salesFunnel.ts
│   │           ├── salesActivity.ts
│   │           ├── performanceData.ts
│   │           ├── appSettings.ts
│   │           ├── telegramLogs.ts
│   │           └── ...
│   ├── api-spec/                # OpenAPI 3.0 specification
│   ├── api-zod/                 # Zod types (auto-generated dari api-spec)
│   └── api-client-react/        # React Query hooks (auto-generated)
│
├── .doc/                        # Dokumentasi project ini
├── _push-to-github.sh           # Script push ke GitHub
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml          # pnpm workspace definition
└── tsconfig.base.json           # Base TypeScript config
```

---

## Pola Arsitektur

### Frontend — Feature-Sliced Design (FSD)

Setiap halaman punya folder sendiri di `src/features/`:

```
features/
  funnel/
    FunnelPage.tsx        # Halaman utama (default export)
    components/           # Komponen lokal halaman ini
    hooks/                # Hooks lokal (opsional)
    types.ts              # Types lokal (opsional)
```

Komponen yang dipakai di banyak halaman masuk ke `src/shared/`.

### Backend — Feature Modules

Setiap domain fitur punya folder sendiri di `src/features/`:

```
features/
  funnel/
    routes.ts             # Private routes (butuh auth)
    publicRoutes.ts       # Public routes (tanpa auth)
```

Route digabung di `src/routes/index.ts` dan di-mount di `src/index.ts`.

### Database — Drizzle ORM

Schema tabel ada di `lib/db/src/schema/`. Satu file per tabel.  
Perubahan schema: edit file `.ts` → jalankan `pnpm --filter @workspace/db run db:push`.

> ⚠️ **Jangan ubah tipe kolom ID** (serial ↔ varchar). Ini akan merusak data yang sudah ada.

---

## Naming Conventions

| Hal | Konvensi | Contoh |
|---|---|---|
| Komponen React | PascalCase | `FunnelPage.tsx`, `SalesChart.tsx` |
| Hooks | camelCase prefix `use` | `useFunnelData.ts`, `useAuth.ts` |
| Utilities | camelCase | `formatRupiah.ts`, `cn.ts` |
| API routes | kebab-case | `/api/funnel/snapshots`, `/api/am` |
| DB schema files | camelCase | `salesFunnel.ts`, `accountManagers.ts` |
| Constants | SCREAMING_SNAKE | `DEFAULT_DIVISI`, `FS_PHASES` |

---

## Alur Data

```
[User Browser]
     ↓ HTTP/React Query
[Frontend — React 19 + Vite]
     ↓ fetch /api/*
[Backend — Express 5]
     ↓ Drizzle ORM
[PostgreSQL Database]

[Telegram API] ←→ [Backend Poller]
[Google Drive]  →  [Backend Scheduler → Import → DB]
```

---

## Package Names (pnpm workspace)

| Folder | Package Name |
|---|---|
| `artifacts/telkom-am-dashboard` | `@workspace/telkom-am-dashboard` |
| `artifacts/api-server` | `@workspace/api-server` |
| `lib/db` | `@workspace/db` |
| `lib/api-spec` | `@workspace/api-spec` |
| `lib/api-zod` | `@workspace/api-zod` |
| `lib/api-client-react` | `@workspace/api-client-react` |

Gunakan nama ini untuk menjalankan script spesifik:
```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/telkom-am-dashboard run build
pnpm --filter @workspace/db run db:push
```

---

## Port yang Digunakan

| Service | Port | Workflow |
|---|---|---|
| Frontend (Vite dev) | `24930` | `artifacts/telkom-am-dashboard: web` |
| Backend (Express) | `8080` | `artifacts/api-server: API Server` |

> Port ini dikonfigurasi via environment variable `PORT` di artifact.toml.  
> **Jangan ubah port** tanpa mengupdate artifact.toml dan vite.config.ts sekaligus.

---

## File Konfigurasi Penting

| File | Fungsi | Boleh diubah? |
|---|---|---|
| `artifacts/telkom-am-dashboard/.replit-artifact/artifact.toml` | Konfigurasi port & workflow frontend | Hati-hati |
| `artifacts/api-server/.replit-artifact/artifact.toml` | Konfigurasi port & workflow backend | Hati-hati |
| `pnpm-workspace.yaml` | Definisi workspace packages | Hanya jika tambah package baru |
| `tsconfig.base.json` | Base TypeScript config | Hati-hati |
| `_push-to-github.sh` | Script push ke GitHub | Bebas dimodifikasi |
| `.doc/*` | Dokumentasi ini | Bebas dimodifikasi |
