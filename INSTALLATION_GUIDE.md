# Panduan Instalasi Lokal — LESAVI VI · Witel Suramadu AM Dashboard

**Dokumen:** Panduan Teknis Instalasi & Konfigurasi Lingkungan Pengembangan
**Versi:** 1.0.0
**Tanggal:** 2026-03-31
**Repositori:** https://github.com/portodit/LESAVI-SURAMADU

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Prasyarat Sistem](#2-prasyarat-sistem)
3. [Kloning Repositori](#3-kloning-repositori)
4. [Konfigurasi Environment Variables](#4-konfigurasi-environment-variables)
5. [Instalasi Dependensi](#5-instalasi-dependensi)
6. [Setup Database PostgreSQL](#6-setup-database-postgresql)
7. [Migrasi Skema Database](#7-migrasi-skema-database)
8. [Seeding Data Awal](#8-seeding-data-awal)
9. [Menjalankan Aplikasi](#9-menjalankan-aplikasi)
10. [Verifikasi Instalasi](#10-verifikasi-instalasi)
11. [Kredensial Default](#11-kredensial-default)
12. [Troubleshooting](#12-troubleshooting)
13. [Referensi Port & Layanan](#13-referensi-port--layanan)

---

## 1. Gambaran Umum

LESAVI VI adalah dashboard monitoring performa Account Manager (AM) Telkom Witel Suramadu. Aplikasi ini dibangun sebagai **monorepo** berbasis pnpm workspaces dengan arsitektur sebagai berikut:

```
LESAVI-SURAMADU/
├── apps/
│   ├── dashboard/          # Frontend — React 19 + Vite + TypeScript
│   └── api/                # Backend — Express 5 + Drizzle ORM
├── packages/
│   ├── db/                 # Drizzle schema & koneksi database
│   ├── api-spec/           # OpenAPI specification
│   ├── api-zod/            # Zod types (auto-generated)
│   └── api-client-react/   # React Query hooks (auto-generated)
├── .env                    # Environment variables (dibuat manual)
└── pnpm-workspace.yaml
```

### Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Express 5, TypeScript, Drizzle ORM |
| Database | PostgreSQL 16 |
| Monorepo | pnpm workspaces |
| Auth | Session-based (express-session + bcrypt) |
| Bot | Telegram Bot API (polling, opsional) |

---

## 2. Prasyarat Sistem

Pastikan semua perangkat lunak berikut telah terinstal sebelum memulai:

| Perangkat Lunak | Versi Minimum | Keterangan |
|---|---|---|
| **Node.js** | v20.x atau lebih baru | Direkomendasikan v24.x |
| **pnpm** | v9.x atau lebih baru | Package manager utama |
| **Docker Desktop** | v4.x atau lebih baru | Untuk menjalankan PostgreSQL |
| **Git** | v2.x atau lebih baru | Untuk kloning repositori |

### Cara Verifikasi Prasyarat

```bash
node --version     # Contoh output: v24.12.0
pnpm --version     # Contoh output: 10.33.0
docker --version   # Contoh output: Docker version 29.x.x
git --version      # Contoh output: git version 2.x.x
```

### Instalasi pnpm (jika belum tersedia)

```bash
npm install -g pnpm
```

---

## 3. Kloning Repositori

```bash
git clone https://github.com/portodit/LESAVI-SURAMADU.git
cd LESAVI-SURAMADU
```

Setelah kloning, struktur direktori utama akan tersedia di folder `LESAVI-SURAMADU/`.

---

## 4. Konfigurasi Environment Variables

Buat file `.env` di **root direktori proyek** (`LESAVI-SURAMADU/.env`). File ini tidak disertakan di repositori dan harus dibuat secara manual.

```bash
# Buat file .env di root proyek
touch .env
```

Isi file `.env` dengan konfigurasi berikut:

```env
# === DATABASE ===
DATABASE_URL=postgresql://postgres:password@localhost:5432/lesavi_suramadu

# === SESSION ===
SESSION_SECRET=lesavi-suramadu-secret-local-dev

# === SERVER ===
PORT=3001
NODE_ENV=development

# === TELEGRAM BOT (Opsional) ===
# TELEGRAM_BOT_TOKEN=
```

### Keterangan Environment Variables

| Key | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | Connection string PostgreSQL |
| `SESSION_SECRET` | Ya | Secret untuk enkripsi session cookie |
| `PORT` | Ya | Port backend API (default: 3001) |
| `NODE_ENV` | Ya | Mode lingkungan: `development` atau `production` |
| `TELEGRAM_BOT_TOKEN` | Tidak | Token Telegram Bot (dapat diset via UI) |

> **Catatan:** Port default `8080` di dokumentasi asli mungkin sudah digunakan oleh layanan lain (contoh: Adminer). Gunakan port alternatif seperti `3001`.

---

## 5. Instalasi Dependensi

Jalankan perintah berikut dari **root direktori proyek** untuk menginstal seluruh dependensi semua workspace sekaligus:

```bash
pnpm install
```

Proses ini akan menginstal ±559 packages. Pastikan koneksi internet stabil. Proses instalasi memakan waktu sekitar 1–3 menit.

**Output yang diharapkan:**

```
Packages: +559
Done in 30.9s using pnpm v10.33.0
```

---

## 6. Setup Database PostgreSQL

Aplikasi ini memerlukan PostgreSQL 16. Cara termudah adalah menggunakan Docker.

### 6.1 Pastikan Docker Desktop Berjalan

Buka aplikasi **Docker Desktop** dan tunggu hingga status berubah menjadi **"Engine running"** (ikon Docker di system tray berwarna hijau).

### 6.2 Jalankan Container PostgreSQL

```bash
docker run -d \
  --name lesavi-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=lesavi_suramadu \
  -p 5432:5432 \
  postgres:16
```

### 6.3 Verifikasi Container Berjalan

```bash
docker ps --filter "name=lesavi-db"
```

**Output yang diharapkan:**

```
CONTAINER ID   IMAGE         COMMAND                  STATUS         PORTS
c5e1e10e7a79   postgres:16   "docker-entrypoint.s…"   Up X seconds   0.0.0.0:5432->5432/tcp
```

### 6.4 Tes Koneksi Database

```bash
docker exec lesavi-db pg_isready -U postgres
# Output yang diharapkan: /var/run/postgresql:5432 - accepting connections
```

> **Manajemen Container (Referensi Cepat)**
>
> ```bash
> docker stop lesavi-db    # Hentikan container
> docker start lesavi-db   # Jalankan kembali container
> docker rm lesavi-db      # Hapus container (data hilang)
> ```

---

## 7. Migrasi Skema Database

Langkah ini akan membuat semua tabel yang dibutuhkan di database berdasarkan Drizzle ORM schema.

> **Penting:** Terdapat bug diketahui di `packages/db/drizzle.config.ts` pada versi saat ini terkait penggunaan `__dirname` di lingkungan ESM. Lakukan perbaikan berikut sebelum menjalankan migrasi.

### 7.1 Perbaiki `drizzle.config.ts`

Buka file `packages/db/drizzle.config.ts` dan pastikan isinya seperti berikut (gunakan path relatif, bukan `path.join(__dirname, ...)`):

```typescript
// packages/db/drizzle.config.ts
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

### 7.2 Jalankan Migrasi

```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/lesavi_suramadu"
cd packages/db
pnpm run push
```

Atau dari root direktori:

```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/lesavi_suramadu"
pnpm --filter @workspace/db run push
```

**Output yang diharapkan:**

```
Reading config file 'drizzle.config.ts'
Using 'pg' driver for database querying
[✓] Pulling schema from database...
[✓] Changes applied
```

Tabel-tabel berikut akan terbuat secara otomatis:

| Tabel | Keterangan |
|---|---|
| `account_managers` | Data AM & akun login |
| `performance_data` | Data performa bulanan AM |
| `sales_funnel` | Pipeline funnel F0–F5 |
| `sales_activity` | Aktivitas kunjungan AM |
| `data_imports` | Log riwayat import data |
| `telegram_logs` | Log pengiriman Telegram |
| `telegram_bot_users` | Pengguna Telegram Bot |
| `app_settings` | Konfigurasi aplikasi |
| `drive_read_logs` | Log sinkronisasi Google Drive |
| `master_am` | Master data AM |
| `pending_am_discoveries` | AM baru yang belum dikonfigurasi |
| `user_sessions` | Tabel sesi pengguna (dibuat otomatis saat server pertama kali jalan) |

---

## 8. Seeding Data Awal

Jalankan perintah berikut untuk mengisi database dengan data awal (akun, data performa, funnel, dan aktivitas):

```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/lesavi_suramadu"
export SESSION_SECRET="lesavi-suramadu-secret-local-dev"
export NODE_ENV="development"

pnpm --filter @workspace/api-server run seed
```

**Output yang diharapkan:**

```
============================================================
  LESA VI Witel Suramadu — Database Seeder
  Target  : all
============================================================

▶ accounts     → 13 AM, 1 Manager, 1 Officer
▶ funnel-targets → 2 target(s)
▶ performance  → 132 record(s)
▶ activity     → 719 record(s)
▶ funnel       → 8696 record(s)

Seeding selesai!
============================================================
```

### Opsi Seeding Tambahan

```bash
# Seed ulang dari awal (truncate semua data)
pnpm --filter @workspace/api-server run seed:truncate

# Seed per modul
pnpm --filter @workspace/api-server run seed -- accounts
pnpm --filter @workspace/api-server run seed -- performance
pnpm --filter @workspace/api-server run seed -- activity
pnpm --filter @workspace/api-server run seed -- funnel
pnpm --filter @workspace/api-server run seed -- funnel-targets
```

---

## 9. Menjalankan Aplikasi

Aplikasi terdiri dari dua proses yang harus dijalankan secara bersamaan di dua terminal terpisah.

### 9.1 Perbaiki Konfigurasi Proxy Frontend

> **Penting:** Terdapat perbedaan path tsconfig antara struktur Replit (origin) dan GitHub repo. Lakukan perbaikan berikut sebelum menjalankan frontend.

**Perbaiki `apps/dashboard/tsconfig.json`** — ubah referensi dari `lib/` menjadi `packages/`:

```json
{
  "references": [
    {
      "path": "../../packages/api-client-react"
    }
  ]
}
```

**Perbaiki `apps/dashboard/vite.config.ts`** — sesuaikan target proxy dengan port API yang digunakan:

```typescript
server: {
  proxy: {
    "/api": {
      target: "http://localhost:3001",  // Sesuaikan dengan PORT di .env
      changeOrigin: true,
      secure: false,
    },
  },
},
```

### 9.2 Jalankan Backend (Terminal 1)

```bash
# Set environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/lesavi_suramadu"
export SESSION_SECRET="lesavi-suramadu-secret-local-dev"
export NODE_ENV="development"
export PORT=3001

# Build dan jalankan
pnpm --filter @workspace/api-server run dev
```

**Output yang diharapkan:**

```
INFO: Server listening  port: 3001
INFO: Default admin user ensured
INFO: Session table ensured
INFO: Default seed data ensured
```

### 9.3 Jalankan Frontend (Terminal 2)

```bash
export PORT=5000
export BASE_PATH=/
export NODE_ENV=development

pnpm --filter @workspace/telkom-am-dashboard run dev
```

**Output yang diharapkan:**

```
VITE v6.x.x  ready in 539 ms

➜  Local:   http://localhost:5000/
➜  Network: http://192.168.x.x:5000/
```

> **Catatan:** Apabila port 5000 sudah digunakan, Vite akan otomatis berpindah ke port 5001. Perhatikan output terminal untuk mengetahui port yang aktif.

---

## 10. Verifikasi Instalasi

Setelah kedua proses berjalan, lakukan verifikasi berikut:

### 10.1 Tes Backend API

```bash
curl http://localhost:3001/api/health
# Output yang diharapkan: {"error":"Unauthorized"} atau {"status":"ok"}
# Response apapun (200/401) menandakan server berjalan
```

### 10.2 Tes Frontend

```bash
curl -o /dev/null -s -w "%{http_code}" http://localhost:5000/
# Output yang diharapkan: 200
```

### 10.3 Buka di Browser

Buka browser dan navigasi ke:

```
http://localhost:5000
```

Halaman login dashboard LESAVI VI akan muncul.

---

## 11. Kredensial Default

Setelah seeding berhasil, gunakan akun berikut untuk login pertama kali:

| Field | Nilai |
|---|---|
| **Email** | `bliadiitdev@gmail.com` |
| **Password** | `admin123` |
| **Role** | OFFICER (Admin) |

> **Rekomendasi Keamanan:** Ganti password default segera setelah login pertama kali melalui menu pengaturan akun.

---

## 12. Troubleshooting

### Error: `No schema files found`

**Gejala:**
```
Error: No schema files found for path config ['...packages/db/src/schema/index.ts']
```

**Penyebab:** File `drizzle.config.ts` menggunakan `__dirname` yang tidak tersedia di konteks ESM.

**Solusi:** Ubah schema path menjadi path relatif di `packages/db/drizzle.config.ts`:
```typescript
schema: "./src/schema/index.ts",
```

---

### Error: `listen EADDRINUSE: address already in use :::8080`

**Gejala:** Server API gagal start karena port sudah digunakan.

**Solusi:** Gunakan port alternatif dengan mengubah nilai `PORT` di `.env`:
```env
PORT=3001
```
Kemudian sesuaikan juga target proxy di `apps/dashboard/vite.config.ts`.

---

### Error: `TSConfckParseError: lib/api-client-react/tsconfig.json not found`

**Gejala:** Frontend gagal start, Vite tidak bisa resolve tsconfig.

**Penyebab:** `apps/dashboard/tsconfig.json` merujuk ke path struktur Replit (`lib/`) yang berbeda dengan struktur repositori GitHub (`packages/`).

**Solusi:** Ubah referensi di `apps/dashboard/tsconfig.json`:
```json
{
  "references": [
    { "path": "../../packages/api-client-react" }
  ]
}
```

---

### Error: `BASE_PATH` Mengandung Path Git Bash (Windows)

**Gejala:**
```
Local: http://localhost:5000/Program%20Files/Git/
```

**Penyebab:** Di Git Bash (Windows), nilai `BASE_PATH=/` diinterpretasikan sebagai root filesystem Git Bash.

**Solusi:** Set variabel menggunakan `MSYS_NO_PATHCONV`:
```bash
MSYS_NO_PATHCONV=1 BASE_PATH='/' pnpm --filter @workspace/telkom-am-dashboard run dev
```

---

### Docker Desktop Tidak Berjalan

**Gejala:**
```
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

**Solusi:** Buka Docker Desktop secara manual dari Start Menu dan tunggu hingga engine berjalan (ikon system tray hijau) sebelum menjalankan container.

---

### Container PostgreSQL Sudah Ada

**Gejala:**
```
docker: Error response from daemon: Conflict. The container name "/lesavi-db" is already in use
```

**Solusi:**
```bash
docker start lesavi-db   # Jika ingin menggunakan container yang ada
# ATAU
docker rm lesavi-db      # Hapus container lama, lalu buat ulang
```

---

## 13. Referensi Port & Layanan

| Layanan | Port Default | Keterangan |
|---|---|---|
| **Frontend (Vite)** | `5000` | Berpindah ke `5001` jika port terpakai |
| **Backend (Express API)** | `3001` | Dapat dikustomisasi via env `PORT` |
| **PostgreSQL** | `5432` | Di dalam Docker container |

### Ringkasan Perintah Berguna

```bash
# Cek status container database
docker ps --filter "name=lesavi-db"

# Lihat log API server
# (jika dijalankan dengan output redirect ke file)
tail -f /tmp/lesavi-api.log

# Seed ulang database dari awal
export DATABASE_URL="postgresql://postgres:password@localhost:5432/lesavi_suramadu"
pnpm --filter @workspace/api-server run seed:truncate

# Akses database langsung
docker exec -it lesavi-db psql -U postgres -d lesavi_suramadu
```

---

*Dokumen ini disusun berdasarkan proses instalasi aktual pada sistem Windows 11 Pro dengan Node.js v24.12.0 dan pnpm v10.33.0.*
