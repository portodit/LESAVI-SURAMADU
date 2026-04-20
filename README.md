# LESA VI Witel Suramadu Dashboard

Dashboard monitoring dan management untuk Witel Suramadu. Proyek ini menggunakan arsitektur monorepo dengan `pnpm` workspace.

## 🛠 Prerequisites

Pastikan Anda telah menginstal software berikut:
- **Node.js**: Versi LTS terbaru.
- **pnpm**: `npm install -g pnpm`
- **PostgreSQL**: Pastikan database server berjalan secara lokal atau remote.

## 🚀 Setup Proyek

1. **Instal Dependensi**:
   ```bash
   pnpm install
   ```

2. **Konfigurasi Environment**:
   Salin file `.env.example` menjadi `.env` dan sesuaikan nilainya:
   ```bash
   cp .env.example .env
   ```
   **PENTING**: Pastikan `DATABASE_URL` sudah mengarah ke database PostgreSQL Anda.

3. **Sinkronisasi Database**:
   Jalankan perintah berikut untuk mensinkronkan skema database menggunakan Drizzle:
   ```bash
   pnpm --filter @workspace/db run push
   ```

4. **Seeding Data (Opsional)**:
   Jika Anda membutuhkan data awal untuk pengujian:
   ```bash
   pnpm --filter @workspace/api-server run seed
   ```

## 💻 Menjalankan Aplikasi

Anda dapat menjalankan frontend dan backend secara terpisah menggunakan perintah di bawah ini dari root directory:

### 1. Frontend (Dashboard)
```bash
pnpm --filter @workspace/lesavi-dashboard run dev
```
Aplikasi akan berjalan di [http://localhost:5173](http://localhost:5173).

### 2. Backend (API Server)
```bash
pnpm --filter @workspace/api-server run dev
```
Server akan berjalan sesuai port yang dikonfigurasi di `.env` (default: 3000).

---

## 📂 Struktur Workspace

- `artifacts/lesavi-dashboard`: Aplikasi Frontend (React + Vite).
- `artifacts/api-server`: Backend API (Express.js).
- `lib/db`: Shared library untuk akses database (Drizzle ORM).
- `lib/api-zod`: Shared schema validasi menggunakan Zod.
