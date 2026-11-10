#!/usr/bin/env python3
"""Ingest one announcement drop into the Radar Lisensi tracker (Round 2 S5).

Usage:
    python3 scripts/announcements/ingest_drop.py --url <post-url> [--image <path>]
    python3 scripts/announcements/ingest_drop.py --poll

Deterministic parts implemented here:
  * clusterKey dedupe (S5.5) against src/data/announcements.json — a repeat
    sighting appends its source to the existing record and can upgrade
    SPOTTED -> CORROBORATED, never creates a duplicate card;
  * human-confirm routing (S5.6): extractions with confidence < 0.85, or a
    SPOTTED record from a single uncorroborated Tier 3 source, are written
    to review-queue.json instead of announcements.json;
  * health ledger writes to src/data/announcements-health.json with adapter
    failure isolation.

The polling adapters live in wikipedia_adapter.py, kaori_adapter.py and
perpusnas_adapter.py; the vision pipeline in vision_extractor.py. This
script NEVER writes src/data/catalog.json and never invokes
repair-catalog.py.
"""

import argparse
import json
import re
import sys
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
ANNOUNCEMENTS_PATH = ROOT / "src" / "data" / "announcements.json"
HEALTH_PATH = ROOT / "src" / "data" / "announcements-health.json"
QUEUE_PATH = HERE / "review-queue.json"
DECISIONS_PATH = HERE / "announcements-decisions.json"

REVIEW_CONFIDENCE_THRESHOLD = 0.85


def load_json(path: Path, default):
    if not path.exists():
        return default
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def save_json(path: Path, payload) -> None:
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def normalize_series_name(name: str) -> str:
    """Python mirror of normalizeSeriesName in src/lib/series-consistency.ts."""
    text = unicodedata.normalize("NFKD", name or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return text


def cluster_key(publisher_id: str, medium: str, edition_type: str,
                canonical_title: str, anilist_id=None, volume=None) -> str:
    work = anilist_id if anilist_id else normalize_series_name(canonical_title)
    return f"{publisher_id}__{medium}{edition_type}{work}__vol_{volume if volume is not None else 'series'}"


def record_cluster_key(record: dict) -> str:
    medium = "LIGHT_NOVEL" if record.get("category") == "Light Novel" else "MANGA"
    return cluster_key(
        record.get("publisherId", ""),
        medium,
        record.get("editionKind", "REGULAR"),
        record.get("title", ""),
    )


def needs_review(record: dict) -> bool:
    if record.get("confidence", 0) < REVIEW_CONFIDENCE_THRESHOLD:
        return True
    sources = record.get("sources", [])
    return (
        record.get("state") == "SPOTTED"
        and len(sources) == 1
        and sources[0].get("tier") == "TIER_3_COMMUNITY_EVENT"
    )


def merge_candidate(candidate: dict) -> str:
    """Merge a candidate record; returns 'queued', 'appended', or 'upgraded'."""
    decisions = load_json(DECISIONS_PATH, {})
    if decisions.get(candidate["id"], {}).get("decision") == "rejected":
        return "queued"  # permanently rejected ids never re-enter

    announcements = load_json(ANNOUNCEMENTS_PATH, [])
    key = record_cluster_key(candidate)
    for existing in announcements:
        if record_cluster_key(existing) != key:
            continue
        known_urls = {s.get("url") for s in existing.get("sources", [])}
        added = [s for s in candidate.get("sources", []) if s.get("url") not in known_urls]
        if added:
            existing.setdefault("sources", []).extend(added)
            existing["lastUpdatedAt"] = date.today().isoformat()
            tiers = {s.get("tier") for s in existing["sources"]}
            if existing.get("state") == "SPOTTED" and (
                len(existing["sources"]) >= 2 or "TIER_1B_OFFICIAL_SOCIAL" in tiers
            ):
                existing["state"] = "CORROBORATED"
                save_json(ANNOUNCEMENTS_PATH, announcements)
                return "upgraded"
            save_json(ANNOUNCEMENTS_PATH, announcements)
            return "appended"
        return "appended"

    if needs_review(candidate):
        queue = load_json(QUEUE_PATH, [])
        if candidate["id"] not in {item.get("id") for item in queue}:
            queue.append(candidate)
            save_json(QUEUE_PATH, queue)
        return "queued"

    announcements.append(candidate)
    save_json(ANNOUNCEMENTS_PATH, announcements)
    return "appended"


def run_poll() -> int:
    """Scheduled polling entry point (GitHub Actions, S5.6).

    Runs the implemented Tier 1A/2 adapters with failure isolation: each
    adapter reports its own status ("ok" / "offline_in_build_env" /
    "error") into the health ledger, and one dead source never blocks the
    others. Sightings are printed for the Actions log; turning sightings
    into announcement records goes through merge_candidate (dedupe +
    human-confirm queue) once an adapter's extraction is verified.
    """
    sys.path.insert(0, str(HERE))
    import kaori_adapter
    import perpusnas_adapter
    import wikipedia_adapter

    runners = {
        "tier1a_perpusnas_isbn": perpusnas_adapter.run,
        "tier2_kaori_rss": kaori_adapter.run,
        "tier2_wikipedia_id_diff": wikipedia_adapter.run,
    }
    health = load_json(HEALTH_PATH, {"adapters": []})
    now = datetime.now(timezone.utc).isoformat()
    by_id = {a.get("id"): a for a in health.get("adapters", [])}
    for adapter_id, runner in runners.items():
        try:
            outcome = runner()
            status = outcome.get("status", "error")
            sightings = outcome.get("sightings", [])
        except Exception as exc:  # failure isolation, belt and braces
            status, sightings = "error", []
            outcome = {"error": str(exc)}
        entry = by_id.setdefault(adapter_id, {"id": adapter_id, "consecutiveFailures": 0})
        entry["lastRunAt"] = now
        entry["lastStatus"] = status
        entry["lastSightings"] = len(sightings)
        entry["consecutiveFailures"] = (
            0 if status == "ok" else int(entry.get("consecutiveFailures", 0)) + 1
        )
        print(f"poll {adapter_id}: {status} ({len(sightings)} sightings)")
    health["adapters"] = list(by_id.values())
    health["lastRunAt"] = now
    save_json(HEALTH_PATH, health)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", help="Source post URL for a manual drop")
    parser.add_argument("--image", help="Local image path (stage photo / PDKT teaser)")
    parser.add_argument("--poll", action="store_true", help="Run the scheduled polling pass")
    args = parser.parse_args()

    if args.poll:
        return run_poll()
    if not args.url and not args.image:
        parser.error("provide --url, --image, or --poll")
    # The building blocks exist (adapters + vision_extractor + the
    # merge_candidate dedupe/queue logic above); assembling the one-off
    # drop path (fetch post -> vision_extract -> candidate -> merge) is
    # the remaining wiring step.
    print("drop ingestion: building blocks ready; drop assembly not wired yet")
    print(f"  url={args.url!r} image={args.image!r}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
