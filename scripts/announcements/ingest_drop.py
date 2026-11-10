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


PUBLISHERS = {
    "pgi": ("pub_pgi", "PGI"),
    "mnc": ("pub_mnc", "m&c!"),
    "elex": ("pub_elex", "Elex Media"),
}
HASH_REGISTRY_PATH = HERE / "processed-images.json"


def _slugify(text: str) -> str:
    return normalize_series_name(text)


def build_candidate(
    *,
    title: str,
    publisher_key: str,
    category: str,
    confidence: float,
    url: str | None,
    event: str | None,
    author: str | None = None,
    original_title: str | None = None,
    cover_image: str | None = None,
    release_text: str | None = None,
    evidence_note: str | None = None,
) -> dict:
    publisher_id, short_name = PUBLISHERS[publisher_key]
    slug = _slugify(title)
    today = date.today().isoformat()
    source = {
        "id": f"src_drop_{slug}"[:64],
        "tier": "TIER_3_COMMUNITY_EVENT",
        "sourceLabel": "Manual drop (ingest_drop.py)",
        "url": url or "",
        "observedAt": today,
        "evidenceKind": "STAGE_SLIDE",
        "evidenceNote": evidence_note or "Dropped via ingest_drop.py CLI",
    }
    return {
        "id": f"ann_{publisher_id.removeprefix('pub_')}_{slug}"[:80],
        "slug": slug,
        "title": title,
        "originalTitle": original_title,
        "authors": [author] if author else [],
        "publisherId": publisher_id,
        "publisherShortName": short_name,
        "category": category,
        "editionKind": "REGULAR",
        "state": "SPOTTED",
        "confidence": confidence,
        "eventOrCampaign": event,
        "expectedReleaseWindow": release_text,
        "coverImage": cover_image,
        "firstSeenAt": today,
        "lastUpdatedAt": today,
        "sources": [source] if url else [],
    }


def run_drop(args) -> int:
    """One-off drop assembly: image/title -> extract -> resolve -> merge.

    a) dHash the image and check the local hash registry: a near-duplicate
       of an already-processed image appends its source to the existing
       record instead of re-running extraction.
    b) Slice + Gemini-extract when an API key is configured; otherwise fall
       back to the manual --title override.
    c) Resolve AniList aliases per candidate, then merge_candidate routes
       each record to announcements.json or the human-confirm queue.
    """
    sys.path.insert(0, str(HERE))
    import vision_extractor

    if not args.title and not args.image:
        print("error: a drop needs --title and/or --image", file=sys.stderr)
        return 2

    registry: dict = load_json(HASH_REGISTRY_PATH, {})
    if args.image:
        image_hash = vision_extractor.dhash(args.image)
        for known_hash, record_id in registry.items():
            if vision_extractor.hamming_distance(image_hash, int(known_hash)) <= (
                vision_extractor.HAMMING_DEDUPE_THRESHOLD
            ):
                print(f"duplicate image (hamming<={vision_extractor.HAMMING_DEDUPE_THRESHOLD}) "
                      f"of {record_id}; skipping extraction")
                return 0
        registry[str(image_hash)] = args.title or "pending"

    candidates: list[dict] = []
    extraction_status = "manual"
    if args.image and not args.title:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            tiles = vision_extractor.ocr_gate_and_slice(args.image, tmp)
            extraction = vision_extractor.vision_extract(tiles, args.caption or "")
        extraction_status = extraction.get("status", "error")
        if extraction_status == "ok":
            for cand in vision_extractor.expand_and_resolve(extraction):
                candidates.append(
                    build_candidate(
                        title=cand["title"],
                        publisher_key=args.publisher,
                        category="Light Novel" if cand.get("formatHint") == "Light Novel" else "Manga",
                        confidence=cand["confidence"],
                        url=args.url,
                        event=args.event,
                        author=cand.get("author"),
                        original_title=cand.get("originalTitle"),
                        cover_image=cand.get("coverImage"),
                        release_text=cand.get("targetReleaseText"),
                        evidence_note=cand.get("visualEvidence"),
                    )
                )
    if not candidates:
        # Offline / no-key path (or explicit manual title): resolve aliases
        # (graceful None offline) and build a single candidate. Default
        # confidence is low on purpose — it routes to the review queue.
        aliases = vision_extractor.resolve_work_aliases(
            args.title or "",
            medium="LIGHT_NOVEL" if args.category == "Light Novel" else "MANGA",
        )
        candidates.append(
            build_candidate(
                title=args.title or "Untitled drop",
                publisher_key=args.publisher,
                category=args.category,
                confidence=args.confidence,
                url=args.url,
                event=args.event,
                author=args.author,
                original_title=aliases.get("romaji"),
                cover_image=aliases.get("coverImage"),
                evidence_note=f"Manual drop; extraction={extraction_status}",
            )
        )

    for candidate in candidates:
        outcome = merge_candidate(candidate)
        print(f"drop {candidate['id']}: {outcome} (confidence {candidate['confidence']})")
    save_json(HASH_REGISTRY_PATH, registry)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", help="Source post URL for a manual drop")
    parser.add_argument("--image", help="Local image path (stage photo / PDKT teaser)")
    parser.add_argument("--title", help="Manual title override (offline drops)")
    parser.add_argument("--publisher", choices=sorted(PUBLISHERS), default="pgi")
    parser.add_argument("--category", choices=("Manga", "Light Novel"), default="Manga")
    parser.add_argument("--event", help="Event/campaign label, e.g. 'Comifuro 23'")
    parser.add_argument("--author", help="Author/illustrator name")
    parser.add_argument("--caption", help="Post caption accompanying an image drop")
    parser.add_argument("--confidence", type=float, default=0.5)
    parser.add_argument("--poll", action="store_true", help="Run the scheduled polling pass")
    args = parser.parse_args()

    if args.poll:
        return run_poll()
    if not args.url and not args.image and not args.title:
        parser.error("provide --url, --image, --title, or --poll")
    return run_drop(args)


if __name__ == "__main__":
    raise SystemExit(main())
