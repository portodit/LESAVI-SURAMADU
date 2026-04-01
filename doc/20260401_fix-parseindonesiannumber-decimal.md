# Fix: parseIndonesianNumber Hapus Desimal

**Tanggal**: 2026-04-01  
**Commit**: (lihat git log)

## Problem

`parseIndonesianNumber` di `excel.ts` menghapus SEMUA titik, termasuk titik desimal.  
XLSX dengan `raw: false` mengembalikan string seperti `"100422526.1"` (titik = desimal),  
tapi fungsi lama melakukan `.replace(/\./g, "")` → `"1004225261"` → 10× terlalu besar.

### Contoh bug:
| Input (dari xlsx) | Bug lama | Seharusnya |
|---|---|---|
| `"100422526.1"` | `1004225261` (×10) | `100422526.1` |
| `"42676478.67"` | `4267647867` (×100) | `42676478.67` |
| `"5124030.691"` | `5124030691` (×1000) | `5124030.691` |

## Root Cause

Fungsi lama: `String(val).replace(/,/g, "").replace(/\./g, "")`  
Ini menghapus SEMUA koma dan titik tanpa memperhatikan apakah titik adalah desimal atau ribuan.

## Fix

Logika baru yang cerdas:
- Jika ada titik DAN koma: deteksi format dari urutan terakhir  
  - Koma terakhir setelah titik → Indonesian (`1.234.567,89`) → hapus titik, koma→titik  
  - Titik terakhir setelah koma → US/standard (`1,234,567.89`) → hapus koma  
- Jika hanya koma: deteksi apakah desimal atau ribuan  
- Jika hanya titik / tanpa separator: biarkan apa adanya (titik = desimal)  
- Jika tipe `number`: kembalikan langsung tanpa parsing string

## File Diubah

- `artifacts/api-server/src/features/import/excel.ts` — fungsi `parseIndonesianNumber`

## Data Fix

Import 48 (Februari 2026, data salah) sudah dihapus dari DB.  
User perlu re-import file `REV_FEBRUARI_...xlsx` dari halaman Admin → Import Data.
