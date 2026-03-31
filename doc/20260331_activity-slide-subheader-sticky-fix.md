# PresentationPage Activity Slide — Fix Sub-Header Tertutup Baris Nama AM — 2026-03-31

## Request
Di slide aktivitas `/presentation`, baris sub-header (`#, Tanggal, Pelanggan & Catatan, Tipe Aktivitas, Kategori, KPI`) tertutup oleh baris nama AM saat scroll ke bawah pada expanded AM block.

## Root Cause
Parent div setiap AM block saat expanded memiliki:
```jsx
<div className="... relative z-[5] ..." ...>
```
`position: relative` + `z-index: 5` menciptakan **stacking context** tersendiri. Di dalam stacking context ini:
- AM row sticky: `z-index: 12`
- Sub-header sticky: `z-index: 11`

Karena keduanya berada di stacking context z:5, dari perspektif halaman keduanya setara di z-level 5. Namun **di dalam** context itu, AM row (z:12) selalu menang atas sub-header (z:11). Ketika scroll menyebabkan kedua elemen overlapping di posisi sticky mereka, AM row menutupi sub-header — meskipun `top` sub-header seharusnya menempatkannya di bawah AM row.

Tambahan: jika `actAmSumRowH` tidak terukur akurat (mismatch dengan tinggi riil AM row), sub-header akan mencoba sticky di posisi yang masih dalam area AM row, semakin memperparah overlap.

## Fix

**`artifacts/telkom-am-dashboard/src/features/performance/PresentationPage.tsx`**

### Sebelum (dua elemen sticky terpisah dalam stacking context yang sama)
```jsx
{/* AM summary row — sticky sendiri */}
<div ref={actAmSumRowCallbackRef}
  style={{..., position:"sticky", top:actToolbarH, zIndex:12}}>
  ... AM row content ...
</div>

{/* Expanded section */}
{isExpanded && (
  <div>
    {/* Sub-header — sticky sendiri, zIndex lebih kecil */}
    <div style={{..., position:"sticky", top:actToolbarH+actAmSumRowH, zIndex:11}}>
      #, Tanggal, Pelanggan & Catatan, Tipe Aktivitas, Kategori, KPI
    </div>
    {activity rows}
  </div>
)}
```

### Sesudah (AM row + sub-header dalam SATU sticky wrapper bersama)
```jsx
{/* Combined sticky wrapper — bergerak bersama, tidak ada konflik z-index */}
<div ref={isExpanded ? actAmSumRowCallbackRef : undefined}
  style={isExpanded ? {position:"sticky", top:actToolbarH, zIndex:12, boxShadow:"..."} : {}}>
  
  {/* AM summary row — TIDAK sticky sendiri, ikut wrapper */}
  <div onClick={...} className="grid ... bg-card border-b border-primary/20"
    style={{gridTemplateColumns:ACT_GRID_COLS}}>
    ... AM row content ...
  </div>

  {/* Sub-header — TIDAK sticky sendiri, ikut wrapper, selalu di bawah AM row */}
  {isExpanded && hasActs && (
    <div className="grid ... bg-secondary border-b border-border"
      style={{gridTemplateColumns:"28px 96px 1fr 140px 120px 60px", padding:"10px 14px 10px 52px"}}>
      #, Tanggal, Pelanggan & Catatan, Tipe Aktivitas, Kategori, KPI
    </div>
  )}
</div>{/* end sticky wrapper */}

{/* Activity rows — di luar sticky wrapper, scroll normal */}
{isExpanded && (
  <div className="bg-secondary/20">
    {activity rows}
  </div>
)}
```

### Keuntungan pendekatan ini
- Sub-header tidak pernah bisa tertutup AM row karena keduanya adalah satu unit sticky
- Tidak ada z-index conflict internal
- `actAmSumRowH` masih diukur (ref pada wrapper) untuk kompatibilitas, tapi tidak lagi dipakai sebagai `top` offset sub-header

## Hasil
- Scroll dalam expanded AM block: nama AM + sub-header bergerak bersama sebagai satu sticky unit ✓
- Sub-header tidak pernah hilang di belakang nama AM ✓
- `bg-secondary` pada sub-header tetap fully opaque (tidak semi-transparan) ✓
