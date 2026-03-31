# PresentationPage Performa — Refactor Tabel ke Multi-Table Funnel-Style — 2026-03-31

## Request
Tabel performa di slide pertama `/presentation` diubah dari satu `<table>` besar (dengan nested colspan untuk customer) menjadi pola multi-table seperti FunnelSlide: satu header table global (sticky) + per-AM tables terpisah (collapsed = tabel sederhana, expanded = 3 tabel: AM sticky + customer detail + AM footer total).

## Root Cause / Motivasi
Tabel single-table sebelumnya memiliki masalah:
- Customer sub-header sticky di dalam `<td colSpan={8}>` nested — tidak bisa presisi
- AM row sticky di `<tr>` dalam satu tbody — konflik z-index dengan header
- Beberapa sel expanded AM pakai background semi-transparan sehingga konten terlihat menembus

## Fix

**`artifacts/telkom-am-dashboard/src/features/performance/PresentationPage.tsx`**

### Struktur baru multi-table
```jsx
// ① Satu global header table — sticky di atas (zIndex:20)
<table style={{position:"sticky", top:perfToolbarH, zIndex:20}}>
  <thead ref={perfTheadCallbackRef}>
    <tr className="bg-red-700 text-white">
      <th>...</th> {/* NAMA AM | TARGET | REAL | CM% | YTD% | CUSTOMER | RANK */}
    </tr>
  </thead>
</table>

// ② Per-AM: collapsed = satu table biasa
<table key={row.nik}>
  <tbody>
    <tr onClick={...}>{amCells}</tr>
  </tbody>
</table>

// ② Per-AM: expanded = 3 tabel terpisah
<div key={row.nik}>
  {/* a. Sticky AM name table */}
  <table ref={perfPresentAmRowCallbackRef} style={{position:"sticky", top:perfToolbarH+perfPresentTableHeaderH, zIndex:16}}>
    ...
  </table>
  {/* b. Customer detail table dengan sticky <thead> */}
  <table>
    <thead style={{position:"sticky", top:perfToolbarH+perfPresentTableHeaderH+perfPresentAmRowH, zIndex:15}}>
      <tr style={{background:"rgb(255,241,242)"}}>
        <th>#</th><th>Pelanggan / NIP</th><th>Target</th><th>Real</th><th>Ach %</th><th>Proporsi</th>
      </tr>
    </thead>
    <tbody>...</tbody>
  </table>
  {/* c. AM total footer table */}
  <table>
    <tbody>
      <tr className="bg-rose-50">{/* Total target/real/ach */}</tr>
    </tbody>
  </table>
</div>
```

### Highlights teknis
- `PerfColGroup` component untuk menjaga konsistensi lebar kolom di semua tabel
- Semua sel expanded AM pakai `backgroundColor:"hsl(var(--card))"` (fully opaque)
- Ring border abu-abu: `outline:"2px solid #94a3b8"` di sekitar expanded block
- `perfPresentAmRowCallbackRef` type: `HTMLTableElement` (bukan `HTMLTableRowElement`)

## State / Refs baru
```typescript
const [perfPresentTableHeaderH, setPerfPresentTableHeaderH] = useState(43);
const perfTheadCallbackRef = useCallback((el: HTMLTableSectionElement|null) => {...})
const [perfPresentAmRowH, setPerfPresentAmRowH] = useState(38);
const perfPresentAmRowCallbackRef = useCallback((el: HTMLTableElement|null) => {...})
```

## Hasil
- Header kolom (merah) tetap sticky di atas saat scroll ✓
- Saat AM di-expand: nama AM sticky tepat di bawah header, customer sub-header sticky di bawah AM row ✓
- Customer rows ter-align dengan kolom header global ✓
- AM footer row menampilkan total target/real/ach per AM ✓
