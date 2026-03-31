# Fix: Header Tabel AM Performance Naik ke Atas saat Scroll

**Tanggal:** 2026-03-31
**Commit:** 7b6f3a5

## Masalah
Di PerformanceSlide (`/presentation` slide ke-4), header merah tabel "AM Performance Report" (NAMA AM, TARGET REGULER, dst) melayang naik ke atas melewati toolbar "AM Performance Report" ketika halaman di-scroll dari luar scroll container.

## Akar Masalah
Struktur lama:
```
<div class="overflow-auto" maxHeight="calc(100svh - 220px)">   ← scroll container
  <table position="sticky" top:0>   ← global header — SALAH POSISI
    ...
  </table>
  <data tables />
</div>
```

`position: sticky; top: 0` di dalam `overflow-auto` harusnya stick ke atas scroll container. Tapi **ketika data sedikit** (kurang dari `maxHeight`), `overflow: auto` tidak mengaktifkan scroll — container bukan scroll ancestor yang aktif. Akibatnya, sticky dievaluasi terhadap **page scroll**, sehingga header naik ke `top: 0` halaman (di atas toolbar section).

## Fix
Pindahkan global header table ke **luar** scroll container:

```
<div class="border rounded overflow-hidden">
  <div class="overflow-x-auto">           ← header: hanya horizontal scroll
    <table>  ...header merah...  </table>  ← TIDAK sticky, selalu di posisinya
  </div>
  <div class="overflow-auto" maxHeight="calc(100svh - 280px)">  ← data scroll
    <AM tables, sticky top:0 />             ← sticky relatif ke div ini
    <customer thead sticky top:perfPresentAmRowH />
  </div>
</div>
```

Nilai `top` sticky dikoreksi:
- AM sticky row: `top: perfPresentTableHeaderH` → `top: 0`
- Customer header: `top: perfPresentTableHeaderH + perfPresentAmRowH` → `top: perfPresentAmRowH`

## File Diubah
- `artifacts/telkom-am-dashboard/src/features/performance/PresentationPage.tsx`
