# Fix: Gap Sticky saat "Expand Semua AM" di FunnelSlide

**Tanggal:** 2026-03-31
**Commit:** 2f53a71

## Masalah
Saat menekan tombol **Expand Semua AM** di FunnelSlide (`/presentation` slide ke-2), kemudian di-scroll, muncul sela/gap kosong antara sticky AM name row dengan phase header di bawahnya. Expand satu per satu tidak terdampak.

## Akar Masalah
`renderAmTablesFS` menggunakan pola multi-table:
- Setiap AM punya satu `<table>` sticky untuk nama AM (`top: fsFunnelTheadH, z-index: 16`)
- Setiap fase punya `<thead>` sticky di bawahnya (`top: fsFunnelTheadH + fsFunnelAmRowH, z-index: 15`)

Ketika **hanya 1 AM** yang expanded, sticky bekerja sempurna — hanya satu set sticky element dalam scroll container.

Ketika **banyak AM** di-expand sekaligus, phase header dari AM berbeda semuanya mencoba sticky di `top: fsFunnelTheadH + fsFunnelAmRowH`. Selama scroll, phase header dari AM sebelumnya masih "bersaing" dengan AM header yang sekarang terlihat, sehingga menciptakan gap visual antara AM row dan konten fase di bawahnya.

## Fix
Tambahkan variabel `multiExpanded` di dalam `renderAmTablesFS`:
```ts
const multiExpanded = Object.values(expandedAm).filter(Boolean).length > 1;
```
Phase header `<thead>` hanya diberi `position: sticky` ketika **tepat satu AM yang expanded** (`!multiExpanded`). Ketika banyak AM terbuka, phase header scroll normal (tidak sticky), sehingga tidak ada konflik posisi.

## File Diubah
- `artifacts/telkom-am-dashboard/src/features/performance/PresentationPage.tsx`
