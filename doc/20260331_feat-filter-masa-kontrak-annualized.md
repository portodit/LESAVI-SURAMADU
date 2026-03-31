# Feat: Filter Masa Kontrak — Pindah ke Toolbar AM + Logika Annualized

**Tanggal**: 2026-03-31  
**Commit**: [9ae5134](https://github.com/portodit/LESAVI-SURAMADU/commit/9ae51340dfa36de763a9f373bc03ff425a0ad69d)

## Permintaan

1. Filter "Masa Kontrak" di slide Sales Funnel dipindahkan dari top-bar ke **sebelah kanan filter Semua AM**
2. Logika "Single Year" diubah dari *filter* menjadi *normalisasi annual*:
   - Sebelumnya: hanya tampilkan LOP dengan masa kontrak ≤ 12 bulan
   - Sekarang: tampilkan semua LOP, namun nilai proyek **dibagi tahun** jika ≥ 12 bulan

## Perubahan (`PresentationPage.tsx`)

### 1. Hapus dari top toolbar
Baris `FSSelectDropdown label="Masa Kontrak"` dihapus dari section filter bar atas.

### 2. Tambah di toolbar "Detail Funnel per AM"
Ditambahkan `FSSelectDropdown` untuk Masa Kontrak tepat setelah dropdown `Semua AM`, sebelum input pencarian.

### 3. Logika baru `filteredLops` useMemo
```ts
// Hapus: filter single_year
// Tambah: mapping annualisasi setelah filter
if (filterDurasi !== "single_year") return base;
return base.map((l) => {
  const m = l.monthSubs;
  if (!m || m < 12) return l;            // < 1 tahun: tidak dibagi
  return { ...l, nilaiProyek: Math.round(l.nilaiProyek * 12 / m) };
});
```

### 4. Update label
- Dropdown: `"Nilai per Tahun"` (ganti dari `"Single Year (≤12 bln)"`)
- Filter chip: `"Durasi: Nilai per Tahun"`

## Contoh
| LOP | Nilai Asli | Masa Kontrak | Nilai (Nilai per Tahun) |
|---|---|---|---|
| ABC | Rp 235 jt | 1 thn | Rp 235 jt |
| DEF | Rp 480 jt | 4 thn | Rp 120 jt |
| GHI | Rp 100 jt | 9 bln | Rp 100 jt (< 1 thn, tidak dibagi) |
