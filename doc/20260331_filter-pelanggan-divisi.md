# Feat: Filter Pelanggan Per Divisi DPS/DSS + Hapus Opsi Semua Divisi

**Tanggal:** 2026-03-31
**Commit:** 4c7cef91e2706145eef7f1f78d71e630a4caf65b

## Perubahan

### 1. Hapus opsi "Semua Divisi" dari dropdown filter
- Import ganti dari `DIVISI_OPTIONS_WITH_ALL` → `DIVISI_OPTIONS` (LESA, GOVT, DPS, DSS)
- Default `filterDivisi` berubah dari `"all"` → `"LESA"`
- `isDivisiFiltered` kini `filterDivisi !== "LESA"` (LESA = baseline normal)
- Tombol reset filter dan "Reset Semua" kembali ke `"LESA"` bukan `"all"`

### 2. Filter list pelanggan saat DPS/DSS aktif
- Tambah `visibleCustomers`: ketika filter DPS aktif → hanya tampilkan pelanggan dengan `_divisi === "DPS"`; DSS → hanya DSS; LESA → tampilkan semua pelanggan
- `visibleCustomers` menggantikan `customers` di:
  - Kolom COUNT pada baris AM
  - Tooltip hover "Total Pelanggan"
  - `hasCustomers` (expanded row hanya muncul jika ada visible customers)
  - `totalReal` (proporsi dihitung dari visible customers saja)
  - Render list pelanggan di expanded row

## File Diubah
- `apps/dashboard/src/features/performance/PerformaPage.tsx`
