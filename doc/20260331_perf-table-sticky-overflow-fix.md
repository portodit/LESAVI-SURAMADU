# PresentationPage Performa — Fix Sticky Nama AM dan Sub-Header Customer — 2026-03-31

## Request
Di tabel performa slide pertama `/presentation`, baris nama AM dan baris sub-header customer (`#, Pelanggan/NIP, Target, Real, Ach%, Proporsi`) tidak "fix" posisinya saat scroll — tidak sticky meskipun sudah di-set `position:sticky`.

## Root Cause
Container tabel performa menggunakan:
```jsx
<div className="border border-border rounded overflow-x-auto">
```

**CSS spec**: Ketika `overflow-x` di-set ke nilai non-`visible` (seperti `auto`), browser juga meng-implied `overflow-y` ke `auto`. Akibatnya, div ini menjadi **scroll container di kedua arah (X dan Y)**.

Semua elemen dengan `position: sticky` di dalam div ini menjadi sticky **relatif terhadap div ini** — bukan terhadap outer `flex-1 overflow-y-auto` scroll container. Karena div ini **tidak memiliki height constraint** (`max-height` / `height`), div tumbuh mengikuti konten → tidak ada scroll vertikal → sticky tidak pernah aktif secara visual.

Pola yang sama terjadi di Funnel slide sebelumnya dan diselesaikan dengan `overflow-auto` + `maxHeight`.

## Fix

**`artifacts/telkom-am-dashboard/src/features/performance/PresentationPage.tsx`**

### 1. Ubah container menjadi proper scroll container
```jsx
// BEFORE:
<div className="border border-border rounded overflow-x-auto">

// AFTER:
<div className="border border-border rounded overflow-auto" style={{maxHeight:"calc(100svh - 220px)"}}>
```
`overflow-auto` + `maxHeight` menjadikan div ini scroll container yang sesungguhnya di kedua arah. Sticky elements di dalamnya akan sticky terhadap **container ini** — dan karena container bisa scroll, sticky benar-benar aktif.

### 2. Sesuaikan `top` offset sticky (hapus `perfToolbarH` dari kalkulasi)
`perfToolbarRef` (toolbar di atas tabel) berada di LUAR scroll container baru. Sticky elements di dalam container menggunakan `top:0` sebagai base — bukan `top:perfToolbarH`.

```typescript
// Global header table:  top:perfToolbarH → top:0
// AM name table:        top:perfToolbarH+perfPresentTableHeaderH → top:perfPresentTableHeaderH
// Customer sub-header:  top:perfToolbarH+perfPresentTableHeaderH+perfPresentAmRowH → top:perfPresentTableHeaderH+perfPresentAmRowH
```

### Posisi sticky final (relatif terhadap scroll container)
| Elemen | `top` | `zIndex` |
|---|---|---|
| Global header table (merah) | `0` | 20 |
| AM name sticky table (expanded) | `perfPresentTableHeaderH` | 16 |
| Customer sub-header `<thead>` | `perfPresentTableHeaderH + perfPresentAmRowH` | 15 |

## Perbandingan dengan Funnel Slide
Funnel slide (line 1421) sudah menggunakan pola yang sama:
```jsx
<div className="border border-border rounded overflow-auto" style={{maxHeight:"calc(100svh - 210px)"}}>
```
Performa table kini mengikuti pola identik dengan offset `220px` (sedikit lebih besar karena ada trophy cards di atas).

## Hasil
- Scroll di dalam tabel performa: header merah (NAMA AM | TARGET | REAL | CM% | YTD% | CUSTOMER | RANK) tetap sticky di atas ✓
- Saat AM di-expand dan scroll: nama AM sticky tepat di bawah header merah ✓
- Sub-header customer (# | Pelanggan/NIP | Target | Real | Ach% | Proporsi) sticky tepat di bawah nama AM ✓
