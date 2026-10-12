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
 ├── 3. build_archive.py    → src/data/kki-archive.json (2104 entri level-seri)
 └── 4. mu_enrich.py         → cover + deskripsi EN dari MangaUpdates
                               + terjemahan ID (cache kki-translations.json)
```

Jalankan: `python3 scripts/sync-kki.py [--skip-mu] [--mu-limit N] [--retry-blocked]`

Idempotent & aman di-rerun. Data MU yang sudah ada dipertahankan antar rebuild.

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

## File data

| File | Isi |
|---|---|
| `src/data/kki-enrichment.json` | Enrichment per seriesId Nuvellite (demografi, penerbit JP, vol JP, …) |
| `src/data/kki-archive.json` | 2104 entri arsip level-seri (tidak ada di Gramedia) |
| `scripts/kki/kki-review-queue.json` | 108 pasangan ambigu untuk review manual |
| `scripts/kki/kki-translations.json` | Cache terjemahan EN→ID |
