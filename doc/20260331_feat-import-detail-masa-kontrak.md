# Feat: Kolom Masa Kontrak & Kategori Kontrak di Halaman Detail Import

**Tanggal**: 2026-03-31  
**Commit**: [3421dde](https://github.com/portodit/LESAVI-SURAMADU/commit/3421ddeaa19a1f96450c12e0e65202f82d5b5c50)

## Konteks

User import ulang snapshot Sales Funnel → Import ID #12 (4350 baris, 3167 dengan `month_subs` terisi). Data di DB sudah benar, namun halaman detail import (`/import/detail/:id`) tidak menampilkan kolom **Masa Kontrak** maupun **Kategori Kontrak**.

## Perubahan

Pada komponen `FunnelTable` di `ImportDetailPage.tsx`:

1. **Tambah helper** `formatDurasi(m)` — konversi bulan ke format `1 thn`, `12 bln`, `2thn 3bln`, dll
2. **Tambah kolom header**:
   - `Kategori Kontrak` — setelah Nilai Proyek
   - `Masa Kontrak` — setelah Kategori Kontrak (teal bold)
3. **Tambah cell**:
   - `{r.kategoriKontrak || "–"}`
   - `{formatDurasi(r.monthSubs)}` — muncul teal jika ada nilai

## Catatan Data

Import #12 (31 Maret 2026 pukul 12:54 WIB) sudah menggunakan code yang telah diperbaiki:
- Total baris: 4350
- Dengan `month_subs`: **3167 baris** (non-null)
- Null (memang kosong di source Excel): 1183 baris
