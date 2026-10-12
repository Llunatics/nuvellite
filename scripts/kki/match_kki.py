#!/usr/bin/env python3
"""
KKI <-> Nuvellite series matcher.

Fuzzy-matches Nuvellite series (from catalog-listing.json) against the
Komunitas Kolektor Komik Indonesia (KKI) spreadsheet database
(manga + light novel tabs).

Outputs:
  - src/data/kki-enrichment.json        keyed by Nuvellite seriesId
  - scripts/kki/kki-review-queue.json   ambiguous matches for manual review
  - scripts/kki/kki-unmatched.json      KKI rows with no Nuvellite counterpart
                                        (archive candidates)

Matching policy (conservative):
  - normalize: lowercase, strip punctuation, collapse whitespace
  - score = max(WRatio, token_sort_ratio) via rapidfuzz
  - score >= 88  -> auto-match (same medium only)
  - 70 <= score < 88 -> review queue (never auto-matched)
  - score < 70  -> unmatched (archive candidate)
  - cross-medium matches (manga<->LN) never auto-match -> review queue
"""

import csv
import json
import re
import sys
from pathlib import Path

try:
    from rapidfuzz import fuzz
except ImportError:
    print("rapidfuzz not installed: pip install rapidfuzz", file=sys.stderr)
    sys.exit(1)

REPO = Path(__file__).resolve().parents[2]
KKI_DIR = REPO / "scripts" / "kki"
DATA_DIR = REPO / "src" / "data"

AUTO_THRESHOLD = 90
REVIEW_THRESHOLD = 70
AUTHOR_THRESHOLD = 70      # min author fuzz for compatibility
AUTHOR_STRONG_THRESHOLD = 85  # strong author match overrides substring guard

MANGA_CSV = KKI_DIR / "kki-manga.csv"
LN_CSV = KKI_DIR / "kki-ln.csv"

# words that, when they are the ONLY difference between two titles,
# indicate an edition/variant rather than a different series
EDITION_MARKERS = {
    "complete", "edition", "deluxe", "omnibus", "bind", "up", "bindup",
    "vol", "volume", "best",
}

# words indicating a spin-off / compilation / side story — these mean a
# DIFFERENT series even when the author matches (e.g. "Cerita Spesial Doraemon")
SPINOFF_MARKERS = {
    "spesial", "special", "cerita", "kisah", "selection", "archives",
    "arsip", "vs", "tribute", "anthology", "antologi", "another",
    "gaiden", "side", "secret",
}


def normalize(title: str) -> str:
    t = (title or "").lower()
    # drop common publisher prefixes that appear in either source
    t = re.sub(r"^(level comic|akasha|koloni|komik|light novel)\s*:\s*", "", t)
    t = re.sub(r"[^\w\s]", " ", t, flags=re.UNICODE)
    t = re.sub(r"\s+", " ", t).strip()
    return t


# author strings that are actually publisher names -> treat as unverifiable
PUBLISHER_IN_AUTHOR_RE = re.compile(
    r"elex|m&c|gramedia|komputindo|publishing|publisher|phoenix|\bpgi\b|koloni|akasha|level comic",
    re.IGNORECASE,
)


def is_person_author(a: str) -> bool:
    a = (a or "").strip()
    return bool(a) and not PUBLISHER_IN_AUTHOR_RE.search(a)


def normalize_author(a: str) -> str:
    t = (a or "").lower()
    t = re.sub(r"\b(cerita|gambar|story|art)\s*:", " ", t)
    t = re.sub(r"[^\w\s]", " ", t, flags=re.UNICODE)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def author_score(nuv_author: str, kki_author: str) -> float:
    """0-100. Returns -1 when either side is missing/not a person name
    (publisher names in the author field are unverifiable)."""
    if not is_person_author(nuv_author) or not is_person_author(kki_author):
        return -1.0
    na, ka = normalize_author(nuv_author), normalize_author(kki_author)
    if not na or not ka:
        return -1.0
    # token overlap: every significant token of the shorter name should
    # appear in the longer one ("gosho aoyama" vs "aoyama gosho")
    na_tokens = [w for w in na.split() if len(w) > 2]
    ka_tokens = [w for w in ka.split() if len(w) > 2]
    if na_tokens and ka_tokens:
        short, long = (na_tokens, ka_tokens) if len(na_tokens) <= len(ka_tokens) else (ka_tokens, na_tokens)
        overlap = sum(1 for w in short if w in long) / len(short)
        if overlap >= 0.5:
            return max(85.0, fuzz.WRatio(na, ka))
    return float(fuzz.WRatio(na, ka))


def score_titles(a: str, b: str) -> float:
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 100.0
    return max(fuzz.WRatio(na, nb), fuzz.token_sort_ratio(na, nb))


def load_kki_rows(path: Path, medium: str):
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            title = (r.get("Judul Komik yang Terbit di Indonesia")
                     or r.get("Judul Light Novel yang Terbit di Indonesia") or "").strip()
            if not title:
                continue
            rows.append({
                "title": title,
                "author": (r.get("Pengarang") or "").strip(),
                "illustrator": (r.get("Ilustrator") or "").strip(),
                "demographic": (r.get("Demografi") or "").strip(),
                "volumes_id": (r.get("Vol. di INA") or "").strip(),
                "status_id": (r.get("Status di INA") or "").strip(),
                "publisher_id": (r.get("Penerbit ") or r.get("Penerbit") or "").strip(),
                "year_first_vol": (r.get("Tahun Terbit Vol. 1") or "").strip(),
                "price_min": (r.get("Harga min.") or "").strip(),
                "price_max": (r.get("Harga Max.") or "").strip(),
                "paper_type": (r.get("Jenis Kertas") or "").strip(),
                "volumes_jp": (r.get("Vol. di JPN") or "").strip(),
                "status_jp": (r.get("Status di JPN") or "").strip(),
                "publisher_jp": (r.get("Penerbit di JPN") or "").strip(),
                "mangaupdates_url": (r.get("MangaUpdates") or "").strip(),
                "notes": (r.get("Keterangan/Catatan") or "").strip(),
                "medium": medium,
            })
    return rows


def load_nuvellite_series():
    with open(DATA_DIR / "catalog-listing.json", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("series", [])


def build_enrichment(kki_row: dict) -> dict:
    return {
        "demographic": kki_row["demographic"] or None,
        "publisherJp": kki_row["publisher_jp"] or None,
        "volumesJp": kki_row["volumes_jp"] or None,
        "statusJp": kki_row["status_jp"] or None,
        "mangaupdatesUrl": kki_row["mangaupdates_url"] or None,
        "priceMin": kki_row["price_min"] or None,
        "priceMax": kki_row["price_max"] or None,
        "paperType": kki_row["paper_type"] or None,
        "yearFirstVol": kki_row["year_first_vol"] or None,
        "kkiTitle": kki_row["title"],
        "kkiPublisher": kki_row["publisher_id"] or None,
    }


def main():
    manga_rows = load_kki_rows(MANGA_CSV, "MANGA")
    ln_rows = load_kki_rows(LN_CSV, "LIGHT_NOVEL")
    print(f"KKI manga rows: {len(manga_rows)}, LN rows: {len(ln_rows)}")

    nuv_series = load_nuvellite_series()
    print(f"Nuvellite series: {len(nuv_series)}")

    # precompute normalized KKI titles
    for r in manga_rows + ln_rows:
        r["_norm"] = normalize(r["title"])

    enrichment = {}
    review_queue = []
    matched_kki_idx = set()  # (medium, idx)

    # Preserve manual matches from previous runs (human-reviewed, never overwrite)
    existing_enrich_path = DATA_DIR / "kki-enrichment.json"
    manual_keep = {}
    if existing_enrich_path.exists():
        try:
            existing = json.loads(existing_enrich_path.read_text(encoding="utf-8"))
            for sid, e in existing.items():
                if isinstance(e, dict) and e.get("matchMethod") == "manual":
                    manual_keep[sid] = e
        except Exception as ex:
            print(f"WARN: could not load existing enrichment: {ex}")
    # Load already-reviewed (NOT_MATCH) decisions so they are not re-queued
    reviewed_not_match = set()
    for log_name in ("kki-review-queue.json",):
        p = KKI_DIR / log_name
        if p.exists():
            try:
                for q in json.loads(p.read_text(encoding="utf-8")):
                    if q.get("reviewDecision") == "NOT_MATCH":
                        reviewed_not_match.add(q.get("nuvelliteSeriesId"))
            except Exception:
                pass

    for s in nuv_series:
        sid = s["id"]
        # Skip human-reviewed decisions: manual matches are kept, NOT_MATCH are not re-queued
        if sid in manual_keep or sid in reviewed_not_match:
            continue
        sname = s.get("name") or ""
        stype = s.get("type")  # MANGA | LIGHT_NOVEL
        snorm = normalize(sname)

        candidates = manga_rows if stype == "MANGA" else ln_rows
        other = ln_rows if stype == "MANGA" else manga_rows

        best = None  # (score, row, row_idx, medium, cross)
        for medium_label, pool in (("same", candidates), ("cross", other)):
            for i, r in enumerate(pool):
                sc = score_titles(snorm, r["_norm"])
                # cheap prefilter via normalized equality already handled; score all
                if best is None or sc > best[0]:
                    best = (sc, r, i, r["medium"], medium_label == "cross")

        if best is None:
            continue
        sc, row, idx, medium, cross = best

        na, nb = snorm, row["_norm"]
        # guard: very short titles must match exactly (avoids "N" == "Anay-Nay")
        short_exact_only = min(len(na), len(nb)) <= 3 and na != nb

        # author signal (-1 = unverifiable, e.g. publisher name in author field)
        asc = author_score(s.get("author") or "", row["author"])
        author_ok = asc < 0 or asc >= AUTHOR_THRESHOLD
        author_strong = asc >= AUTHOR_STRONG_THRESHOLD

        # substring guard: one title inside the other with meaningful extra
        # words usually means a different (spin-off/compilation) series.
        # A strong author match overrides this, EXCEPT when the extra words
        # are spin-off indicators ("Cerita Spesial Doraemon" != "Doraemon").
        substring_extra = False
        if na != nb and (na in nb or nb in na):
            longer = nb if len(nb) > len(na) else na
            shorter = na if len(nb) > len(na) else nb
            extra = longer.replace(shorter, " ").split()
            extra_meaningful = [w for w in extra if w not in EDITION_MARKERS and not w.isdigit()]
            has_spinoff_marker = any(w in SPINOFF_MARKERS for w in extra_meaningful)
            if extra_meaningful and (has_spinoff_marker or not author_strong):
                substring_extra = True

        if (sc >= AUTO_THRESHOLD and not cross and not short_exact_only
                and author_ok and not substring_extra):
            enrichment[sid] = build_enrichment(row)
            enrichment[sid]["matchScore"] = round(sc, 1)
            enrichment[sid]["matchMethod"] = "auto"
            matched_kki_idx.add((medium, idx))
        elif sc >= REVIEW_THRESHOLD:
            reason = "cross-medium" if cross else "score-below-auto"
            if short_exact_only:
                reason = "short-title-inexact"
            elif not author_ok:
                reason = "author-mismatch"
            elif substring_extra:
                reason = "substring-extra-words"
            review_queue.append({
                "nuvelliteSeriesId": sid,
                "nuvelliteTitle": sname,
                "nuvelliteType": stype,
                "nuvelliteAuthor": s.get("author") or "",
                "kkiTitle": row["title"],
                "kkiMedium": medium,
                "kkiAuthor": row["author"],
                "kkiPublisher": row["publisher_id"],
                "score": round(sc, 1),
                "authorScore": round(asc, 1) if asc >= 0 else None,
                "crossMedium": cross,
                "reason": reason,
            })
        # else: no match -> KKI side handled below

    # unmatched KKI rows -> archive candidates
    unmatched = []
    for medium, pool in (("MANGA", manga_rows), ("LIGHT_NOVEL", ln_rows)):
        for i, r in enumerate(pool):
            if (medium, i) in matched_kki_idx:
                continue
            # also exclude rows that appear in review queue (ambiguous, not confirmed absent)
            in_review = any(
                q["kkiTitle"] == r["title"] and q["kkiMedium"] == medium
                for q in review_queue
            )
            if in_review:
                continue
            r_out = {k: v for k, v in r.items() if not k.startswith("_")}
            unmatched.append(r_out)

    # sort review queue by score desc
    review_queue.sort(key=lambda q: -q["score"])

    # Re-attach preserved manual matches (human-reviewed, never auto-overwritten)
    for sid, e in manual_keep.items():
        enrichment[sid] = e
        # mark their KKI rows as matched so they don't leak into the archive
        # (best-effort: match by title)
        kt = (e.get("kkiTitle") or "").strip().lower()
        for medium, pool in (("MANGA", manga_rows), ("LIGHT_NOVEL", ln_rows)):
            for i, r in enumerate(pool):
                if r["title"].strip().lower() == kt:
                    matched_kki_idx.add((medium, i))
                    break

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(DATA_DIR / "kki-enrichment.json", "w", encoding="utf-8") as f:
        json.dump(enrichment, f, ensure_ascii=False, indent=1)
    with open(KKI_DIR / "kki-review-queue.json", "w", encoding="utf-8") as f:
        json.dump(review_queue, f, ensure_ascii=False, indent=1)
    with open(KKI_DIR / "kki-unmatched.json", "w", encoding="utf-8") as f:
        json.dump(unmatched, f, ensure_ascii=False, indent=1)

    print(f"auto-matched (enrichment): {len(enrichment)}")
    print(f"review queue: {len(review_queue)}")
    print(f"unmatched KKI rows (archive candidates): {len(unmatched)}")


if __name__ == "__main__":
    main()
