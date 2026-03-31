# Fix: Presentation Login untuk Semua Role (OFFICER, MANAGER)

**Tanggal:** 2026-03-31
**Commit:** a51e59b6174fd5400c5558e3501f0c0302d24016

## Masalah

NIK `160203` (role=`OFFICER`) tidak bisa login ke `/presentation/login` karena endpoint `/api/public/am` hanya mengembalikan user dengan `role=AM`.

## Perubahan

**File:** `artifacts/api-server/src/features/performance/publicRoutes.ts`

- Hapus filter `eq(accountManagersTable.role, "AM")` dari WHERE clause
- Endpoint kini mengembalikan semua user dengan `aktif=true`, mencakup role AM, OFFICER, dan MANAGER

## Dampak

Semua user aktif (berapapun role-nya) dapat menggunakan presentation login.
