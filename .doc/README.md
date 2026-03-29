# Dokumentasi Proyek — LESAVI VI · Witel Suramadu AM Dashboard

Folder ini berisi dokumentasi teknis proyek. Dibaca pertama kali saat project di-clone ke environment baru.

## Daftar Dokumen

| File | Isi |
|---|---|
| [SETUP.md](./SETUP.md) | Setup environment baru dari awal (clone → running) |
| [GITHUB-PUSH.md](./GITHUB-PUSH.md) | Cara push ke GitHub, setup token PAT, troubleshooting |
| [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md) | Arsitektur proyek, stack, folder structure, konvensi kode |
| [WORKFLOWS.md](./WORKFLOWS.md) | Cara kerja Replit workflows, port, dan hal yang tidak boleh diubah |

## Quick Start (TL;DR)

```bash
# 1. Install dependencies
pnpm install

# 2. Pastikan DATABASE_URL ada di Replit Secrets

# 3. Jalankan workflow via Replit UI (sudah dikonfigurasi otomatis)

# 4. Push ke GitHub (butuh GITHUB_PERSONAL_ACCESS_TOKEN di Secrets)
bash _push-to-github.sh "feat: deskripsi perubahan"
```

> **Penting:** Jangan ubah nama folder `artifacts/` di dalam Replit — itu konvensi sistem Replit dan sudah dipetakan ke struktur bersih di GitHub oleh script push.
