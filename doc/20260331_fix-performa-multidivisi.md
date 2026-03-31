# Fix: Logic Performa AM Multi-Divisi (DPS+DSS)

**Tanggal**: 31 Maret 2026  
**Jenis**: Bug Fix — Frontend Logic

## Latar Belakang

Saat parsing file PERFORMANSI_20260329_1774929955388.xlsx ditemukan bahwa:
- **9 AM** di Witel Suramadu punya data performa di **2 divisi sekaligus** (DPS dan DSS)
- Termasuk: NYARI KUSUMANINGRUM, ERVINA HANDAYANI, HANDIKA DAGNA NEVANDA, HAVEA PERTIWI, MOH RIZAL BIN MOH. FERRY Y.P. DARA, NI MADE NOVI WIRANA, SAFIRINA FEBRYANTI, VIVIN VIOLITA, WILDAN ARIEF
- NYARI contohnya: DPS punya 22 customers (target 462M), DSS punya 1 customer PAL (target 44M)

Ini bukan error data — memang kondisi bisnis yang valid.

## Bug yang Ditemukan

Di `PerformaPage.tsx` dan `PresentationPage.tsx`, logika aggregasi AM:

1. **`cmRow` di-overwrite**: untuk AM dengan 2 divisi per bulan, hanya row terakhir yang tersimpan sebagai `cmRow` — baris sebelumnya dibuang. Akibatnya CM target/real hanya dari **satu divisi** (bukan gabungan).

2. **Contoh dampak** (NYARI Jan 2026):
   - Seharusnya: CM target = 506M (462M DPS + 44M DSS), CM ach = 84.4%
   - Yang terjadi: CM target = 44M (DSS saja), CM ach = 114.3% ← **salah**

3. **Divisi filter salah**: AM multi-divisi bisa "hilang" saat filter DPS jika `cmRow` jatuh ke DSS.

4. **Deduplication key** `nik__bulan` tidak include divisi, sehingga upload ulang parsial per-divisi bisa salah.

## Fix yang Dilakukan

**File**: `apps/dashboard/src/features/performance/PerformaPage.tsx`  
**File**: `apps/dashboard/src/features/performance/PresentationPage.tsx`

### Perubahan:
1. **Deduplication key** diubah dari `nik__bulan` → `nik__bulan__divisi`
2. **`cmRow` → `cmRows[]`**: collect semua divisi rows untuk bulan CM, bukan overwrite
3. **Combine CM target/real**: dijumlahkan dari semua divisi rows
4. **Primary divisi**: divisi dengan CM target terbesar dipilih sebagai representatif
5. **Divisi filter**: dicek terhadap `divisiAll[]` — AM muncul jika salah satu divisnya cocok

## Dampak Fix

- 9 AM multi-divisi kini punya angka CM yang benar (gabungan DPS+DSS)
- Filter divisi LESA menampilkan semua AM yang punya data di DPS atau DSS
- YTD sudah benar sebelumnya (tidak terpengaruh bug)
