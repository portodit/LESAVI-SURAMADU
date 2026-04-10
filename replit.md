# LESAVI VI · Witel Suramadu — AM Dashboard

## Overview

Dashboard monitoring performa Account Manager (AM) Telkom Witel Suramadu. Dibangun sebagai pnpm monorepo TypeScript dengan React frontend dan Express backend.

Source code di-clone dari: https://github.com/portodit/LESAVI-SURAMADU.git

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite + Tailwind CSS + shadcn/ui
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Session-based (express-session + bcryptjs)

## Fitur

- **Dashboard Performa** — ranking AM, target vs realisasi revenue
- **Sales Funnel** — tracking pipeline F0–F5 per AM & divisi (DPS/DSS)
- **Activity Monitoring** — kunjungan dan aktivitas AM harian/bulanan
- **Import Data** — upload Excel/CSV + sinkronisasi Google Drive otomatis
- **Telegram Bot** — pengingat jadwal kunjungan & laporan KPI harian
- **Presentation Mode** — tampilan ringkasan real-time untuk rapat
- **Corporate Customer** — tabel pelanggan korporat

## Struktur Artifacts

- `artifacts/api-server` — Express 5 backend (port 8080, path `/api`)
- `artifacts/lesavi-dashboard` — React 19 + Vite frontend (port auto, path `/`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/api-server run seed` — seed database with initial data

## Default Login

- Email: `admin@telkom.co.id`
- Password: `admin123` (atau sesuai default seed)

## Database

PostgreSQL dengan schema:
- `admin_users` — user admin
- `account_managers` — data AM
- `performance_data` — data performa revenue
- `sales_funnel` — data pipeline sales
- `sales_activity` — data aktivitas kunjungan
- `data_imports` — riwayat import data
- `app_settings` — pengaturan aplikasi
- `telegram_bot_users` — user Telegram terdaftar
- `telegram_logs` — log pengiriman Telegram

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
