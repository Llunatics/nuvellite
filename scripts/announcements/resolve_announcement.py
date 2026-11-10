#!/usr/bin/env python3
"""Resolve a queued Radar Lisensi announcement (Round 2 S5.6).

Usage:
    python3 scripts/announcements/resolve_announcement.py --approve <id>
    python3 scripts/announcements/resolve_announcement.py --reject <id>

Decisions are persisted in scripts/announcements/announcements-decisions.json
(same permanent-decision pattern as the KKI sync): a rejected id is never
re-queued, an approved id is promoted by the next ingest run. The queue entry
is removed either way. This tool never touches src/data/catalog.json.
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
QUEUE_PATH = HERE / "review-queue.json"
DECISIONS_PATH = HERE / "announcements-decisions.json"


def load_json(path: Path, default):
    if not path.exists():
        return default
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def save_json(path: Path, payload) -> None:
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--approve", metavar="ID", help="Approve the queued announcement id")
    group.add_argument("--reject", metavar="ID", help="Reject the queued announcement id")
    args = parser.parse_args()

    target_id = args.approve or args.reject
    decision = "approved" if args.approve else "rejected"

    queue = load_json(QUEUE_PATH, [])
    remaining = [item for item in queue if item.get("id") != target_id]
    if len(remaining) == len(queue):
        print(f"error: id {target_id!r} not found in review queue", file=sys.stderr)
        return 1

    decisions = load_json(DECISIONS_PATH, {})
    decisions[target_id] = {"decision": decision, "decidedAt": date.today().isoformat()}
    save_json(DECISIONS_PATH, decisions)
    save_json(QUEUE_PATH, remaining)
    print(f"{decision}: {target_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
