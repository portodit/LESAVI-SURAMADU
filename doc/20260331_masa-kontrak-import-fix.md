# Fix: Import Baca rencana_durasi_kontrak + Rename Masa Kontrak

**Tanggal:** 2026-03-31
**Commit:** c52eb5890405cb3e8acf927506d3baebb3d16f84

## Problem
1. Kolom "DURASI" di tabel funnel selalu menampilkan "–" karena import handler hanya membaca kolom `Month Subs` dan `month_subs` dari Excel, sedangkan file Excel yang digunakan menyimpan data di kolom `rencana_durasi_kontrak`.
2. Nama "Durasi Kontrak" perlu diganti menjadi "Masa Kontrak".

## Fix

### 1. Import Handler (routes.ts)
Tambahkan `rencana_durasi_kontrak` sebagai fallback ketiga untuk membaca `monthSubs`:
```
Month Subs → month_subs → rencana_durasi_kontrak
```
Nilai di-`parseInt` menjadi integer (jumlah bulan).

### 2. Rename Label UI
- Filter dropdown: `"Durasi Kontrak"` → `"Masa Kontrak"` (FunnelPage + FunnelSlide)
- Header kolom tabel: `DURASI` → `MASA KONTRAK` (4 lokasi: 2 di FunnelPage, 2 di PresentationPage FunnelSlide)

## File Diubah
- `apps/api/src/features/import/routes.ts`
- `apps/dashboard/src/features/funnel/FunnelPage.tsx`
- `apps/dashboard/src/features/performance/PresentationPage.tsx`
