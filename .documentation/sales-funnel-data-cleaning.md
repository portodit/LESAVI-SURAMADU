# Sales Funnel Data Cleaning — Dokumentasi Teknis

> Terakhir diperbarui: Maret 2026  
> Konteks: Dashboard Performa AM Telkom TR3/Suramadu  
> File utama: `artifacts/api-server/src/features/import/excel.ts` → `cleanFunnelRows()`

---

## Tujuan

Fungsi `cleanFunnelRows()` mereplikasi logika **Power Query di Power BI** yang digunakan tim TR3/Suramadu untuk menentukan LOP mana yang valid dan harus ditampilkan di dashboard. Hasilnya harus tepat **250 LOP aktif** untuk snapshot Maret 2026.

---

## Pipeline 7 Langkah

### Step 1 — Filter Witel = SURAMADU

```typescript
if (!opts?.skipWitelFilter && !witel.includes("SURAMADU")) continue;
```

- Kolom sumber: `r.witel`
- Hanya LOP dengan witel yang mengandung string `"SURAMADU"` yang lolos
- `skipWitelFilter: true` dipakai jika ada AM yang menangani proyek di witel lain (edge case)

---

### Step 2 — Filter Divisi = DPS atau DSS

```typescript
if (!opts?.skipDivisiFilter && divisi !== "DPS" && divisi !== "DSS") continue;
```

- Kolom sumber: `r.divisi`
- Hanya `DPS` atau `DSS` yang lolos — nilai lain seperti `RSMES`, `GOVERMENT`, dll dibuang
- **Penting**: Di file GSheets nationwide, kolom `divisi` adalah segmen bisnis (bukan divisi AM). Filter ini tetap berlaku karena DPS/DSS adalah segmen yang benar untuk Suramadu

---

### Step 3 — Ekstraksi NIK AM

Ini adalah langkah **paling kritis** dan sumber bug paling sering.

#### Tiga mode operasi:

| Mode | Opsi | Kolom yang dipakai | Kapan dipakai |
|---|---|---|---|
| `pembuatOnly` | `pembuatOnly: true` | `nik_pembuat_lop` SAJA | GSheets nationwide (kolom sudah lengkap) |
| `preferPembuat` | `preferPembuat: true` | `nik_pembuat_lop` → fallback `nik_handling[0]` | **Drive/Excel TREG3** (rekomendasi) |
| Default | (tanpa opsi) | `nik_handling[0]` → fallback `nik_pembuat_lop` | Tidak dipakai di produksi |

#### Kenapa ada dua mode?

File Excel TREG3 lokal (e.g. `TREG3_SALES_FUNNEL_20260326.xlsx`) terkadang memiliki kolom `nik_pembuat_lop` yang **kosong** untuk sejumlah LOP, meskipun LOP tersebut valid dan ada `nik_handling`-nya. Jika pakai `pembuatOnly`, LOP ini ter-skip → hasilnya **237 LOP, bukan 250**.

File GSheets nationwide selalu memiliki `nik_pembuat_lop` lengkap → aman pakai `pembuatOnly`.

**Aturan:**
- `gsheets/sync.ts` → `pembuatOnly: true`
- `gdrive/routes.ts` (Drive sync) → `preferPembuat: true`
- `import/routes.ts` (manual upload) → `preferPembuat: true`

---

### Step 4 — Mapping Reni → Havea

```typescript
if (nikAm === "850099" && (!opts?.pembuatOnly || reportYearForNik >= 2026)) nikAm = "870022";
```

- NIK **850099** = RENI WULANSARI (AM lama, sudah tidak aktif)
- NIK **870022** = HAVEA PERTIWI (AM pengganti)
- Berlaku untuk `report_date.Year >= 2026` (sesuai logika Power BI)
- Mapping nama juga diterapkan: `"RENI WULANSARI"` → `"HAVEA PERTIWI"` di kolom `nama_pembuat_lop`

---

### Step 5 — Validasi NIK

```typescript
if (nikAm.length < 4 || Number(nikAm) > 9999999) continue;
```

NIK yang terlalu pendek (< 4 digit) atau terlalu besar (> 7 digit) dianggap data sampah dan dibuang.

---

### Step 6 — Filter `is_report` (DINONAKTIFKAN)

```typescript
if (!opts?.skipIsReportFilter) { ... }
```

- Power BI **tidak** memfilter berdasarkan `is_report`
- **Selalu pakai `skipIsReportFilter: true`** di semua call site produksi
- Jangan pernah menggunakan filter `is_report` untuk dashboard Suramadu

---

### Step 7 — Deduplikasi per `lopid`

```typescript
if (!existing || row.reportDate > existing.reportDate) {
  deduped.set(row.lopid, row);
}
```

- Satu `lopid` bisa muncul berkali-kali di file (multiple monthly snapshots)
- Hanya baris dengan `report_date` **paling baru** yang dipertahankan
- Perbandingan string ISO date (`YYYY-MM-DD`) → lexicographic sort bekerja benar
- Baris dengan `reportDate = null` kalah dari baris dengan tanggal apapun

---

## Opsi Lengkap `cleanFunnelRows()`

```typescript
cleanFunnelRows(rows, {
  skipWitelFilter?: boolean;      // default false — include all witel
  skipDivisiFilter?: boolean;     // default false — include all divisi
  pembuatOnly?: boolean;          // HANYA nik_pembuat_lop (GSheets path)
  preferPembuat?: boolean;        // nik_pembuat_lop first, nik_handling[0] fallback (Excel/Drive path)
  skipIsReportFilter?: boolean;   // WAJIB true untuk produksi
  strictIsReport?: boolean;       // reject jika is_report null/kosong (jangan dipakai)
})
```

### Konfigurasi wajib per jalur import:

```typescript
// GSheets nationwide (gsheets/sync.ts)
cleanFunnelRows(rows, {
  pembuatOnly: true,
  skipIsReportFilter: true,
})

// Drive sync / Manual Excel TREG3 (gdrive/routes.ts, import/routes.ts)
cleanFunnelRows(rows, {
  preferPembuat: true,
  skipIsReportFilter: true,
})
```

---

## Ekstraksi Tanggal dari Nama File

### Fungsi: `extractSnapshotDateFromUrl(filename)`

Regex: `/[_-](\d{8})(?:[._?&\s]|$)/`

- Match `YYYYMMDD` yang diawali `_` atau `-`
- Karakter setelah tanggal: `.`, `_`, `?`, `&`, spasi, **atau end-of-string**
- `$` di alternasi adalah kunci — file Google Sheets native **tidak punya ekstensi**

#### Contoh:

| Nama File | Hasil |
|---|---|
| `TREG3_SALES_FUNNEL_20260326.xlsx` | `2026-03-26` ✅ |
| `TREG3_SALES_FUNNEL_20260326` (tanpa ext) | `2026-03-26` ✅ |
| `TREG3_SALES_FUNNEL_20260313` | `2026-03-13` ✅ |
| `Report Funnel` (tanpa tanggal) | `null` → fallback ke tanggal hari ini ⚠️ |

---

## Hasil yang Benar (Benchmark)

| Snapshot | Total LOP | Metode verifikasi |
|---|---|---|
| Maret 2026 | **250 LOP** | Kunci jawaban CSV + Power BI cross-check |

### Distribusi per AM (Maret 2026, acuan):

Diperoleh dari file kunci jawaban yang diberikan user. Pastikan total = 250 setelah import.

---

## Checklist Debugging jika Jumlah LOP Salah

1. **Kurang dari 250** → Kemungkinan `pembuatOnly` dipakai di path Excel → ganti ke `preferPembuat`
2. **Lebih dari 250** → Kemungkinan `skipIsReportFilter: false` + ada LOP duplikat → pastikan `skipIsReportFilter: true`
3. **Tanggal snapshot salah** → Nama file tidak mengandung `YYYYMMDD` dalam format yang dikenali → rename file atau set tanggal manual
4. **AM salah** → Cek mapping Reni→Havea, pastikan NIK 850099 dipetakan ke 870022 untuk tahun 2026
5. **0 LOP** → Kolom `witel` atau `divisi` di file berbeda dengan yang diexpektasi (e.g. uppercase/lowercase berbeda) — debug dengan log `r.witel` dan `r.divisi`

---

## Catatan Penting Lainnya

- **Kolom `nik_handling`** bisa berisi beberapa NIK dipisahkan koma (e.g. `"870001,870022"`). Hanya NIK **pertama** yang dipakai: `.split(",")[0].trim()`
- **`nilai_proyek`** diparse dengan `parseFloat(String(r.nilai_proyek ?? 0))` — format angka harus numerik atau string angka polos (bukan format Rupiah)
- **`report_date`** diparse oleh `parseDate()` yang menangani format Excel date serial, string ISO, dan string Indonesia
- **Simpan semua tahun** — filter tahun/bulan dilakukan di sisi tampilan (frontend), bukan di import. DB menyimpan semua LOP dari semua tahun
