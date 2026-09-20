# nuvellite — Official Manga & Light Novel Release Tracker

**nuvellite** adalah aplikasi web modern, berkecepatan tinggi, dan terfokus **100% eksklusif** untuk melacak seluruh rilisan resmi **Manga (Komik)** dan **Light Novel** di Indonesia dari tiga penerbit resmi terkemuka:
1. **Elex Media Komputindo** (Elex Manga, Level Comics)
2. **m&c! Publishing** (m&c! Comics, Akasha, Koloni)
3. **Phoenix Gramedia Indonesia (PGI)** (Kadokawa Official Joint Venture)

---

## ✨ Fitur Unggulan

- **Fokus Murni Manga & Light Novel**:
  - **Zero Merchandise**: Seluruh merchandise (gantungan kunci, poster, standing acryl, bookmark, tas, dsb.) diisolasi dan disingkirkan dari katalog.
  - **Zero Non-Manga/LN**: Buku umum, novel sastra barat, buku medis, agama, ensiklopedia anak, dan buku non-fiksi yang diterbitkan grup Gramedia disaring secara dinamis tanpa mencemari katalog.
- **Sinopsis Cerita Otentik & Bersih**:
  - Sinopsis cerita diambil langsung secara dinamis dari endpoint metadata resmi Gramedia.
  - Diproses otomatis menggunakan filter pembersih untuk membuang teks disclaimer (*"Disclaimer: Cerita dalam komik ini..."*), rincian spesifikasi fisik, dan teks ajakan promosi belanja (*"Yuk segera dapatkan..."*), menyisakan murni sinopsis naratif cerita.
- **Pemisahan Cerdas Multi-Format (Manga vs Light Novel)**:
  - Judul dengan franchise yang sama namun berbeda medium (seperti *Alya Sometimes Hides Her Feelings in Russian*, *Classroom of the Elite*, dan *Detektif Conan*) otomatis dipisahkan menjadi seri Manga dan seri Light Novel yang independen.
- **Konsolidasi Set & Edisi Khusus**:
  - Edisi bundling (*Special Set*, *Birthday Set*, *Limited Edition*) otomatis dikonsolidasikan ke dalam kartu volume reguler yang bersangkutan sebagai pilihan edisi, mencegah duplikasi judul yang membingungkan.
- **Dynamic Sequence Gap & Out-of-Stock Recovery**:
  - Algoritma pemulihan backlog dinamis yang secara otomatis mencari volume-volume awal yang hilang atau berstatus *out-of-stock* (stok kosong) di Gramedia.com agar kelengkapan nomor volume seri tidak terputus/bolong.
- **Rabu Rilis Radar**:
  - Deteksi otomatis untuk jadwal rilis komik rutin hari Rabu (ciri khas rilis mingguan Elex Media & m&c!).
- **Pelacak Seri & Missing Volume Detector**:
  - Cek instan kelengkapan volume: lacak persentase kelengkapan koleksi Anda dan temukan nomor volume berapa saja yang belum Anda miliki.
- **Pencarian Kilat & Halaman Hasil Pencarian (Cmd/Ctrl + K)**:
  - Pencarian fleksibel berbasis judul romaji, judul Indonesia, nomor volume, pengarang, penerbit, dan ISBN-13. Tekan Enter untuk membuka halaman hasil pencarian lengkap.
- **Local-First Collection & Wishlist**:
  - Tandai buku yang sudah dimiliki (*Owned*) atau masuk daftar keinginan (*Wishlist*) secara instan menggunakan `localStorage` tanpa perlu registrasi/login, lengkap dengan fitur ekspor dan impor file cadangan JSON.
- **Modern Obsidian Dark Luxury UI**:
  - Estetika gelap elegan dengan aksen emas halus, tipografi berkelas (*Plus Jakarta Sans*, *Newsreader*, *JetBrains Mono*), dan tata letak responsif ramah perangkat seluler (*mobile-first*).

---

## 🔄 Mesin Sinkronisasi Otomatis (Standalone)

`nuvellite` dilengkapi dengan daemon sinkronisasi mandiri yang berjalan di background tanpa dependensi eksternal:

```bash
# Menjalankan sinkronisasi katalog satu kali
python3 scripts/auto-sync-catalog.py

# Menjalankan daemon polling berkala (default: per 1 jam)
python3 scripts/auto-sync-catalog.py --daemon --interval 3600
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS (Custom Editorial Design System)
- **Icons**: Lucide React
- **Testing**: Vitest (22/22 automated test suites passing)

---

## 🚀 Menjalankan Project

```bash
# Install dependencies
npm install

# Menjalankan dev server di port 3001
npm run dev

# Menjalankan unit test
npm test

# Membuat build produksi
npm run build

# Menjalankan server produksi
npm start
```

---

## 🧪 Validasi & Pengujian Otomatis

Seluruh logika kritis (mulai dari pencegahan duplikasi seri, isolasi merchandise, pemisahan format Manga/LN, hingga konsolidasi edisi dan pelacak volume hilang) diuji secara otomatis melalui Vitest:

```bash
npm test
```
*Hasil: 22 passed (100% passing).*\n