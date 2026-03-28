# Spesifikasi Fitur: Import Data

**Proyek:** LESA VI Witel Suramadu — AM Dashboard  
**Versi Dokumen:** 1.0  
**Tanggal:** 28 Maret 2026

---

## 1. Gambaran Umum

Fitur Import Data memungkinkan admin (Officer/Manager) memasukkan data performa ke dalam dashboard melalui tiga cara:
1. **Upload Manual** — file Excel diunggah langsung dari komputer
2. **Google Drive Folder** — sistem membaca folder Drive yang telah dikonfigurasi, mengambil file terbaru
3. **Google Sheets** — sistem membaca tab sheet tertentu dari spreadsheet Google Sheets

---

## 2. Tipe Data yang Bisa Diimport

| Tipe | Label Tab | Kode Internal | Tabel DB |
|------|-----------|---------------|----------|
| Performansi AM | Performa AM | `performance` | `performance_data` |
| Pipeline Penjualan | Sales Funnel | `funnel` | `sales_funnel` |
| Aktivitas Harian AM | Sales Activity | `activity` | `sales_activity` |
| Target HO | Target HO | `target` | `sales_funnel_target` |

---

## 3. Tab Import: Struktur UI

### 3.1 Tab Umum (Performa AM, Sales Funnel, Sales Activity)

Setiap tab data memiliki **button group** untuk memilih sumber:

| Tombol | Mode | Keterangan |
|--------|------|------------|
| Upload Manual | `manual` | Drag-drop atau pilih file .xlsx dari perangkat |
| Google Drive | `drive` | Baca file terbaru dari folder Drive yang terkonfigurasi |

**Mode Manual:**
- Drag-drop atau klik untuk pilih file `.xlsx` / `.xls`
- Nama file harus mengandung tanggal dalam format `_YYYYMMDD` (contoh: `TREG3_ACTIVITY_20260328.xlsx`)
- Jika format nama tidak sesuai: tampil peringatan, tanggal snapshot wajib diisi manual
- Cek duplikat: jika sudah ada snapshot dengan tanggal yang sama → tampil warning
- Import meng-overwrite snapshot lama jika periode sama

**Mode Google Drive:**
- Klik "Cek File di Drive" → tampil daftar file dari folder yang dikonfigurasi
- File paling atas (terbaru berdasarkan `modifiedTime`) ditandai "Terbaru"
- Dapat sync file tunggal atau multi-file (checkbox)
- Sync log real-time ditampilkan (status: waiting/running/OK/error)

---

### 3.2 Tab Google Sheets — "Pusat Konfigurasi"

Tab ini adalah pusat pengaturan untuk semua integrasi Google. Terdiri dari dua bagian:

#### Bagian A: Google API Key
- Satu API Key bersama untuk Google Sheets API dan Google Drive API
- Wajib diisi sebelum bisa menggunakan fitur Google Sheets maupun Drive
- Nilai disimpan terenkripsi di DB, ditampilkan sebagai `***XXXXXX` di UI

#### Bagian B: Sumber Data (Button Group)

**[Google Sheets] | [Google Drive Folder]**

---

**Mode: Google Sheets**

Input URL spreadsheet atau Spreadsheet ID. Mendukung format:
- URL penuh: `https://docs.google.com/spreadsheets/d/ID/edit`
- ID langsung: `1abc...xyz`

Alur:
1. Tempel URL/ID → Klik "Simpan ID" → klik "Cek Sheet"
2. Sistem menampilkan semua tab di spreadsheet
3. Sistem auto-detect tipe berdasarkan prefix nama tab:
   - `TREG3_SALES_FUNNEL_YYYYMMDD` → Funnel
   - `TREG3_ACTIVITY_YYYYMMDD` → Activity
   - `PERFORMANSI_YYYYMMDD` → Performance
4. User pilih tab yang ingin diimport → Klik "Sync Sheet Terpilih"

**Mode: Google Drive Folder**

Konfigurasi URL folder Drive per tipe data:

| Tipe | Default Folder URL |
|------|--------------------|
| Target Funnel | `https://drive.google.com/drive/folders/1O082T_jUbeY5hoaDMJtF-cwH3HfOJDee` |
| Sales Funnel | `https://drive.google.com/drive/folders/1BX1uNVRo7EtqmFdvVQxgtACh21M0-4BT` |
| Sales Activity | `https://drive.google.com/drive/folders/1sFgsmn016jDQGrIXaRuygj_CTgKKGP16` |
| Performansi | `https://drive.google.com/drive/folders/1qt32nVLMT6Xd3HRXHIZvW4PPN3osuOjX` |

**Jadwal Otomatis Drive Check:**
- Dapat diaktifkan/nonaktifkan dari tab Google Sheets
- Konfigurasi: jam pelaksanaan (WIB) dan interval hari
- Sistem secara otomatis mengecek folder sesuai jadwal
- Jika file terbaru memiliki tanggal berbeda dari snapshot terakhir → otomatis import
- Log setiap percobaan disimpan dan ditampilkan di UI

---

## 4. Validasi Nama File dan Tanggal

### 4.1 Format Nama File yang Valid

File harus memiliki nama dengan pola `_YYYYMMDD` di dalamnya:

```
TREG3_SALES_FUNNEL_20260328.xlsx     ✅ VALID
TREG3_ACTIVITY_20260315.xlsx         ✅ VALID  
PERFORMANSI_20260301.xlsx            ✅ VALID
sales_data.xlsx                      ❌ TIDAK VALID (tidak ada tanggal)
laporan_2026.xlsx                    ❌ TIDAK VALID (format tanggal salah)
```

Regex ekstraksi tanggal: `/[_-](\d{8})[._?\s&]/`

### 4.2 Aturan Snapshot Update

**File baru hanya bisa diimport jika tanggalnya BERBEDA dari snapshot yang sudah ada.**

Cek dilakukan saat:
- Mode Google Drive → klik Sync
- Mode Drive Auto-scheduler → saat pengecekan otomatis

Alur logika:
```
Baca folder Drive
  → Filter file yang valid (extension .xlsx/.xls atau Google Sheets)
  → Ambil file terbaru (sort by modifiedTime desc)
  → Ekstrak tanggal dari nama file
  → Jika tidak ada tanggal → kondisi: format_invalid → log + skip
  → Ambil snapshotDate terbaru dari DB untuk tipe ini
  → Jika tanggal file == snapshotDate DB → kondisi: date_same → log + skip
  → Jika tanggal file != snapshotDate DB → import
     → Jika berhasil → kondisi: imported → log
     → Jika gagal → kondisi: import_error → log
```

---

## 5. Riwayat Baca Folder Google Drive (Drive Read Log)

### 5.1 Tabel Database: `drive_read_logs`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial | Primary key |
| `type` | text | `performance` / `funnel` / `activity` / `target` |
| `folder_id` | text | ID folder Google Drive |
| `triggered_by` | text | `manual` (user) atau `auto` (scheduler) |
| `checked_at` | timestamp | Waktu percobaan |
| `files_found` | integer | Jumlah file ditemukan (setelah filter format) |
| `latest_file_name` | text | Nama file terbaru |
| `latest_file_date_extracted` | text | Tanggal yang ter-ekstrak dari nama file (YYYY-MM-DD) |
| `existing_snapshot_date` | text | Snapshot terakhir di DB (YYYY-MM-DD) |
| `condition` | text | Kondisi hasil (lihat di bawah) |
| `message` | text | Pesan ringkas |
| `rows_imported` | integer | Baris terimport (jika berhasil) |
| `detail` | jsonb | Detail tambahan (daftar file, error, dll) |

### 5.2 Kondisi (condition)

| Kondisi | Penjelasan |
|---------|------------|
| `api_key_missing` | API Key belum dikonfigurasi |
| `folder_missing` | URL folder belum dikonfigurasi |
| `folder_invalid` | URL folder tidak bisa di-parse (tidak ada ID folder) |
| `api_error` | Error dari Google Drive API (jaringan, quota, dll) |
| `no_files` | Folder kosong atau tidak ada file Excel/Google Sheets |
| `format_invalid` | File ditemukan tapi nama tidak mengandung tanggal YYYYMMDD |
| `date_same` | Tanggal file sama dengan snapshot DB terakhir → dilewati |
| `imported` | Import berhasil |
| `import_error` | File berhasil dibaca tapi import gagal (error DB/parsing) |

### 5.3 Endpoint API

| Method | Path | Keterangan |
|--------|------|------------|
| `GET` | `/api/gdrive/read-logs?type=all&limit=20` | Ambil riwayat baca folder |
| `POST` | `/api/gdrive/check-now?type=all` | Cek semua folder sekarang (simpan log) |
| `GET` | `/api/gdrive/list?type=performance` | List file di folder (tanpa log) |
| `POST` | `/api/gdrive/sync?type=performance` | Sync/import file dari folder |

---

## 6. Scheduler Google Drive

### 6.1 Konfigurasi (app_settings)

| Field | Default | Keterangan |
|-------|---------|------------|
| `g_drive_sync_enabled` | false | Aktifkan/nonaktifkan jadwal otomatis |
| `g_drive_sync_hour_wib` | 7 | Jam pelaksanaan (WIB, 0-23) |
| `g_drive_sync_interval_days` | 1 | Interval antar run (hari) |
| `g_drive_last_check_at` | null | Terakhir kali sistem mengecek |

### 6.2 Alur Scheduler

```
startGDriveScheduler() dipanggil saat server start
  → scheduleNext(): ambil settings dari DB
    → Jika gDriveSyncEnabled = false → hentikan
    → Hitung waktu run berikutnya berdasarkan hourWib + intervalDays
    → setTimeout(tick, delayMs)
  → tick(): cek semua folder (performance/funnel/activity/target)
    → Untuk setiap tipe yang ada folder-nya:
      → listDriveFiles() → validasi → cek tanggal → import jika perlu
      → Simpan log ke drive_read_logs
    → scheduleNext() untuk iterasi berikutnya
```

### 6.3 Reschedule

`rescheduleGDrive()` dipanggil kapanpun settings berubah (dari `PATCH /api/settings`).

---

## 7. Cleaning Pipeline per Tipe Data

### 7.1 Performansi AM
- Format RAW: satu baris per pelanggan per bulan (`PERIODE`, `NAMA_AM`, `TARGET_REVENUE`, `REAL_REVENUE`)
- Diagregasi per NIK + PERIODE → satu baris per AM per bulan
- Filter: `DIVISI_AM != "DGS"`
- Otomatis tambah AM baru ke tabel `account_managers` jika NIK belum ada

### 7.2 Sales Funnel
- Filter: `witel = "SURAMADU"`, `divisi = "DPS"` atau `"DSS"`
- Validasi NIK: hanya AM yang terdaftar di `account_managers`
- Aturan khusus: NIK 850099 (Reni) → NIK 870022 (Havea) untuk data 2026+
- Dedup per `lopid`: jika lopid sudah ada dengan snapshotDate sama → skip (`onConflictDoNothing`)
- Otomatis populate tabel `master_customer`

### 7.3 Sales Activity
- Filter: `witel = "SURAMADU"`, `divisi = "DPS"` atau `"DSS"`
- Dedup via unique constraint: `(nik, createdat_activity)` → `onConflictDoNothing`
- Mode Drive tanpa fileId → import SEMUA file di folder (mengikuti Power BI Folder Connector)

---

## 8. Format File yang Didukung

| Format | Extension | MIME Type | Keterangan |
|--------|-----------|-----------|------------|
| Excel 2007+ | `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Direkomendasikan |
| Excel Legacy | `.xls` | `application/vnd.ms-excel` | Didukung |
| Google Sheets | (native) | `application/vnd.google-apps.spreadsheet` | Di Drive: dikonversi via Sheets API |

---

## 9. Seeder Default

File: `scripts/src/seed-settings.ts`  
Command: `pnpm --filter @workspace/scripts run seed-settings`

Seeder ini mengisi nilai default untuk:
- Google Drive folder URL (semua 4 tipe)
- API Key (jika disediakan via env)

---

## 10. Dependensi

- **Google API Key**: Satu kunci untuk akses Google Sheets API v4 + Google Drive API v3
- **Folder harus publik**: Folder Drive harus diatur "Anyone with the link can view"
- **Tidak diperlukan OAuth**: Sistem menggunakan API Key publik (tidak ada login Google)
