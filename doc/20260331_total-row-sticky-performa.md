# Feat: Total Row Performance Slide Selalu Terlihat

**Tanggal:** 2026-03-31
**Commit:** 1de79439f1fca0a1b17f0832d88cbb27f1479c7a

## Problem
Baris "Total (N AM)" di tabel Performance Slide (`/presentation`) berada di dalam scroll container, sehingga hanya terlihat saat user scroll ke paling bawah tabel.

## Solusi
Pindahkan baris Total ke LUAR scroll container `perfTableRef`, menjadi sibling di bawahnya — persis pola yang sama dengan header tabel di atas yang sudah di luar scroll container. Struktur menjadi:
```
<div outer wrapper>
  <div> header tabel (tetap visible di atas) </div>
  <div ref=perfTableRef overflow-auto> data AM rows </div>  ← scroll
  <div> baris Total (tetap visible di bawah) </div>         ← always visible
</div>
```
Total row tetap menggunakan `PERF_TB` style dan `PerfColGroup` yang sama sehingga lebar kolom tetap sejajar.

## File Diubah
- `apps/dashboard/src/features/performance/PresentationPage.tsx`
