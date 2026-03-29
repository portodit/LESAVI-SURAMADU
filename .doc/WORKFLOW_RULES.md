# LESAVI SURAMADU — Workflow Rules untuk Agent

## Aturan Wajib Setiap Akhir Task

### 1. Selalu Commit + Push ke GitHub
Setelah setiap task selesai, agent **langsung menjalankan** perintah ini (tidak perlu user lakukan manual):

```bash
node push-to-github.mjs "pesan commit" file1 file2 file3 ...
```

Contoh push file spesifik (mode tercepat, 2–5 detik):
```bash
node push-to-github.mjs "fix: sticky header table" \
  artifacts/telkom-am-dashboard/src/features/performance/PresentationPage.tsx \
  replit.md
```

Contoh push semua file berubah (diff-mode, lebih lama):
```bash
node push-to-github.mjs "chore: update codebase"
```

Detail teknis selengkapnya → lihat **[GITHUB_PUSH_GUIDE.md](./GITHUB_PUSH_GUIDE.md)**

- **Remote**: `https://github.com/portodit/LESAVI-SURAMADU`
- **Branch**: `master`
- **Akun GitHub**: `PORTODIT` (email: `bliaditdev@gmail.com`)
- **Token**: env var `GITHUB_TOKEN` (sudah ada di Replit Secrets)

Format pesan commit yang disarankan:
```
feat: <deskripsi fitur baru>
fix:  <deskripsi bugfix>
refactor: <deskripsi refactor>
chore: <perubahan konfigurasi/tooling>
```

### 2. Redeploy Project Setelah Push
Setelah push berhasil, agent menyarankan redeploy agar perubahan live di production.

### 3. Update `replit.md`
Setiap perubahan arsitektur signifikan (fitur baru, tambah dependency, ubah schema DB) wajib dicatat di `replit.md`.

---

## Kredensial & Konfigurasi

| Item | Nilai |
|------|-------|
| Default NIK login | `160203` |
| Default password | `admin123` |
| Frontend port | `24930` |
| API port | `8080` |
| GitHub repo | `https://github.com/portodit/LESAVI-SURAMADU` |
| GitHub branch | `master` |
| GitHub user | `PORTODIT` |
| GitHub email | `bliaditdev@gmail.com` |

---

## Stack Ringkas

- **Frontend**: React 19 + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL
- **Auth**: Session-based (express-session + bcrypt)
- **Bot**: Telegram Bot (polling) — notifikasi & laporan AM
- **Monorepo**: pnpm workspaces

---

## Public Routes (tanpa auth)

- `GET /api/public/*` — semua endpoint public
- `/embed/performa` — embed iframe performa tanpa guard

---

## Catatan Penting

- **Git CLI sepenuhnya diblokir** di main agent oleh platform Replit (termasuk `git add`, `git commit`, `git push`, `git status`). Solusinya: gunakan `push-to-github.mjs` yang bypass git sepenuhnya via GitHub REST API. Lihat [GITHUB_PUSH_GUIDE.md](./GITHUB_PUSH_GUIDE.md).
- Reconcile job berjalan setiap **30 menit** di background.
- Telegram bot menggunakan `skipPendingUpdates` untuk menghindari spam saat restart.
