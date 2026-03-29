# Replit Workflows — Panduan & Aturan

Dokumen ini menjelaskan cara kerja workflow di Replit untuk project ini, hal yang boleh dan tidak boleh dilakukan.

---

## Apa itu Workflow?

Workflow di Replit adalah proses yang berjalan terus-menerus (persistent process) — seperti dev server atau backend API. Replit memantau port yang dibuka oleh workflow untuk menampilkan preview ke user.

---

## Daftar Workflow yang Benar

Project ini memiliki **3 workflow resmi** yang dikelola oleh sistem artifact Replit:

| Workflow Name | Command | Port | Tipe Output |
|---|---|---|---|
| `artifacts/telkom-am-dashboard: web` | `pnpm --filter @workspace/telkom-am-dashboard run dev` | `24930` | webview |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | `8080` | console |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | — | webview |

> ✅ **Pastikan hanya workflow di atas yang ada.** Jangan buat duplikat.

---

## ⚠️ Aturan Kritis — Jangan Dilanggar

### 1. Jangan buat workflow dengan nama generik

Workflow dengan nama seperti berikut **AKAN MENYEBABKAN KONFLIK PORT**:

```
❌ Start application
❌ API Server           (tanpa prefix artifacts/)
❌ Frontend
❌ Backend
```

Ini adalah workflow lama/duplikat. Jika ada, **hapus segera**.

**Cara hapus via Shell:**
```javascript
// Di Replit Shell, jalankan:
// Ini hanya bisa dilakukan melalui Replit agent/AI
```

Atau minta AI agent Replit untuk menghapus dengan perintah:
> "Hapus workflow 'Start application' dan 'API Server' yang bukan artifact workflow"

### 2. Jangan ubah port workflow

Frontend menggunakan port `24930`, backend `8080`. Port ini sudah dikonfigurasi di `artifact.toml`.

Jika port diubah, preview pane di Replit tidak akan bisa menampilkan app.

### 3. Jangan jalankan `npm run dev` langsung di Shell

Menjalankan dev server di Shell secara manual akan konflik dengan workflow yang sudah berjalan.

---

## Kenapa Ada Nama Aneh `artifacts/...`?

Nama workflow seperti `artifacts/telkom-am-dashboard: web` adalah konvensi sistem artifact Replit. Ini memastikan:
- Workflow otomatis terhubung ke preview pane yang benar
- Environment variables (PORT, BASE_PATH) otomatis di-inject dari `artifact.toml`
- Workflow di-restart otomatis setelah package install

**Di GitHub, nama folder ini sudah dipetakan ke `apps/dashboard/` oleh script push** — jadi tidak perlu khawatir nama aneh ini terlihat di repo publik.

---

## Cara Restart Workflow

Setelah mengubah kode backend (Express), workflow API perlu di-restart agar perubahan berlaku.

**Via Replit UI:**
1. Buka tab workflow (ikon ▶ di sidebar)
2. Klik workflow yang ingin di-restart
3. Klik tombol restart

**Via AI agent (minta ke agent):**
> "Restart workflow artifacts/api-server: API Server"

**Frontend (React):** Tidak perlu restart — Vite Hot Module Replacement (HMR) otomatis refresh perubahan saat file disimpan.

---

## Troubleshooting Workflow

### Workflow FAILED — Port already in use

```
Port 24930 is in use, trying another one...
```

**Penyebab:** Ada workflow duplikat yang sudah mengambil port tersebut.

**Solusi:**
1. Cek apakah ada workflow `Start application` — hapus jika ada
2. Restart workflow `artifacts/telkom-am-dashboard: web`

### Workflow tidak muncul di daftar

Workflow hilang bisa terjadi setelah import dari GitHub. Cara restore:

Minta AI agent Replit:
> "Buat ulang workflow untuk artifact telkom-am-dashboard dan api-server sesuai artifact.toml"

### Preview blank / tidak load

1. Pastikan workflow frontend `running` (bukan `failed`)
2. Pastikan tidak ada error di log workflow
3. Coba hard refresh browser (Ctrl+Shift+R)
4. Cek apakah ada error di browser console

### Backend tidak merespons (API error)

1. Pastikan workflow `artifacts/api-server: API Server` running
2. Cek log workflow untuk error TypeScript atau database
3. Pastikan `DATABASE_URL` sudah ada di Secrets

---

## Environment Variables yang Di-inject Otomatis

Workflow frontend mendapat env vars berikut secara otomatis dari `artifact.toml`:

```
PORT=24930
BASE_PATH=/
```

Workflow backend mendapat:
```
PORT=8080
```

Tambahan dari Replit Secrets (harus diisi manual):
```
DATABASE_URL=...
SESSION_SECRET=...
TELEGRAM_BOT_TOKEN=...   (opsional)
GITHUB_PERSONAL_ACCESS_TOKEN=...   (untuk push GitHub)
```
