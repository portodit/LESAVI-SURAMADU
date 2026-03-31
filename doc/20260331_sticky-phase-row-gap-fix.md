# Fix: Sticky Phase Row Gap — useLayoutEffect Re-measure amRowH

**Tanggal:** 2026-03-31
**Commit:** 8781cfdf569dba8d0104da573292429aa7b943c0

## Problem
Ketika tombol "Expand Semua" diklik pada FunnelPage, sticky header baris "DAFTAR PROYEK FO/F1/..." tidak menempel rapat di bawah sticky AM name row. Terdapat celah (gap) di antara keduanya, sehingga baris proyek tampak menyembul dari bawah saat di-scroll.

## Root Cause
`useEffect(() => {...}, [])` untuk mengukur `funnelAmRowH` hanya berjalan **sekali saat mount**. Saat mount, tidak ada AM yang expanded sehingga `funnelAmRowRef.current === null` dan ResizeObserver tidak pernah terpasang. Nilai `funnelAmRowH` tetap di default `46` dan tidak pernah diperbarui. Phase row sticky `top = funnelTheadH + 46` sedangkan tinggi aktual AM row bisa berbeda, menghasilkan gap.

## Fix (FunnelPage.tsx)
1. Tambah `useLayoutEffect` (sync, sebelum paint) dengan `[expandedAm]` sebagai dependency → langsung membaca `funnelAmRowRef.current.offsetHeight` setiap kali ada expand/collapse, memastikan offset selalu tepat.
2. Tambah `[expandedAm]` sebagai dependency pada `useEffect` ResizeObserver yang sudah ada → ResizeObserver di-refresh dan terpasang ke elemen AM row yang benar setelah setiap render.
3. Tambah `useLayoutEffect` ke import React.

## File Diubah
- `apps/dashboard/src/features/funnel/FunnelPage.tsx`
