# Setup Environment Baru — LESAVI AM Dashboard

Panduan ini digunakan ketika project di-clone ke chat/workspace Replit yang baru.  
Ikuti langkah-langkah berikut secara berurutan.

---

## 1. Asal Project

- **GitHub repo:** `https://github.com/portodit/LESAVI-SURAMADU-DASHBOARD`
- **Stack:** React 19 + Vite (frontend) · Express 5 + Drizzle ORM (backend) · PostgreSQL
- **Package manager:** pnpm (monorepo workspaces)

---

## 2. Clone & Buka di Replit

1. Di Replit, klik **+ Create Repl**
2. Pilih tab **Import from GitHub**
3. Masukkan URL: `https://github.com/portodit/LESAVI-SURAMADU-DASHBOARD`
4. Pilih bahasa **Node.js**
5. Klik **Import from GitHub**

---

## 3. Struktur Folder di Replit vs GitHub

> ⚠️ **Penting:** Struktur folder di Replit **berbeda** dengan yang ada di GitHub.  
> Script `_push-to-github.sh` yang melakukan pemetaan otomatis saat push.

| Di GitHub (repo) | Di Replit (workspace) | Keterangan |
|---|---|---|
| `apps/dashboard/` | `artifacts/telkom-am-dashboard/` | Frontend React |
| `apps/api/` | `artifacts/api-server/` | Backend Express |
| `packages/db/` | `lib/db/` | Drizzle schema |
| `packages/api-spec/` | `lib/api-spec/` | OpenAPI spec |
| `packages/api-zod/` | `lib/api-zod/` | Zod types |
| `packages/api-client-react/` | `lib/api-client-react/` | React Query hooks |

**Jangan pernah mengubah nama folder `artifacts/` atau `lib/` di dalam Replit** — itu dikelola oleh sistem artifact Replit.

---

## 4. Setup Secrets (Environment Variables)

Buka tab **Secrets** (ikon kunci 🔒 di sidebar Replit) dan tambahkan:

| Key | Nilai | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host/db` | **Wajib** — koneksi PostgreSQL |
| `SESSION_SECRET` | string acak panjang | **Wajib** — untuk enkripsi session login |
| `TELEGRAM_BOT_TOKEN` | `123456:ABC-...` | Opsional — bisa diset via UI dashboard |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | `ghp_xxxxx` | Untuk push ke GitHub (lihat [GITHUB-PUSH.md](./GITHUB-PUSH.md)) |

### Cara dapat DATABASE_URL di Replit
1. Buka tab **Database** di sidebar Replit
2. Klik **Create a Database** (PostgreSQL)
3. `DATABASE_URL` otomatis terisi sebagai environment variable

---

## 5. Install Dependencies

Buka **Shell** di Replit dan jalankan:

```bash
pnpm install
```

> Jika `pnpm` tidak tersedia: `npm install -g pnpm` lalu ulangi.

---

## 6. Setup Database (Pertama Kali)

Jalankan migration untuk membuat semua tabel:

```bash
pnpm --filter @workspace/db run db:push
```

Untuk mengisi data awal (seed akun admin dll):

```bash
pnpm --filter @workspace/api-server run seed
```

---

## 7. Konfigurasi Workflows

Project ini menggunakan 3 workflow Replit. Cek di tab **Workflows** apakah sudah ada:

| Workflow Name | Command | Port |
|---|---|---|
| `artifacts/telkom-am-dashboard: web` | `pnpm --filter @workspace/telkom-am-dashboard run dev` | 24930 |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | — |

> ⚠️ **Jangan buat workflow duplikat** seperti `Start application` atau `API Server` (tanpa prefix `artifacts/`) — ini akan menyebabkan konflik port. Lihat [WORKFLOWS.md](./WORKFLOWS.md) untuk detail.

---

## 8. Verifikasi Berjalan

Setelah semua workflow running:

1. Buka tab **Preview** di Replit
2. Harusnya muncul halaman login LESAVI dashboard
3. Login dengan akun admin yang sudah di-seed

---

## 9. Setup GitHub Push (Opsional)

Jika ingin bisa push perubahan ke GitHub dari Replit, lihat panduan lengkap di:  
→ [GITHUB-PUSH.md](./GITHUB-PUSH.md)

---

## Troubleshooting Umum

| Masalah | Solusi |
|---|---|
| Frontend tidak muncul di Preview | Pastikan workflow `artifacts/telkom-am-dashboard: web` running, bukan yang lain |
| Error `Cannot connect to database` | Cek `DATABASE_URL` di Secrets, pastikan format benar |
| Port 24930 already in use | Ada workflow duplikat — hapus `Start application` jika ada |
| `pnpm: command not found` | Jalankan `npm install -g pnpm` di Shell |
| API 401 Unauthorized | Normal di halaman publik — login dulu di `/login` |
