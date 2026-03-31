# Brief: PerformaPage — Bug Fix, Responsive, & Sales Funnel Section

**Tanggal:** 30 Maret 2026  
**Commit:** `36772fb318e2970e2ada0fc7d3bb99b3bbb6fc8f`  
**File utama yang diubah:**
- `artifacts/telkom-am-dashboard/src/features/performance/PerformaPage.tsx`
- `artifacts/telkom-am-dashboard/src/features/performance/FunnelSectionCard.tsx` *(baru)*

---

## 1. Bug Fix — Nilai Customer Detail Rp 0

### Masalah
Tabel detail pelanggan di `/visualisasi/performa` (saat expand baris AM) menampilkan **Target: Rp 0** dan **Real: Rp 0** untuk semua pelanggan, serta **Proporsi: 0.0%**.

### Root Cause
Field `komponen_detail` di database menyimpan JSON dengan struktur per-kategori:
```json
{
  "pelanggan": "STYROCHEMINDO",
  "nip": "19031335",
  "Reguler": { "target": 226480, "real": 0 },
  "Sustain":  { "target": 0, "real": 0 },
  "Scaling":  { "target": 226480, "real": 0 },
  "NGTMA":    { "target": 0, "real": 0 }
}
```
Namun kode frontend mencari field `c.realTotal` dan `c.targetTotal` yang **tidak ada** dalam JSON ini, sehingga selalu bernilai `undefined ?? 0 = 0`.

### Solusi
Fungsi `parseKomponen` diperbarui untuk **menormalkan data** saat parsing:
```typescript
const KOMPONEN_CATS = ["Reguler", "Sustain", "Scaling", "NGTMA"] as const;
// Hitung otomatis jika field tidak ada:
c.realTotal   = KOMPONEN_CATS.reduce((s, k) => s + (c[k]?.real   ?? 0), 0);
c.targetTotal = KOMPONEN_CATS.reduce((s, k) => s + (c[k]?.target ?? 0), 0);
```
Kalkulasi `proporsi` juga diperbaiki dari `c.proporsi * 100` (selalu null) menjadi:
```typescript
const prop = totalReal > 0 ? (cReal / totalReal) * 100 : 0;
```

---

## 2. Responsive — iPad & Mobile

### Masalah
Loading skeleton menggunakan `grid grid-cols-3` tanpa breakpoint, sehingga pada layar kecil (<640px) tiga kolom terlalu sempit.

### Solusi
Diubah menjadi `grid grid-cols-1 sm:grid-cols-3` — tampil 1 kolom di mobile, 3 kolom di tablet ke atas.

Bagian lain sudah responsif sebelumnya:
- Trophy cards: `lg:grid-cols-3` ✓
- Filter bar: `flex-wrap` ✓
- Tabel performa: horizontal scroll + `min-width: 600px` ✓

---

## 3. Sales Funnel per AM — Komponen Baru

### Permintaan
Mengadaptasi tabel Sales Funnel dari halaman Presentation (`/presentation`) ke dalam halaman PerformaPage.

### Implementasi
Dibuat file baru `FunnelSectionCard.tsx` — komponen mandiri yang:

- **Fetch data** dari auth API `/api/funnel/snapshots` dan `/api/funnel` (bukan public API)
- **Collapsible** — diringkas menjadi 1 baris header, klik untuk expand
- **Filter**: Snapshot, Tahun, Bulan (multi-select), AM (multi-select), Status Funnel (multi-select), pencarian teks bebas
- **Summary chips**: ringkasan jumlah LOP per fase (F0–F5)
- **Tabel expandable**: AM → Fase → Detail Proyek (judul, kategori kontrak, LOP ID, pelanggan, nilai)
- **Lazy load**: data hanya di-fetch saat section dibuka (`enabled: sectionExpanded`)

Kolom tabel:

| Nama AM / Proyek | Kategori | LOP ID | Pelanggan | Nilai Proyek |
|---|---|---|---|---|

Warna fase mengikuti standar yang sama dengan FunnelPage dan PresentationPage (F0 biru muda → F5 hijau emerald).

`FunnelSectionCard` disisipkan di PerformaPage **antara tabel performa dan tren chart bulanan**.

---

## Ringkasan Perubahan

| # | Perubahan | File |
|---|---|---|
| 1 | Fix bug `realTotal`/`targetTotal` di `parseKomponen` | `PerformaPage.tsx` |
| 2 | Fix proporsi pelanggan: `cReal/totalReal*100` | `PerformaPage.tsx` |
| 3 | Responsive loading skeleton | `PerformaPage.tsx` |
| 4 | Buat `FunnelSectionCard` (komponen baru) | `FunnelSectionCard.tsx` |
| 5 | Integrasi `FunnelSectionCard` ke PerformaPage | `PerformaPage.tsx` |
