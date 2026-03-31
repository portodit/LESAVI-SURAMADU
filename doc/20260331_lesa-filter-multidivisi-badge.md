# Fitur: Filter LESA Multi-Divisi + Badge Divisi Berwarna

**Tanggal**: 31 Maret 2026  
**Jenis**: Enhancement — Frontend UX

## Latar Belakang

Filter divisi LESA = gabungan DPS + DSS. Ada 9 AM yang menangani corporate customer dari 2 divisi sekaligus. Tampilan sebelumnya tidak membedakan divisi customer saat filter LESA, dan badge divisi di nama AM hanya teks abu-abu.

## Perubahan

### 1. Tag Customer dengan Divisi
Setiap customer yang dikumpulkan dari `komponen_detail` kini diberi field `_divisi` sesuai divisi row sumbernya. Berlaku di PerformaPage (YTD customers) dan PresentationPage (CM customers).

### 2. Badge Divisi Berwarna di Nama AM
- **Sebelum**: teks abu-abu muted `text-muted-foreground`
- **Sesudah**: badge berwarna sesuai standar visual LESAVI:
  - DPS → `bg-blue-100 text-blue-700` (biru)
  - DSS → `bg-emerald-100 text-emerald-700` (hijau)
  - AM multi-divisi → **dua badge** ditampilkan bersamaan

### 3. Kolom Divisi di Expanded Customer Table (khusus filter LESA)
Ketika filter divisi = LESA, tabel corporate customer saat di-expand menampilkan kolom **Divisi** tambahan (setelah Pelanggan/NIP) yang menunjukkan badge DPS/DSS per baris customer.

**File yang diubah**:
- `apps/dashboard/src/features/performance/PerformaPage.tsx`
- `apps/dashboard/src/features/performance/PresentationPage.tsx`
