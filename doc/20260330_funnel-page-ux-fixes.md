# Brief: FunnelPage — UX Fixes (Scrollbar, Colors, Toolbar)

**Tanggal:** 30 Maret 2026  
**Commit:** `1bb18b9737a99ae00f3f7f8c149df69ab2569681`  
**File yang diubah:**
- `artifacts/telkom-am-dashboard/src/features/funnel/FunnelPage.tsx`

---

## Daftar Perubahan

### 1. Filter Group — Sembunyikan Scrollbar Horizontal (Merah)

**Sebelum:** Filter row (Tampilan, Snapshot, Periode, dll.) overflow-x-auto dengan scrollbar browser default berwarna merah di beberapa OS/browser.

**Sesudah:** Scrollbar disembunyikan via Tailwind utilities:
```
[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
```
Row tetap bisa di-scroll horizontal (gesture/trackpad), tapi scrollbar tidak terlihat.

---

### 2. Filter Aktif — 1 Baris Horizontal Slider

**Sebelum:** `flex-wrap` — chips baris filter aktif bisa wrap ke baris baru sehingga mengambil lebih banyak ruang vertikal.

**Sesudah:** `flex-nowrap overflow-x-auto` + hidden scrollbar — chips selalu 1 baris, overflow ke kanan dan bisa digeser horizontal (swipe/drag).

---

### 3. Capaian Real vs Target — Warna Kelebihan/Kekurangan per Divisi

**Sebelum:** Semua gauge menampilkan warna yang sama: `text-emerald-600` (surplus) dan `text-red-600` (defisit).

**Sesudah:** Warna surplus disesuaikan dengan warna gauge masing-masing divisi:

| Divisi | Surplus | Defisit |
|---|---|---|
| DPS | `text-blue-600` (biru, sesuai gauge DPS) | `text-red-600` |
| DSS | `text-emerald-600` (hijau, sesuai gauge DSS) | `text-red-600` |
| Default (non-split) | `text-emerald-600` | `text-red-600` |

Implementasi: variabel `surplusColor` dihitung dari prop `divisi` di komponen `Gauge`:
```tsx
const surplusColor = divisi === "DPS" ? "text-blue-600" : "text-emerald-600";
```

---

### 4. Detail Funnel per AM — Toolbar 1 Baris Slider, Tabel Tidak Menutupi Toolbar

**Masalah sebelumnya:**
1. Toolbar wrap ke 2 baris di layar kecil → tombol "Expand Semua AM" tidak terlihat
2. Saat scroll tabel, `<thead>` dengan `z-index: 20` menutup toolbar yang juga `z-20`

**Sesudah:**

**a) Toolbar 1 baris slider:**
```jsx
<div className="sticky top-0 z-30 bg-card px-4 py-3 border-b border-border 
                overflow-x-auto [scrollbar-hidden]">
  <div className="flex items-center gap-3 flex-nowrap" style={{ minWidth: "fit-content" }}>
    <h3>Detail Funnel per AM</h3>
    <div className="flex items-center gap-2 flex-nowrap ml-auto">
      {/* Nama AM dropdown, search, Expand button */}
    </div>
  </div>
</div>
```
- Outer div: `overflow-x-auto` + hidden scrollbar + `sticky top-0 z-30`
- Inner div: `flex-nowrap` dengan `minWidth: fit-content` → semua elemen 1 baris, bisa digeser kiri-kanan dalam section
- Konten tidak bisa keluar dari batas section (overflow tetap terkurung di dalam card)

**b) z-index fix:**
- Toolbar: `z-30` (naik dari `z-20`)
- `<thead>` tabel tetap `z-index: 20`
- Sekarang toolbar selalu tampil di atas thead saat scroll

**c) Background opaq:**
- `bg-card/95 backdrop-blur-sm` → `bg-card` (sama seperti fix sebelumnya untuk PerformaPage)

---

## Ringkasan

| # | Perubahan | Lokasi |
|---|---|---|
| 1 | Hide scrollbar filter group | Line ~1054 |
| 2 | Filter aktif: 1 baris flex-nowrap + hide scrollbar | Line ~1105 |
| 3 | Gauge: surplusColor DPS=blue, DSS=green | Line ~411, 447, 450 |
| 4 | Toolbar Detail Funnel: 1-row slider, z-30, bg-card opaq | Line ~1205-1237 |
