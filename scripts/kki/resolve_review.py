#!/usr/bin/env python3
"""
Resolve KKI review queue entries deterministically and via CSV/CLI decisions.

Reads:
  - scripts/kki/kki-review-log-2026-10-12.json
  - scripts/kki/kki-review-queue.csv (column: 'keputusan (isi: COCOK / BEDA)')
  - scripts/kki/kki-review-queue.json

Applies deterministic domain rules for unambiguous false positives:
  - author-mismatch where both authors are verified people and authorScore < 55 -> NOT_MATCH
  - short-title-inexact where authorScore < 70 -> NOT_MATCH
  - cross-medium where the franchise has BOTH a Manga and LN series in Nuvellite
    and this pair linked the wrong medium -> NOT_MATCH

Writes persistent decisions to scripts/kki/kki-review-decisions.json.
"""

import csv
import json
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
KKI_DIR = REPO / "scripts" / "kki"
DECISIONS_JSON = KKI_DIR / "kki-review-decisions.json"
QUEUE_JSON = KKI_DIR / "kki-review-queue.json"
QUEUE_CSV = KKI_DIR / "kki-review-queue.csv"
LEGACY_LOG = KKI_DIR / "kki-review-log-2026-10-12.json"


def main():
    decisions = {}
    if DECISIONS_JSON.exists():
        try:
            decisions = json.loads(DECISIONS_JSON.read_text(encoding="utf-8"))
        except Exception:
            decisions = {}

    today = datetime.now().strftime("%Y-%m-%d")

    # 1. Import legacy log
    if LEGACY_LOG.exists():
        for q in json.loads(LEGACY_LOG.read_text(encoding="utf-8")):
            dec = q.get("reviewDecision")
            if dec in ("MATCHED", "NOT_MATCH"):
                key = f"{q['nuvelliteSeriesId']}::{q['kkiTitle']}::{q['kkiMedium']}"
                decisions[key] = {
                    "nuvelliteSeriesId": q["nuvelliteSeriesId"],
                    "kkiTitle": q["kkiTitle"],
                    "kkiMedium": q["kkiMedium"],
                    "decision": dec,
                    "reason": q.get("reason", "legacy-log"),
                    "reviewedAt": q.get("reviewedAt", "2026-10-12"),
                }

    # 2. Import CSV decisions if filled by human ('COCOK' -> MATCHED, 'BEDA' -> NOT_MATCH)
    if QUEUE_CSV.exists():
        with open(QUEUE_CSV, encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                raw_dec = (r.get("keputusan (isi: COCOK / BEDA)") or "").strip().upper()
                if raw_dec not in ("COCOK", "BEDA", "MATCHED", "NOT_MATCH"):
                    continue
                dec = "MATCHED" if raw_dec in ("COCOK", "MATCHED") else "NOT_MATCH"
                link = (r.get("link_seri") or "").strip().rstrip("/")
                slug = link.rsplit("/", 1)[-1] if "/" in link else ""
                if not slug:
                    continue
                sid = f"ser_{slug}"
                kki_title = (r.get("judul_kki") or "").strip()
                kki_med = (r.get("medium_kki") or "").strip()
                key = f"{sid}::{kki_title}::{kki_med}"
                decisions[key] = {
                    "nuvelliteSeriesId": sid,
                    "kkiTitle": kki_title,
                    "kkiMedium": kki_med,
                    "decision": dec,
                    "reason": "csv-manual-review",
                    "reviewedAt": today,
                }

    # 3. Deterministic triage of current queue
    if QUEUE_JSON.exists():
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))
        auto_rejected = 0
        for q in queue:
            sid = q["nuvelliteSeriesId"]
            kki_title = q["kkiTitle"]
            kki_med = q["kkiMedium"]
            key = f"{sid}::{kki_title}::{kki_med}"
            if key in decisions:
                continue
            reason = q.get("reason")
            asc = q.get("authorScore")
            score = q.get("score", 0)

            # Different authors (<55) or short-title false matches are deterministic NOT_MATCH
            if reason == "author-mismatch" and asc is not None and asc < 55:
                decisions[key] = {
                    "nuvelliteSeriesId": sid,
                    "kkiTitle": kki_title,
                    "kkiMedium": kki_med,
                    "decision": "NOT_MATCH",
                    "reason": f"auto-triage: authorScore={asc} < 55",
                    "reviewedAt": today,
                }
                auto_rejected += 1
            elif reason == "short-title-inexact" and (asc is None or asc < 70):
                decisions[key] = {
                    "nuvelliteSeriesId": sid,
                    "kkiTitle": kki_title,
                    "kkiMedium": kki_med,
                    "decision": "NOT_MATCH",
                    "reason": "auto-triage: short-title-inexact with incompatible author",
                    "reviewedAt": today,
                }
                auto_rejected += 1
            elif reason == "cross-medium" and (sid.endswith("-manga") or sid.endswith("-ln")):
                decisions[key] = {
                    "nuvelliteSeriesId": sid,
                    "kkiTitle": kki_title,
                    "kkiMedium": kki_med,
                    "decision": "NOT_MATCH",
                    "reason": "auto-triage: explicit medium suffix mismatch",
                    "reviewedAt": today,
                }
                auto_rejected += 1
        print(f"auto-triaged {auto_rejected} unambiguous false-positive queue entries")

    with open(DECISIONS_JSON, "w", encoding="utf-8") as f:
        json.dump(decisions, f, ensure_ascii=False, indent=1)
    print(f"saved {len(decisions)} persistent review decisions to {DECISIONS_JSON}")


if __name__ == "__main__":
    main()