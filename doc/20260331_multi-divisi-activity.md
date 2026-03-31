# Multi-Divisi Activity — Filter Pintar & Badge Divisi

**Tanggal:** 2026-03-31

## Problem
Sales Activity (`/visualisasi/activity` dan `/presentation` slide 3) menyaring AM
berdasarkan kolom `divisi` di tabel `account_managers` (master divisi), bukan dari
divisi aktivitas yang sebenarnya tercatat. Akibatnya:
- AM dengan aktivitas lintas divisi (DPS *dan* DSS) bisa hilang dari list saat filter aktif
- Badge divisi hanya menampilkan satu label dari master, meskipun AM tersebut
  punya kegiatan di dua divisi

## Perubahan

### `ActivityPage.tsx` (`/visualisasi/activity`)
- Default filter divisi: `DEFAULT_DIVISI` ("all") → `"LESA"`
- Opsi filter: `DIVISI_OPTIONS_WITH_ALL` → `DIVISI_OPTIONS` (tidak ada "Semua Divisi")
- `filteredAms`: AM ditampilkan jika **ada di `byAmMap`** (punya aktivitas yang sesuai
  filter API) **ATAU** master divisinya match → multi-divisi AM tidak lagi hilang
- Per-AM activity list: difilter lagi per aktivitas berdasarkan divisi aktif (sehingga
  baris aktivitas divisi lain tersembunyi saat filter DPS/DSS aktif)
- `activityDivisis[]`: field baru per AM — kumpulan divisi unik dari aktivitas yang
  tampil. Dirender sebagai badge berwarna (DPS=biru, DSS=teal) di header AM
- Chip reset divisi → `"LESA"` (bukan `"all"`)
- `isDivisiFiltered`: `divisi !== "LESA"` (bukan `!== "all"`)

### `PresentationPage.tsx` ActivitySlide (slide 3)
- Perubahan identik dengan `ActivityPage.tsx` untuk state `filterDivisi`
- `divisiOptions = DIVISI_OPTIONS` (tanpa "Semua Divisi")
- `amList` filter: AM muncul jika ada di byAmMap ATAU master divisi match
- `activityDivisis[]` dihitung per AM, badge DPS/DSS dirender di AM header
- Chip & reset → `"LESA"` sebagai default
