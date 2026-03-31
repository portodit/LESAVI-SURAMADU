# Shortcut T — Fokus ke Tabel + Expand/Collapse All di Performa

**Tanggal:** 2026-03-31

## Ringkasan
Menambahkan shortcut keyboard `T` di semua slide `/presentation` untuk langsung memfokuskan tabel, sehingga user dapat menggunakan keyboard ↑↓ atau scroll mouse untuk navigasi konten tabel tanpa perlu klik dulu. Selain itu, menambahkan tombol **Expand Semua / Collapse Semua** di toolbar tabel Performa AM.

## Fitur: Shortcut T — Fokus Tabel

### Cara kerja
1. Tekan `T` di slide manapun → tabel aktif langsung mendapat fokus (focus ring merah muncul)
2. Setelah fokus, gunakan:
   - **↑ / ↓** → scroll konten tabel ke atas/bawah (80px per ketukan)
   - **Scroll mouse** → bekerja otomatis saat kursor di atas tabel yang terfokus
3. Tekan `Tab` atau klik area lain untuk keluar dari fokus tabel

### Implementasi per slide

| Slide | File Komponen | Ref | Container |
|-------|--------------|-----|-----------|
| Performa AM (Slide 0) | `EmbedPerforma` | `perfTableRef` | `<div overflow-auto maxHeight 100svh-280px>` — scroll container data AM |
| Sales Funnel (Slide 1) | `FunnelSlide` | `funnelTableRef` | `<div overflow-auto maxHeight 100svh-210px>` — scroll container LOP |
| Sales Activity (Slide 2) | `ActivitySlide` | `actTableRef` | `<div overflow-y-auto maxHeight 100svh-245px>` — wrapper baru membungkus sticky toolbar + body AM |

### Perubahan teknis
- Setiap container tabel diberi `tabIndex={0}` agar bisa menerima fokus keyboard
- `onKeyDown` handler pada container untuk intercept `ArrowUp`/`ArrowDown` → `scrollBy`
- CSS `:focus-visible` ring `ring-2 ring-primary/50` sebagai indikator visual fokus aktif
- Keyboard handler tiap slide ditambahkan branch: `if(e.key==="t"||e.key==="T") { ref.current?.focus(); }`

## Fitur: Expand/Collapse All di Performa AM

### Sebelumnya
Expand/collapse semua baris AM di Performa hanya bisa dilakukan via shortcut keyboard `E`.

### Sesudah
Tombol **"Expand Semua" / "Collapse Semua"** muncul di toolbar tabel Performa AM, di sebelah kanan search bar.
- Jika semua AM sudah expand → tampil "Collapse Semua"
- Jika belum semua expand → tampil "Expand Semua"
- Tooltip `title="Expand / Collapse semua AM (E)"` mengingatkan shortcut keyboard

## Daftar Shortcut yang Diperbarui
Overlay `?` sekarang menyertakan:

| Shortcut | Fungsi |
|----------|--------|
| `T` | Fokus ke tabel — ↑↓ untuk scroll |
| `E` | Expand / Collapse semua baris AM |
| `/` | Fokus ke search bar |
| `Esc` | Collapse semua & hapus pencarian |
