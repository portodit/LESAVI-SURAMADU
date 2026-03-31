# Fix: Import Performa Pakai DIVISI_CC + PROPORSI Dikali 100

**Tanggal:** 2026-03-31
**Commit:** bee63ca717a3826b87f86d6dd274640e602ecda7

## Masalah

1. **Divisi AM** — import performa mengambil divisi dari kolom `DIVISI_AM`, padahal kolom yang benar adalah `DIVISI_CC`
2. **PROPORSI** — nilai dari file Excel/Sheets berupa desimal (mis. `0.75`) tetapi disimpan apa adanya; seharusnya dikali 100 menjadi persentase (`75`)

## Perubahan

**File yang diubah:**
- `artifacts/api-server/src/features/import/routes.ts`
- `artifacts/api-server/src/features/gdrive/importer.ts`
- `artifacts/api-server/src/features/gsheets/sync.ts`

**Detail perubahan:**

| Kolom | Sebelum | Sesudah |
|---|---|---|
| Divisi | `DIVISI_AM \|\| divisi` | `DIVISI_CC \|\| divisi_cc \|\| DIVISI_AM \|\| divisi` |
| PROPORSI | `parseFloat(...)` | `parseFloat(...) * 100` |

Perubahan diterapkan pada semua jalur import: upload file manual, GDrive importer, dan GSheets sync.

## Catatan

Data yang sudah diimport sebelumnya tidak otomatis terkoreksi. Perlu re-import ulang dengan flag `forceOverwrite` untuk memperbarui data lama.
