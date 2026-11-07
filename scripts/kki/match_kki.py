#!/usr/bin/env python3
"""
KKI <-> Nuvellite series matcher.

Fixes:
1. Sanitizes mangaupdates_url and pranala at CSV load time via url_utils.
2. Replaces unguarded fuzz.WRatio (which gave 85.5 to any pair sharing "of"/"the")
   with token-overlap guarded scoring so unrelated titles never flood review_queue.
3. Persists human/automated review decisions in scripts/kki/kki-review-decisions.json
   (never overwritten when kki-review-queue.json is regenerated).
4. Marks manual_keep matches in matched_kki_idx BEFORE building unmatched.
5. Does NOT drop KKI archive series merely because they had a low-confidence
   (<90) review queue candidate.
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
sys.path.insert(0, str(KKI_DIR))
from url_utils import sanitize_http_url, sanitize_mu_url

AUTO_THRESHOLD = 90
REVIEW_THRESHOLD = 75
AUTHOR_THRESHOLD = 70
AUTHOR_STRONG_THRESHOLD = 85

MANGA_CSV = KKI_DIR / "kki-manga.csv"
LN_CSV = KKI_DIR / "kki-ln.csv"
DECISIONS_JSON = KKI_DIR / "kki-review-decisions.json"
LEGACY_LOG_JSON = KKI_DIR / "kki-review-log-2026-10-12.json"

EDITION_MARKERS = {
    "complete", "edition", "deluxe", "omnibus", "bind", "up", "bindup",
    "vol", "volume", "best", "novel", "manga", "komik",
}

SPINOFF_MARKERS = {
    "spesial", "special", "cerita", "kisah", "selection", "archives",
    "arsip", "vs", "tribute", "anthology", "antologi", "another",
    "gaiden", "side", "secret", "movie", "petualangan",
}

STOPWORDS = {
    "the", "of", "and", "in", "to", "a", "an", "for", "on", "at", "by",
    "with", "from", "is", "are", "my", "our", "your", "no", "di", "dan",
    "yang", "untuk", "dari", "ke", "dalam", "dengan", "sang", "si",
    "story", "tale", "series", "collection", "edition", "new", "complete",
    "komik", "manga", "novel", "light", "koloni", "akasha", "level",
}

PUBLISHER_IN_AUTHOR_RE = re.compile(
    r"elex|m&c|gramedia|komputindo|publishing|publisher|phoenix|\bpgi\b|koloni|akasha|level comic|berbagai penulis|various authors",
    re.IGNORECASE,
)


def normalize(title: str) -> str:
    t = (title or "").lower()
    t = re.sub(r"^(level comic|akasha|koloni|komik|light novel)\s*[:\-]?\s*", "", t)
    t = re.sub(r"\(\s*novel\s*\)$", "", t).strip()
    t = re.sub(r"[^\w\s]", " ", t, flags=re.UNICODE)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def content_tokens(norm_title: str) -> set[str]:
    return {w for w in norm_title.split() if len(w) >= 2 and w not in STOPWORDS and not w.isdigit()}


def is_person_author(a: str) -> bool:
    a = (a or "").strip()
    return bool(a) and not PUBLISHER_IN_AUTHOR_RE.search(a)


def normalize_author(a: str) -> str:
    t = (a or "").lower()
    t = re.sub(r"\b(cerita|gambar|story|art|original|penulis|ilustrator)\s*:", " ", t)
    t = re.sub(r"[^\w\s]", " ", t, flags=re.UNICODE)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def author_score(nuv_author: str, kki_author: str) -> float:
    if not is_person_author(nuv_author) or not is_person_author(kki_author):
        return -1.0
    na, ka = normalize_author(nuv_author), normalize_author(kki_author)
    if not na or not ka:
        return -1.0
    na_tokens = [w for w in na.split() if len(w) > 2]
    ka_tokens = [w for w in ka.split() if len(w) > 2]
    if na_tokens and ka_tokens:
        short, long = (na_tokens, ka_tokens) if len(na_tokens) <= len(ka_tokens) else (ka_tokens, na_tokens)
        overlap = sum(1 for w in short if w in long) / len(short)
        if overlap >= 0.5:
            return max(85.0, float(fuzz.WRatio(na, ka)))
    return float(fuzz.WRatio(na, ka))


def score_titles(na: str, nb: str, ta: set[str], tb: set[str]) -> float:
    """Compute title similarity without stopword partial_ratio hallucinations."""
    if not na or not nb:
        return 0.0
    if na == nb:
        return 100.0
    # Require at least one shared content token (or prefix match on >=5 char token)
    if ta and tb:
        shared = ta & tb
        if not shared:
            has_prefix = any(
                (len(w1) >= 5 and len(w2) >= 5 and (w1.startswith(w2) or w2.startswith(w1)))
                for w1 in ta for w2 in tb
            )
            if not has_prefix:
                return float(fuzz.token_sort_ratio(na, nb)) * 0.7
    tsr = float(fuzz.token_sort_ratio(na, nb))
    tset = float(fuzz.token_set_ratio(na, nb))
    # Cap token_set_ratio contribution when lengths differ sharply so 1-word overlaps don't hit 90+
    len_ratio = min(len(na), len(nb)) / max(len(na), len(nb))
    weighted_set = tset * (0.65 + 0.35 * len_ratio)
    return max(tsr, weighted_set)


def load_kki_rows(path: Path, medium: str):
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            title = (r.get("Judul Komik yang Terbit di Indonesia")
                     or r.get("Judul Light Novel yang Terbit di Indonesia") or "").strip()
            if not title:
                continue
            raw_mu = (r.get("MangaUpdates") or "").strip()
            raw_pranala = (r.get("Pranala") or "").strip()
            clean_mu = sanitize_mu_url(raw_mu)
            clean_pranala = sanitize_http_url(raw_pranala)
            # If MangaUpdates column had a non-MU publisher/wiki URL and Pranala is empty, keep as reference note, not MU URL
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
                "mangaupdates_url": clean_mu or "",
                "pranala": clean_pranala or "",
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


def load_persistent_decisions() -> dict:
    """Load persistent human/automated review decisions keyed by 'sid::kkiTitle::kkiMedium'."""
    decisions = {}
    if DECISIONS_JSON.exists():
        try:
            decisions = json.loads(DECISIONS_JSON.read_text(encoding="utf-8"))
        except Exception:
            decisions = {}
    # Seed from legacy log if not yet imported
    for log_path in (LEGACY_LOG_JSON, KKI_DIR / "kki-review-queue.json"):
        if log_path.exists():
            try:
                for q in json.loads(log_path.read_text(encoding="utf-8")):
                    dec = q.get("reviewDecision")
                    if dec in ("MATCHED", "NOT_MATCH"):
                        key = f"{q.get('nuvelliteSeriesId')}::{q.get('kkiTitle')}::{q.get('kkiMedium')}"
                        decisions.setdefault(key, {
                            "nuvelliteSeriesId": q.get("nuvelliteSeriesId"),
                            "kkiTitle": q.get("kkiTitle"),
                            "kkiMedium": q.get("kkiMedium"),
                            "decision": dec,
                            "reviewedAt": q.get("reviewedAt") or "2026-10-12",
                        })
            except Exception:
                pass
    return decisions


def main():
    manga_rows = load_kki_rows(MANGA_CSV, "MANGA")
    ln_rows = load_kki_rows(LN_CSV, "LIGHT_NOVEL")
    print(f"KKI manga rows: {len(manga_rows)}, LN rows: {len(ln_rows)}")

    nuv_series = load_nuvellite_series()
    print(f"Nuvellite series: {len(nuv_series)}")

    for r in manga_rows + ln_rows:
        r["_norm"] = normalize(r["title"])
        r["_tokens"] = content_tokens(r["_norm"])

    enrichment = {}
    review_queue = []
    matched_kki_idx = set()

    decisions = load_persistent_decisions()
    rejected_pairs = {
        (d["nuvelliteSeriesId"], d["kkiTitle"], d["kkiMedium"])
        for d in decisions.values() if d.get("decision") == "NOT_MATCH"
    }
    approved_by_sid = {
        d["nuvelliteSeriesId"]: d
        for d in decisions.values() if d.get("decision") == "MATCHED"
    }

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

    # Apply approved decisions from persistent store into manual_keep
    for sid, dec in approved_by_sid.items():
        if sid in manual_keep:
            continue
        target_title = (dec.get("kkiTitle") or "").strip().lower()
        target_med = dec.get("kkiMedium")
        pool = manga_rows if target_med == "MANGA" else ln_rows
        for r in pool:
            if r["title"].strip().lower() == target_title:
                e = build_enrichment(r)
                e["matchScore"] = 100.0
                e["matchMethod"] = "manual"
                manual_keep[sid] = e
                break

    # Pre-mark manual_keep in matched_kki_idx BEFORE matching and BEFORE building unmatched!
    active_sids = {s["id"] for s in nuv_series}
    for sid, e in list(manual_keep.items()):
        if sid not in active_sids:
            continue
        enrichment[sid] = e
        kt = (e.get("kkiTitle") or "").strip().lower()
        for medium, pool in (("MANGA", manga_rows), ("LIGHT_NOVEL", ln_rows)):
            for i, r in enumerate(pool):
                if r["title"].strip().lower() == kt:
                    matched_kki_idx.add((medium, i))
                    break

    for s in nuv_series:
        sid = s["id"]
        if sid in enrichment:
            continue
        sname = s.get("name") or ""
        stype = s.get("type")
        snorm = normalize(sname)
        stokens = content_tokens(snorm)

        candidates = manga_rows if stype == "MANGA" else ln_rows
        other = ln_rows if stype == "MANGA" else manga_rows

        best = None
        for medium_label, pool in (("same", candidates), ("cross", other)):
            for i, r in enumerate(pool):
                if (sid, r["title"], r["medium"]) in rejected_pairs:
                    continue
                sc = score_titles(snorm, r["_norm"], stokens, r["_tokens"])
                if best is None or sc > best[0]:
                    best = (sc, r, i, r["medium"], medium_label == "cross")

        if best is None:
            continue
        sc, row, idx, medium, cross = best
        if sc < REVIEW_THRESHOLD:
            continue

        na, nb = snorm, row["_norm"]
        short_exact_only = min(len(na), len(nb)) <= 3 and na != nb

        asc = author_score(s.get("author") or "", row["author"])
        author_ok = asc < 0 or asc >= AUTHOR_THRESHOLD
        author_strong = asc >= AUTHOR_STRONG_THRESHOLD

        # If score < 90 and authors clearly conflict (< 60), it's a coincidental word overlap, not a review candidate
        if sc < AUTO_THRESHOLD and 0 <= asc < 60:
            continue

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
        else:
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

    # Unmatched KKI rows -> archive candidates.
    # Never drop KKI rows just because they appeared in review_queue!
    unmatched = []
    for medium, pool in (("MANGA", manga_rows), ("LIGHT_NOVEL", ln_rows)):
        for i, r in enumerate(pool):
            if (medium, i) in matched_kki_idx:
                continue
            r_out = {k: v for k, v in r.items() if not k.startswith("_")}
            unmatched.append(r_out)

    review_queue.sort(key=lambda q: -q["score"])

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(DATA_DIR / "kki-enrichment.json", "w", encoding="utf-8") as f:
        json.dump(enrichment, f, ensure_ascii=False, indent=1)
    with open(KKI_DIR / "kki-review-queue.json", "w", encoding="utf-8") as f:
        json.dump(review_queue, f, ensure_ascii=False, indent=1)
    with open(KKI_DIR / "kki-unmatched.json", "w", encoding="utf-8") as f:
        json.dump(unmatched, f, ensure_ascii=False, indent=1)
    with open(DECISIONS_JSON, "w", encoding="utf-8") as f:
        json.dump(decisions, f, ensure_ascii=False, indent=1)

    print(f"matched (enrichment): {len(enrichment)} (manual: {len(manual_keep)})")
    print(f"review queue: {len(review_queue)}")
    print(f"unmatched KKI rows (archive candidates): {len(unmatched)}")


if __name__ == "__main__":
    main()