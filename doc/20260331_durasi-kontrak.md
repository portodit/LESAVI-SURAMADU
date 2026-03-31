# Durasi Kontrak (month_subs)

**Tanggal:** 2026-03-31  
**Commit:** d515ee6b642e189a6b8af4b63708352c253cb7a3

## Ringkasan
Menambahkan fitur Durasi Kontrak (`month_subs`) ke FunnelSlide (/presentation) dan FunnelPage (/funnel dashboard).

## Perubahan

### Schema & Database
- `lib/db/src/schema/salesFunnel.ts` → tambah `monthSubs: integer("month_subs")`
- `drizzle-kit push` berhasil — kolom `month_subs` sudah ada di tabel `sales_funnel`

### Import Excel
- `excel.ts` → tambah `monthSubs: number | null` ke interface `CleanedFunnelRow`, baca `r.month_subs` dari baris Excel
- `routes.ts` → tambah `monthSubs` ke PowerBI CSV importer (baca kolom "Month Subs" atau "month_subs")

### API
- `publicRoutes.ts` → tambah `durasi_filter` query param (`single_year` ≤12 bulan, `multi_year` >12 bulan); sertakan `monthSubs` di response `.lops[]`

### FunnelPage.tsx (dashboard)
- Tambah `monthSubs: number | null` ke `LopRow` interface
- Tambah `filterDurasi` state (`"all" | "single_year" | "multi_year"`)
- Tambah helper `formatDurasi(m)` → e.g. 25 bulan = "2 thn 1 bln"
- Filter aktif di `filteredLops` useMemo
- Tambah dropdown `SelectDropdown` Durasi Kontrak di toolbar filter
- Tambah chip aktif teal di filter-aktif bar (termasuk reset button)
- Tambah kolom **DURASI** di kedua thead (main + split-mode)
- Tambah `<td>` durasi di setiap baris LOP detail (teal text)
- Update semua `colSpan` dari 5→6, 4→5, 3→4

### PresentationPage.tsx (FunnelSlide)
- Sama persis seperti FunnelPage — filterDurasi, fsDurasi(), dropdown, chip, thead, td, colSpans

## Format Tampilan
```
25 bulan → "2 thn 1 bln"
24 bulan → "2 tahun"
6 bulan  → "6 bulan"
null     → "–"
```

## Filter
- **Single Year**: `monthSubs` ≤ 12 (atau null dikecualikan)
- **Multi Year**: `monthSubs` > 12 (atau null dikecualikan)
