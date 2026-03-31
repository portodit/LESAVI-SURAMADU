# Setup GitHub Token dan Push Script — 2026-03-31

## Request
Setup GITHUB_TOKEN di Replit Secrets supaya agent bisa commit otomatis ke repo LESAVI-SURAMADU setiap setelah menyelesaikan task, dan membuat brief di folder `doc` untuk setiap task yang dikerjakan.

## Yang Dikerjakan

### 1. Clone Repository
- Repo `https://github.com/portodit/LESAVI-SURAMADU` di-clone ke `/tmp/lesavi-suramadu`
- Membaca folder `.doc/` (panduan project) dan `doc/` (brief task historis)

### 2. Pemahaman Proyek
Dari membaca `.doc/PROJECT_BRIEF.md` dan `.doc/WORKFLOW_RULES.md`:
- **Project**: LESAVI VI WITEL SURAMADU — AM Dashboard monitoring Account Manager Telkom Witel Suramadu
- **Stack**: React 19 + Vite (frontend), Express 5 + TypeScript (backend), PostgreSQL + Drizzle ORM, Telegram Bot
- **Production**: `https://lesa-vi.replit.app`
- **GitHub repo tunggal**: `portodit/LESAVI-SURAMADU` branch `master`

### 3. Path Mapping (Replit ↔ GitHub)
| Replit Lokal | GitHub Repo |
|---|---|
| `artifacts/api-server/` | `apps/api/` |
| `artifacts/telkom-am-dashboard/` | `apps/dashboard/` |
| `lib/` | `packages/` |
| `.doc/` | `.doc/` |

### 4. Setup GITHUB_TOKEN
- Token format `ghp_xxx` (40 karakter) berhasil diset di Replit Secrets
- Token pertama yang dimasukkan adalah URL repo (salah) — harus diulang dengan PAT yang benar
- Verifikasi: `curl https://api.github.com/repos/portodit/LESAVI-SURAMADU` → Status 200 OK

### 5. File yang Disalin ke Workspace
- `push-to-github.mjs` — script push via GitHub REST API
- `.doc/` (seluruh folder) — dokumentasi project
- `doc/` (seluruh folder) — brief task historis

### 6. Test Push
Push pertama berhasil ke commit `53459c83547dc9acccc0fd3b7c5c474d95510867`:
```
"chore: setup workspace - salin script push dan dokumentasi dari repo"
```

## Cara Kerja Push Script

Script `push-to-github.mjs` menggunakan GitHub REST API (bukan git CLI, karena Replit memblokir git):

```bash
# Push file spesifik (direkomendasikan — cepat 2-5 detik)
node push-to-github.mjs "feat: deskripsi" path/file1.tsx path/file2.ts

# Push semua file berubah (mode diff — lebih lambat)
node push-to-github.mjs "fix: deskripsi"
```

Format commit: `feat:` / `fix:` / `refactor:` / `docs:` / `chore:`

## Aturan Wajib Setiap Task Selesai

1. **Push ke GitHub** — jalankan `node push-to-github.mjs "tipe: deskripsi" file1 file2 ...`
2. **Buat brief di `doc/`** — file `YYYYMMDD_nama-task.md` dengan format ini
3. **Update `replit.md`** — jika ada perubahan arsitektur/fitur/dependency baru
4. **Suggest redeploy** — jika perubahan mempengaruhi UI atau API production

## Hasil
- GITHUB_TOKEN tersimpan di Replit Secrets ✓
- `push-to-github.mjs` tersalin ke workspace root ✓
- `.doc/` dan `doc/` tersalin ke workspace ✓
- Push test berhasil ke GitHub ✓
- Workflow commit otomatis siap digunakan untuk semua task berikutnya ✓
