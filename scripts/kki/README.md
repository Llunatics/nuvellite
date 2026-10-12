# KKI Integration

Integrasi database **Komunitas Kolektor Komik Indonesia** ("Database Komik yang
Terbit di Indonesia", Google Sheets publik, diupdate berkala oleh komunitas)
ke Nuvellite.

## Pipeline

```
sync-kki.py
 ├── 1. download CSV sheets (manga gid 1781960306, LN gid 640933522)
 ├── 2. match_kki.py        → src/data/kki-enrichment.json (keyed by seriesId)
 │                            + kki-review-queue.json (manual review)
 │                            + kki-unmatched.json (kandidat arsip)
 ├── 3. build_archive.py    → src/data/kki-archive.json (entri level-seri)
 ├── 4. mu_enrich.py         → cover + deskripsi EN dari MangaUpdates
 │                            + terjemahan ID (cache kki-translations.json)
 └── 5. pranala_cover.py     → cover fallback dari og:image halaman Pranala
                               (mncgramedia.id dsb), disimpan sbg pranalaCover
```

Jalankan: `python3 scripts/sync-kki.py [--skip-mu] [--mu-limit N] [--retry-blocked]`
Lalu: `python3 scripts/kki/pranala_cover.py --all` (atau `--limit N`)

Idempotent & aman di-rerun. Data MU / pranalaCover yang sudah ada dipertahankan
antar rebuild.

## Matching policy (konservatif)

- Normalisasi judul (lowercase, hapus tanda baca, strip prefix penerbit)
- Skor = max(WRatio, token_sort_ratio) via rapidfuzz
- Auto-match: skor ≥ 90, medium sama, penulis kompatibel, tanpa substring
  ekstra yang mencurigakan. Contoh yang SENGAJA tidak auto-match:
  `City Hunter` → `City` (penulis beda), `Doraemon` → `Cerita Spesial Doraemon`
  (spin-off), `Anay-Nay` → `N` (judul pendek), novel vs manga (cross-medium).
- Skor 70–89 → `kki-review-queue.json` untuk review manual. Jangan flip
  klasifikasi berdasarkan asumsi franchise (SOP).

## Keterbatasan jaringan (dicatat 2026-10-12)

- **MangaUpdates**: HTTP 429 persisten dari IP VM ini → `mu_enrich.py`
  menandai `mu.status="blocked"` dan lanjut; otomatis dicoba lagi di sync
  berikutnya (atau dari network lain).
- **Translate**: Google Translate web & MyMemory membatasi IP ini.
  Terjemahan ID di-cache permanen (`kki-translations.json`) sehingga progresif:
  tiap sync menambah entri yang berhasil. UI menandai sinopsis sebagai
  "Diterjemahkan otomatis dari MangaUpdates".
- **Cover fallback via Pranala** (strategi kreatif, 2026-10-12): kolom
  `Pranala` di sheets berisi link toko penerbit (mncgramedia.id,
  phoenixgramedia.id, pis.gramedia.id). Halaman-halaman ini BISA diakses dari
  VM dan membawa `og:image` berisi cover buku (hit rate ~88% pada sampel 25).
  `pranala_cover.py` menarik og:image untuk entri arsip yang belum punya cover
  MU; hasilnya disimpan sebagai `pranalaCover` di `kki-archive.json` dan dipakai
  UI sebagai fallback (`mu.cover` → `pranalaCover` → placeholder monogram).
  Prioritas cover: MangaUpdates > Pranala og:image > placeholder monogram.
- **Alternatif yang SUDAH dicoba dan gagal dari VM ini**: AniList
  (Cloudflare), Jikan (unreachable), Google Books (unreachable), proxy
  allorigins (522), corsproxy.io (401 butuh key).

## File data

| File | Isi |
|---|---|
| `src/data/kki-enrichment.json` | Enrichment per seriesId Nuvellite (demografi, penerbit JP, vol JP, …) |
| `src/data/kki-archive.json` | 2104 entri arsip level-seri (tidak ada di Gramedia) |
| `scripts/kki/kki-review-queue.json` | 108 pasangan ambigu untuk review manual |
| `scripts/kki/kki-translations.json` | Cache terjemahan EN→ID |
