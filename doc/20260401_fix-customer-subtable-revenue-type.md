# Fix: Customer Sub-tabel Ikut Filter Revenue Type

**Tanggal**: 2026-04-01

## Problem

Di halaman Performa, saat expand AM row untuk melihat detail per customer:
- AM row: menampilkan **hanya REGULER** (ketika filter "Reguler" aktif)
- Customer sub-row: **selalu** menampilkan `targetTotal` (jumlah Reguler+Sustain+Scaling+NGTMA)

Ini menyebabkan angka tidak konsisten — customer tampak jauh lebih besar dari AM karena menjumlahkan semua tipe revenue.

## Fix

`PerformaPage.tsx` — customer expanded row sekarang ikut `filterTipeRevenue`:
- Reguler → tampilkan `c.Reguler.target` / `c.Reguler.real`
- Sustain → tampilkan `c.Sustain.target` / `c.Sustain.real`
- Scaling → tampilkan `c.Scaling.target` / `c.Scaling.real`
- NGTMA → tampilkan `c.NGTMA.target` / `c.NGTMA.real`
- Semua → tampilkan `c.targetTotal` / `c.realTotal`

Header kolom juga diupdate: "Target Reguler" / "Real Reguler" (ikut tipe yang dipilih).

Nilai full exact (tanpa singkatan) tersedia via tooltip (hover) di sel Target dan Real.

## File Diubah

- `artifacts/telkom-am-dashboard/src/features/performance/PerformaPage.tsx`
