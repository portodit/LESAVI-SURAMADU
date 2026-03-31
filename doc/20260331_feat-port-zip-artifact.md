# Feat: Port Perubahan dari Artifact ZIP

**Tanggal**: 2026-03-31  
**Commit**: [35f9e11](https://github.com/portodit/LESAVI-SURAMADU/commit/35f9e112cebafac5e094f14e4acfd9cda0699d09)

## Konteks

User mengirimkan ZIP snapshot proyek yang berisi perbaikan/fitur yang pernah dibuat di environment lain. Dilakukan diff antara file ZIP vs file lokal untuk mengidentifikasi perbedaan, lalu mengimplementasikan semua perubahan yang belum ada.

## Perubahan yang Diimplementasikan

### 1. `KOMPONEN_TYPES` + `customerTotal()` helper
Ditambahkan di level modul PresentationPage.tsx:
- `customerTotal(c)` — menghitung target+real dari customer dengan fallback ke `komponenDetail` jika `targetTotal`/`realTotal` null

### 2. `sumKomponen("Semua")` menggunakan `customerTotal()`
Sebelumnya langsung sum `targetTotal`/`realTotal`. Sekarang menggunakan `customerTotal()` yang lebih akurat.

### 3. Gauge display `displayPct` (nilai bisa >100%)
`FSGauge` kini menampilkan `displayPct = Math.max(pct, 0)` (tidak di-cap 100%) untuk teks persentase. Arc visual tetap menggunakan `clamp` (0–100%).

### 4. Annualize berlaku untuk BOTH `single_year` + `multi_year`
Sebelumnya hanya `single_year` yang melakukan annualisasi. Sekarang kedua mode (single_year & multi_year) menormalisasi nilai per tahun. Filter `multi_year` tetap menyaring LOP > 12 bulan, lalu keduanya diannualize.

### 5. Header kolom "KONTRAK" (bukan "MASA KONTRAK")
Diperpendek di semua tabel funnel (PresentationPage + FunnelPage), di 2 tempat masing-masing.

### 6. `setFilterDivisi("LESA")` saat load snapshot baru
Ketika user memilih snapshot berbeda di EmbedPerforma, filter divisi direset ke `"LESA"` (bukan `"all"`).

### 7. Customer sub-table menggunakan `filterTipeRevenue`
Baris customer di sub-tabel now menggunakan `filterTipeRevenue` untuk menampilkan nilai yang sesuai:
- Jika `filterTipeRevenue === "Semua"` → gunakan `customerTotal(c)` 
- Selain itu → gunakan `c[filterTipeRevenue]?.target/real`

### FunnelPage.tsx
Annualize logic dan header "KONTRAK" juga diaplikasikan ke halaman `/visualisasi/funnel`.
