# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.
This is a **SharePoint Bot / Telkom AM Dashboard** project — a full-stack dashboard for Account Manager (AM) performance monitoring with Telegram Bot integration.

## Key Master Tables (Data Quality)
- **account_managers**: Fields: nik, nama, slug, divisi, segmen, witel, jabatan, aktif, crossWitel, telegram*, kpiActivity. 13 AM aktif dengan cross_witel flag.
- **pending_am_discoveries**: AM baru dari import data yang belum dikonfirmasi. Fields: nik, nama, divisi, witel, source, importId, status (pending/approved/rejected), reviewedBy, reviewedAt. Harus disetujui Officer/Manager sebelum masuk ke account_managers. Corporate customers (master_customer) langsung disimpan tanpa perlu konfirmasi.
- **app_settings**: `g_sheets_funnel_spreadsheet_id` added (1czGSp = nationwide SIMLOP/SIGMA dump) separate from `g_sheets_spreadsheet_id` (1ojCi6db = activity/performance).
- **master_customer**: 262 unique corporate customers, auto-populated from funnel imports (no confirmation needed). Ditampilkan di halaman `/corporate-customers` dengan aggregasi revenue dari `performance_data.komponenDetail`.
- **sales_funnel**: 252 LOPs (2026) from GSheets `TREG3_SALES_FUNNEL_20260326`. Filtered by YEAR(report_date) = tahun at query time.
- **sales_funnel_target**: DPS 2026/3 HO=70.257B Full=97.076B; DSS 2026/3 HO=60.048B Full=73.780B.

## Active AM List (13 AMs)
ANA RUKMANA (402478), CAESAR RIO ANGGINA TORUAN (405690), ERVINA HANDAYANI (920064), HANDIKA DAGNA NEVANDA (980067, cross_witel), HAVEA PERTIWI (870022), KATATA VEKANIDYA SEKAR PUSPITASARI (405075), MOH RIZAL (850046), NADYA ZAHROTUL HAYATI (403613), NI MADE NOVI WIRANA (896661), NYARI KUSUMANINGRUM (401431, cross_witel), SAFIRINA FEBRYANTI (910017), VIVIN VIOLITA (910024), WILDAN ARIEF (404429, cross_witel)

## Seed Script
- **File**: `scripts/src/seed-master-am.ts`
- **Run**: `pnpm --filter @workspace/scripts run seed-am`
- **Idempotent**: upsert by NIK — aman dijalankan berulang kali
- Seeds both `master_am` and `account_managers` tables with 13 active AMs

## Multi-Divisi AM Support
Import performa, funnel, dan activity sekarang mendukung AM yang handle >1 divisi sekaligus:
- **Performa RAW format**: key aggregasi diubah dari `nik__periode` → `nik__periode__divisi`, sehingga DPS dan DSS (atau DGS) disimpan sebagai rekord terpisah di `performance_data`.
- **Performa original format**: filter DGS dihapus — semua divisi valid (DPS, DSS, DGS) disimpan.
- **Funnel**: filter divisi diubah dari `DPS/DSS saja` → `DPS/DSS/DGS`.
- **Activity**: filter divisi diubah dari `DPS/DSS saja` → `DPS/DSS/DGS`.

## Divisi Filter Overhaul (LESA/GOVT)
Filter divisi di semua halaman kini mendukung grup LESA dan GOVT:
- **Shared utilities**:
  - Frontend: `artifacts/telkom-am-dashboard/src/shared/lib/divisi.ts` → `DIVISI_OPTIONS`, `DIVISI_OPTIONS_WITH_ALL`, `DEFAULT_DIVISI="LESA"`, `expandDivisi()`, `matchesDivisi()`, `divisiFilterLabel()`
  - Backend: `artifacts/api-server/src/shared/divisi.ts` → same exports + backend `matchesDivisi()`
- **Filter values**: LESA (expands to DPS+DSS), GOVT (expands to DGS), DPS, DSS, DGS, all
- **Default divisi**: `LESA` di semua halaman (ActivityPage, FunnelPage, PerformaPage, ManajemenAmPage, PresentationPage - ActivitySlide & PerformaSlide)
- **Dropdown options order**: LESA → GOVT → DPS → DSS → Semua Divisi
- **Backend routes updated**: activity/routes.ts, activity/publicRoutes.ts, funnel/routes.ts (incl. target filter uses `expandDivisi`), funnel/publicRoutes.ts, performance/routes.ts (uses `inArray` with expanded divisi)
- **Frontend filter updated**: all client-side divisi filters use `matchesDivisi()` instead of exact match

## GSheets Funnel Import Cleaning Rules (exact Power BI Power Query match)
GSheets `1czGSp` = 76,808 rows nationwide SIMLOP+SIGMA dump. Source mirrors local Excel "Sales_Funnel_Suramadu" that Power BI reads.
Power Query steps (from .pbix):
1. `witel = "SURAMADU"` — filter all rows
2. `nik_pembuat_lop` cast to Int64, `RemoveRowsWithErrors` — discard non-numeric NIKs
3. `divisi = "DPS" or "DSS"` — filter by division
4. `IF report_date.Year >= 2026 AND nik_pembuat_lop = 850099 → 870022` (Reni→Havea conditional)
5. Use **ONLY `nik_pembuat_lop`** as AM key — `nik_handling` is NOT used
6. Import **ALL years** (no year filter at import) — 1,358 LOPs total stored
7. Dedup by lopid — keep latest `report_date` per lopid
8. Filter to 13 active master AM NIKs at import time
9. Query-time: `GET /api/funnel?tahun=2026` → **exactly 250 LOPs, 13/13 AMs exact match kunci jawaban**
Note: `cross_witel` flag on master_am is no longer used for import logic (all LOPs witel=SURAMADU)

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

## Sales Activity Data Cleaning Rules (Power Query Power BI)

Prosedur cleaning data Sales Activity sesuai alur Power Query Power BI (folder: `Sales_Activity_Suramadu`).
**Target setelah seluruh file digabung: ≥ 1.300 baris** (Power BI menunjukkan 1.352 baris dari folder lengkap).

**8 Langkah Power Query (exact steps dari .pbix):**
```
Step 1: = Table.SelectRows(#"Filtered Rows", each Text.Contains([Folder Path], "Sales_Activity_Suramadu"))
         → hanya baca file dari subfolder "Sales_Activity_Suramadu"

Step 2: = Table.SelectRows(#"Filtered Rows1", each [Attributes]?[Hidden]? <> true)
         → hapus file tersembunyi dari daftar

Step 3: = Table.AddColumn(#"Filtered Hidden Files1", "Transform File (2)", each #"Transform File (2)"([Content]))
         → invoke custom function untuk membaca isi setiap file (Folder Connector)

Step 4: = Table.RenameColumns(#"Invoke Custom Function1", {"Name", "Source.Name"})
         → rename kolom "Name" menjadi "Source.Name" (preservasi nama file sumber)

Step 5: = Table.SelectColumns(#"Renamed Columns1", {"Source.Name", "Transform File (2)"})
         → hanya simpan 2 kolom: Source.Name dan Transform File

Step 6: = Table.ExpandTableColumn(#"Removed Other Columns1", "Transform File (2)",
           Table.ColumnNames(#"Transform File (2)"(#"Sample File (2)")))
         → expand semua kolom dari tabel gabungan (20 kolom per file)

Step 7: = Table.TransformColumnTypes(#"Expanded Table Column1", {
           {"Source.Name", type text}, {"nik", Int64.Type}, {"fullname", type text},
           {"divisi", type text}, {"segmen", type any}, {"regional", type text},
           {"witel", type text}, {"nipnas", Int64.Type}, {"ca_name", type text},
           {"activity_type", type text}, {"label", type text}, {"lopid", type any},
           {"createdat", type datetime}, {"activity_start_date", type datetime},
           {"activity_end_date", type datetime}, {"pic_jobtitle", type text},
           {"pic_name", type text}, {"pic_role", type text}, {"pic_phone", type text},
           {"activity_notes", type text}})
         → set tipe kolom: nik→Int64 (non-numerik di-drop), dates→datetime (ada jam:menit:detik)

Step 8: = Table.SelectRows(#"Changed Type", each ([divisi] = "DPS" or [divisi] = "DSS")
           and ([witel] = "SURAMADU"))
         → filter final: hanya DPS/DSS witel SURAMADU
```

**Perbedaan kritis vs Pipeline (Sales Funnel):**
- Folder berbeda: `Sales_Activity_Suramadu` (bukan `Sales_Funnel_Suramadu`)
- Tidak ada fix AM manual (Reni→Havea) — sistem mencatat berdasarkan login user aktif
- Tidak ada filter `is_report` — semua aktivitas ditampilkan
- Kolom tanggal bertipe `datetime` (ada jam:menit:detik), bukan `date`
- Tidak ada dedup by LOP — dedup by `(nik, createdat_activity)` datetime
- Filter hanya DPS/DSS (tidak termasuk DGS di Power BI) — sistem kita menambah DGS untuk multi-divisi AM

**Implementasi di sistem (`cleanActivityRows` di `excel.ts`):**
- Filter witel=SURAMADU + divisi=DPS/DSS/DGS (DGS ditambah untuk AM multi-divisi)
- Validasi NIK numerik (rows dengan NIK non-numerik di-skip, sesuai `Int64.Type` Power BI)
- `fullname` **tidak** diwajibkan — baris tanpa fullname (Koordinasi internal, dll) tetap disimpan
- `ca_name` kosong → aktivitas "Tanpa Pelanggan" — **tetap disimpan** (107 baris di DB)
- Simpan datetime penuh (jam:menit:detik) untuk createdat, start_date, end_date
- Unique constraint `(nik, createdat_activity)` di DB untuk dedup antar import
- GDrive sync: loop semua file di folder (bukan hanya `excelFiles[0]`)

**Data saat ini (import_id=3):**
- 719 baris total (DPS=534, DSS=185) dari satu file upload, covering Jan–Mar 2026
- 107 baris dengan ca_name kosong (Tanpa Pelanggan) — tersimpan dengan benar
- 612 baris dengan ca_name (dengan pelanggan)
- 9 unique AM NIK terimport
- Power BI menunjukkan 1.352 karena membaca SEMUA file di folder (semua bulan + semua AM)

**Kolom lengkap (20 kolom):**
`nik, fullname, divisi, segmen, regional, witel, nipnas, ca_name, activity_type, label, lopid, createdat, activity_start_date, activity_end_date, pic_jobtitle, pic_name, pic_role, pic_phone, activity_notes`

**KPI Activity:** label yang **tidak** mengandung kata "tanpa" = KPI. Target default 20 per bulan.

**UI Import Cleaning Checklist:**
Di halaman Import → tab Sales Activity, terdapat komponen `ActivityCleaningChecklist` yang:
- Menampilkan 8 langkah Power Query di atas dengan keterangan kode M
- Saat import berjalan: langkah-langkah ter-check otomatis sesuai progress bar
- Setelah selesai: semua langkah berwarna hijau ✓
- Saat idle: bisa di-expand untuk melihat detail tiap langkah

## GSheets Integration Notes

- Spreadsheet: `1ojCi6dbJKCSPZU_cWozEByDwzYbZ6hVaf3n9aDibiVk` (LESA VI SURAMADU)
- Auto-detects sheet patterns: `TREG3_SALES_FUNNEL_`, `TREG3_ACTIVITY_`, `PERFORMANSI_`
- **Funnel GSheets**: nationwide TREG3 data; `nik_handling` is EMPTY for all SURAMADU rows; `nik_pembuat_lop` uses DSO/support NIKs (not AM NIKs). Import keeps ALL `witel=SURAMADU + is_report=Y` rows (~3007). Per-AM funnel attribution only works via Excel upload.
- **Activity GSheets/Drive**: correct AM attribution via `nik` column; divisi filter DPS/DSS applied; GDrive sync sekarang baca **SEMUA file** di folder (bukan hanya file terbaru), mengikuti perilaku Power BI Folder connector. Target: 1300+ baris total setelah import semua file.
- **Performance GSheets**: aggregates by NIK+PERIODE; skips DGS; gives 132 rows (11 AM × multiple months from PERFORMANSI data).
- **parseDate**: handles dd/MM/yyyy (GSheets format), Excel serial, and ISO formats.

## Database Schema

- `account_managers` — AM profiles with Telegram chat IDs
- `admin_users` — Admin login credentials
- `app_settings` — Application configuration (Telegram bot token, etc.)
- `data_imports` — Import history log
- `performance_data` — AM performance metrics
- `sales_activity` — Sales activity records. Unique constraint: `(nik, createdat_activity)` untuk dedup antar import. `fullname` nullable (Power BI tidak filter baris tanpa fullname). Datetime fields (`createdat_activity`, `activity_start_date`, `activity_end_date`) disimpan lengkap dengan jam:menit:detik.
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
