# Fix: PROPORSI Frontend Hapus Kali-100 Ganda

**Tanggal:** 2026-03-31
**Commit:** 17498767a1a441931f9377c4b179e4a3a75cec8c

## Masalah

Setelah fix import (`PROPORSI × 100` saat simpan ke DB), frontend masih melakukan `c.proporsi * 100` lagi saat merender kolom PROPORSI. Akibatnya:

- DB menyimpan `40` (sudah %)
- Frontend menampilkan `40 × 100 = 4000%` ← salah (hanya berlaku ketika `totalReal == 0`)

Ketika `totalReal > 0`, frontend menghitung ulang proporsi dari actual revenue — sehingga nilai dari DB tidak dipakai dan muncul angka berbeda (misal 99.7% dari revenue share aktual).

## Akar Masalah (dari analisis Excel)

- HAVEA PE SAM memiliki `DIVISI_AM = "DES"` (bukan DPS/DSS)
- DIVISI_CC yang benar: DPS (HM Sampoerna=0.4, AKR Surabaya=1.0, PT AKR=1.0) dan DSS (Politeknik=0.99, UNESA=0.99, Airlangga=1.0)
- Jumlah 3 customers per DPS per bulan **sudah benar** — bukan bug
- Bug ada di lapisan display: proporsi dikali 100 dua kali

## Perubahan

**File yang diubah:**
- `artifacts/telkom-am-dashboard/src/features/performance/PerformaPage.tsx`
- `artifacts/telkom-am-dashboard/src/features/performance/PresentationPage.tsx`

**Sebelum:**
```tsx
const prop = totalReal > 0 ? (cReal / totalReal) * 100 : (c.proporsi != null ? c.proporsi * 100 : 0);
// PresentationPage:
const prop = c.proporsi != null ? c.proporsi * 100 : 0;
```

**Sesudah:**
```tsx
const prop = totalReal > 0 ? (cReal / totalReal) * 100 : (c.proporsi != null ? c.proporsi : 0);
// PresentationPage:
const prop = c.proporsi != null ? c.proporsi : 0;
```

## Perilaku Setelah Fix

| Kondisi | Tampilan PROPORSI |
|---|---|
| Ada real revenue | Dihitung dari kontribusi aktual revenue ke total AM |
| Belum ada real revenue | Tampil nilai proporsi dari Excel (sudah %) — mis. Sampoerna = 40% |
