# nuvellite

Pelacak rilisan resmi Manga dan Light Novel berlisensi di Indonesia untuk tiga penerbit utama: **Elex Media Komputindo** (termasuk Level Comics), **m&c! Publishing** (termasuk Akasha dan Koloni), serta **Phoenix Gramedia Indonesia (PGI / Kadokawa)**.

Nuvellite dirancang sebagai katalog editorial yang berfokus pada kelengkapan data kolektor, keakuratan riwayat harga, dan pengalaman membaca informasi yang rapi tanpa gangguan barang non-buku.

---

## Karakteristik & Arsitektur Sistem

### 1. Katalog Utuh, Bukan Sekadar Stok Toko
Tracker rilis harus memetakan seluruh semesta rilis resmi, bukan hanya produk yang sedang bisa dibeli saat ini.
- Produk berstatus habis (*out of stock*) tetap tercatat di katalog dengan status ketersediaan yang jelas.
- Buku tidak dihapus sepihak dari sistem hanya karena sedang tidak muncul di pencarian inventaris aktif.
- Menjaga data rilisan historis, reguler, pre-order, dan volume terdahulu.

### 2. Deteksi Volume Seri & Pemulihan Celah (*Gap Recovery*)
- Algoritma deret volume mengenali nomor rilis secara otomatis (misalnya Vol. 1, 2, 4, 5 mendeteksi bahwa Vol. 3 belum tercatat atau belum dimiliki).
- Jika volume yang hilang ditemukan dari sumber resmi—meskipun stoknya kosong—sistem langsung merekonsiliasinya ke dalam seri.
- Dashboard koleksi menampilkan progres kelengkapan volume per seri dan menyorot nomor yang terlewat.

### 3. Semantik Harga Riil vs Harga Diskon
- Membedakan antara **harga normal resmi (SRP / list price)** dan **harga promo/diskon saat ini**.
- Harga coret hanya muncul jika produk memang sedang dipotong dari harga normalnya.
- Riwayat fluktuasi mencatat momen diskon tanpa mengubah data harga resmi dasar.

### 4. Prioritas Edisi Kanonikal
- Edisi Reguler selalu menjadi representasi utama dari sebuah volume.
- Varian bundling (*Special Set*, *Limited Edition*, *Box Set*) disematkan sebagai opsi edisi dalam kartu yang sama, sehingga tidak mengacaukan nomor volume seri.

### 5. 100% Data-Driven (Tanpa Judul Hardcoded)
- Seluruh logika klasifikasi, pemisahan format (Manga vs Light Novel), dan resolusi entitas berjalan berdasarkan aturan data: imprint penerbit, token format, slug kategori, dan metadata ISBN.
- Tidak ada daftar judul anime/manga statis di dalam kode aplikasi. Rilisan baru di masa depan akan langsung dikenali dan diproses otomatis.

### 6. Desain Editorial & Liquid Glass
- **Header Adaptif**: Menyatu tanpa batas (*integrated*) di bagian atas halaman, lalu bertransisi mulus menjadi bilah kaca mengapung (*liquid-glass pill*) saat halaman digulir.
- **Palet Tema**: Pilihan aksen warna dinamis (Vermilion, Gold, Indigo, Emerald, Azure, Rose) yang tersimpan di penyimpanan lokal.
- **Tipografi Terkurasi**: Perpaduan serif editorial untuk judul dan sans modern untuk keterbacaan data teknis.
- **Sinopsis Bersih**: Pembersih teks otomatis membuang disclaimer toko, spesifikasi fisik, dan kalimat promosi belanja dari sinopsis resmi.

---

## Struktur Folder

```
nuvellite/
├── scripts/               # Pipeline sinkronisasi & adapter sumber resmi
│   ├── adapters/          # Adapter vendor Gramedia (Elex, m&c!, PGI)
│   └── auto-sync-catalog.py
├── src/
│   ├── app/               # Next.js App Router (katalog, seri, kalender, koleksi)
│   ├── components/        # Komponen UI, navigasi, kartu rilis, dialog cari
│   ├── data/              # Snapshot basis data katalog JSON
│   ├── hooks/             # State tema & koleksi lokal
│   └── lib/               # Layanan katalog, normalisasi harga, pembersih sinopsis
└── tests/                 # Rangkaian pengujian unit & regresi (Vitest)
```

---

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS dengan custom design tokens (editorial surfaces, soft glass, liquid glass)
- **Icons**: Lucide React
- **Engine Data**: Python 3 (Urllib, ThreadPoolExecutor, Regex Normalization)
- **Testing**: Vitest (51 unit & regression tests)

---

## Menjalankan Proyek

### Kebutuhan Sistem
- Node.js 18+
- Python 3.9+ (untuk sinkronisasi scraper)

### Instalasi & Mode Dev
```bash
# Pasang dependensi Node.js
npm install

# Jalankan server pengembangan (port 3001)
npm run dev
```

Buka `http://localhost:3001` di peramban.

### Menjalankan Pengujian
```bash
# Menjalankan seluruh test suite Vitest
npm test

# Pengecekan tipe TypeScript
npx tsc --noEmit
```

### Build Produksi
```bash
npm run build
npm start
```

### Menjalankan Sinkronisasi Data (Opsional)
```bash
# Sinkronisasi satu kali dari sumber resmi
python3 scripts/auto-sync-catalog.py

# Menjalankan daemon berkala di background (contoh: tiap 1 jam)
python3 scripts/auto-sync-catalog.py --daemon --interval 3600
```