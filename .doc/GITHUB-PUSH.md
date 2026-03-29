# Panduan Push ke GitHub — LESAVI AM Dashboard

Panduan lengkap untuk menghubungkan Replit project ke GitHub dan melakukan push perubahan.

---

## Informasi Repo GitHub

- **URL:** `https://github.com/portodit/LESAVI-SURAMADU-DASHBOARD`
- **Branch utama:** `master`
- **Pemilik:** `portodit`

---

## Cara Push (Cepat)

Setelah setup token (lihat bagian bawah), push cukup dengan satu perintah:

```bash
bash _push-to-github.sh "feat: deskripsi singkat perubahan"
```

Script ini otomatis:
1. Clone repo GitHub ke folder `/tmp/` sementara
2. Menyalin source code dari Replit workspace dengan **struktur bersih**
3. Commit dengan pesan yang diberikan
4. Push ke branch `master`

### Konvensi pesan commit

```
feat: tambah fitur baru X
fix: perbaiki bug Y
refactor: restructure komponen Z
chore: update dependencies
docs: update dokumentasi
style: perbaiki tampilan halaman X
```

---

## Setup Token GitHub (Sekali Saja)

Push memerlukan **Personal Access Token (PAT)** GitHub. Token ini disimpan sebagai Replit Secret.

### Langkah 1 — Buat token di GitHub

1. Buka: **https://github.com/settings/tokens/new**
   *(atau: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token)*

2. Isi form:
   - **Note:** `Replit LESAVI` (bebas)
   - **Expiration:** 90 days atau No expiration (sesuai preferensi)
   - **Scope:** centang ✅ `repo` (Full control of private repositories)

3. Klik **Generate token**

4. **Copy tokennya sekarang** — token hanya ditampilkan sekali!
   Bentuknya: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (40 karakter)

### Langkah 2 — Simpan token di Replit Secrets

1. Di Replit, klik ikon **kunci 🔒** di sidebar kiri (tab Secrets)
2. Klik **+ New Secret**
3. Isi:
   - **Key:** `GITHUB_PERSONAL_ACCESS_TOKEN`
   - **Value:** paste token yang tadi di-copy
4. Klik **Save**

> Secret aman — tidak terlihat di kode, tidak ikut ter-push ke GitHub.

### Langkah 3 — Verifikasi token aktif

```bash
[ -n "$GITHUB_PERSONAL_ACCESS_TOKEN" ] && echo "✅ Token aktif (${#GITHUB_PERSONAL_ACCESS_TOKEN} chars)" || echo "❌ Token belum diset"
```

Output yang benar: `✅ Token aktif (40 chars)`

---

## Pemetaan Folder (Replit → GitHub)

Script push secara otomatis mengubah nama folder agar terlihat profesional di GitHub:

| Folder di Replit (internal) | Folder di GitHub (publik) |
|---|---|
| `artifacts/telkom-am-dashboard/` | `apps/dashboard/` |
| `artifacts/api-server/` | `apps/api/` |
| `lib/db/` | `packages/db/` |
| `lib/api-spec/` | `packages/api-spec/` |
| `lib/api-zod/` | `packages/api-zod/` |
| `lib/api-client-react/` | `packages/api-client-react/` |

**File yang di-push ke GitHub:**
- Source code (`src/`, `index.html`, `vite.config.ts`, dll.)
- Config files (`package.json`, `tsconfig.json`, `components.json`, dll.)
- `.gitignore` dan `README.md` (auto-generate oleh script)

**File yang TIDAK di-push** (sudah ada di `.gitignore`):
- `node_modules/`
- `dist/` (build output)
- `.env` (environment variables)
- `*.tsbuildinfo`

---

## Troubleshooting

### Error: `TOKEN NOT SET`
```
❌ GITHUB_PERSONAL_ACCESS_TOKEN belum diset di Replit Secrets.
```
**Solusi:** Ikuti langkah setup token di atas.

---

### Error: `Authentication failed`
```
remote: Support for password authentication was removed on August 13, 2021.
```
**Solusi:** Token sudah expired atau salah. Buat token baru di GitHub dan update di Replit Secrets.

---

### Error: `src refspec main does not match any`
```
error: src refspec main does not match any
error: failed to push some refs
```
**Solusi:** Branch di GitHub adalah `master`, bukan `main`. Script sudah menggunakan `master` — jika masih error, cek file `_push-to-github.sh` baris `git push origin master`.

---

### Error: `Repository not found`
```
ERROR: Repository not found.
fatal: repository '...' not found
```
**Solusi:**
1. Pastikan repo `https://github.com/portodit/LESAVI-SURAMADU-DASHBOARD` sudah dibuat di GitHub
2. Pastikan token punya akses ke repo tersebut (scope `repo`)
3. Jika repo private, pastikan token pemilik repo yang digunakan

---

### Tidak ada perubahan yang di-push
```
✅ Tidak ada perubahan baru untuk di-push.
```
**Ini normal** — artinya kode di Replit identik dengan yang sudah ada di GitHub. Lakukan perubahan kode dulu, baru push.

---

## Token Expired

Token PAT GitHub punya masa berlaku. Jika token expired:
1. Buat token baru di **https://github.com/settings/tokens**
2. Update di Replit: tab **Secrets** → cari `GITHUB_PERSONAL_ACCESS_TOKEN` → edit valuenya
3. Tidak perlu ubah kode apapun

---

## Alternatif: Push via Replit Git UI

Selain script, bisa juga push via tab **Git** di Replit:
1. Pastikan koneksi GitHub **Active** (bukan Disconnected)
2. Klik **Pull** dulu untuk sync
3. Klik **Push**

> Catatan: Replit Git UI push dalam format Replit (folder `artifacts/`), bukan format bersih `apps/`. Gunakan script `_push-to-github.sh` untuk mendapatkan struktur yang lebih rapi.
