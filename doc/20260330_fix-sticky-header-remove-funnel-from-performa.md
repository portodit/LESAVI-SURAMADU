# Brief: Fix Sticky Header (CSS Transform Bug) + Remove FunnelSectionCard dari PerformaPage

**Tanggal:** 30 Maret 2026  
**Commit:** `2ff2d44b334a9de79184f9d7638aac6be7ddc01a`  
**File yang diubah:**
- `artifacts/telkom-am-dashboard/src/features/performance/PerformaPage.tsx`
- `artifacts/telkom-am-dashboard/src/shared/layout.tsx`

---

## 1. Bug — Baris Tabel Muncul di Atas Sticky Header saat Scroll

### Gejala
Saat scroll ke bawah pada tabel AM Performance Report di `/visualisasi/performa`, baris-baris tabel (seperti NADYA ZAHROTUL HAYATI) muncul di **atas** sticky section header "AM Performance Report", bukan di belakangnya.

### Root Cause: CSS `transform` Memutus Sticky Positioning

Layout aplikasi menggunakan animasi halaman via Framer Motion:
```jsx
<motion.div
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.18 }}
>
  {children}
</motion.div>
```

Animasi `y: 6 → y: 0` menghasilkan CSS `transform: translateY(...)`. Ini menyebabkan efek samping kritis:

> **CSS Spec:** Transform pada ancestor menciptakan *new containing block* untuk elemen sticky di dalamnya. Sticky element menjadi `top: 0` relatif terhadap `motion.div`, bukan relatif terhadap scroll container (`div.overflow-y-auto`).

Karena `motion.div` berada di dalam scroll container yang memiliki `p-6` (24px padding) pada desktop, sticky element secara efektif muncul di `y = 24px` (atau lebih) dari bagian atas viewport — bukan `y = 0`. Akibatnya baris tabel di atas bisa "mengintip" di atas sticky header.

### Solusi
Hapus transform `y` dari animasi page transition. Gunakan fade (opacity) saja:
```jsx
// Sebelum:
initial={{ opacity: 0, y: 6 }}
animate={{ opacity: 1, y: 0 }}

// Sesudah:
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
```

Animasi tetap smooth (fade-in 180ms), tapi tanpa transform sehingga `position: sticky; top: 0` kini benar-benar menempel di atas scroll container.

---

## 2. Hapus FunnelSectionCard dari PerformaPage

### Latar Belakang
`FunnelSectionCard` ditambahkan ke PerformaPage dalam sesi sebelumnya sebagai adaptasi dari halaman `/visualisasi/funnel`. Namun:
- Sudah ada halaman khusus `/visualisasi/funnel` untuk melihat data funnel
- Penambahan di PerformaPage menambah clutter yang tidak perlu
- User mempertanyakan keberadaannya

### Tindakan
- Hapus `import { FunnelSectionCard }` dari `PerformaPage.tsx`
- Hapus `<FunnelSectionCard />` dari JSX

File `FunnelSectionCard.tsx` tetap ada di codebase (tidak dihapus) karena mungkin berguna untuk keperluan lain.

---

## Ringkasan

| # | Perubahan | File |
|---|---|---|
| 1 | Hapus `y: 6` transform dari animasi `motion.div` | `shared/layout.tsx` |
| 2 | Hapus import `FunnelSectionCard` | `PerformaPage.tsx` |
| 3 | Hapus `<FunnelSectionCard />` dari JSX | `PerformaPage.tsx` |
