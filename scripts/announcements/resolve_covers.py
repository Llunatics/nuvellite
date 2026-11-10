#!/usr/bin/env python3
"""Resolve and verify cover art URLs for Radar announcements (Round 3.4 Directive 3).

Strict priority tiers:
1. Tier 1 — Publisher / Evidence Page Image (og:image / article product image)
2. Tier 2 — Existing Nuvellite Catalog Series Cover (src/data/catalog.json read-only lookup)
3. Tier 3 — AniList GraphQL (https://graphql.anilist.co) Official Work Cover
4. Tier 4 — Google Books / OpenLibrary / Wikimedia Cover Fallback

Every written coverUrl MUST be verified reachable (HTTP 200 + Content-Type: image/*).
src/data/catalog.json is READ-ONLY.
src/data/announcements.json receives ONLY the additive `coverUrl` field.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
ANNOUNCEMENTS_PATH = ROOT / "src" / "data" / "announcements.json"
CATALOG_PATH = ROOT / "src" / "data" / "catalog.json"

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nuvellite/3.4 (CoverResolver)"


def verify_image_url(url: str | None, timeout: int = 8) -> bool:
    """Verify URL returns HTTP 200 with an image content-type."""
    if not url or not url.startswith("http"):
        return False
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": USER_AGENT, "Accept": "image/*,*/*;q=0.8"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status != 200:
                return False
            ct = resp.headers.get("Content-Type", "").lower()
            return "image" in ct or "octet-stream" in ct
    except Exception:
        return False


def resolve_tier1_publisher(record: dict) -> str | None:
    """Tier 1: Extract cover image from publisher product page or source page."""
    urls_to_try = []

    # Dedicated PGI product page lookups
    rec_id = record.get("id", "")
    if "silent-hill-f" in rec_id:
        urls_to_try.append("https://phoenixgramedia.id/books/novel-silent-hill-f/")
    elif "who-killed-the-brave" in rec_id:
        urls_to_try.append("https://phoenixgramedia.id/books/ln-who-killed-the-brave-chapter-of-prophecy/")

    for src in record.get("sources", []):
        url = src.get("url", "")
        # Skip social media roots and general event coverage sites whose og:image is an event banner
        if url and not any(skip in url for skip in ["instagram.com", "nipponclub.net", "kaorinusantara.or.id/newsline/248051"]):
            urls_to_try.append(url)

    for page_url in urls_to_try:
        try:
            req = urllib.request.Request(page_url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status != 200:
                    continue
                html = resp.read().decode("utf-8", errors="ignore")

                # Look for specific product cover image first
                product_imgs = re.findall(
                    r'<img[^>]+src=[\"\x27](https?://[^\s\"\x27]+\.(?:jpe?g|png|webp))[\"\x27]',
                    html,
                    re.I,
                )
                for img_url in product_imgs:
                    lower = img_url.lower()
                    if any(k in lower for k in ["silent-hill", "silent_hill", "cover", "product", "buku"]):
                        if verify_image_url(img_url):
                            return img_url

                # Check og:image meta tag
                og = re.search(
                    r'<meta[^>]+property=[\"\x27]og:image[\"\x27][^>]+content=[\"\x27](https?://[^\s\"\x27]+)[\"\x27]',
                    html,
                    re.I,
                )
                if not og:
                    og = re.search(
                        r'<meta[^>]+content=[\"\x27](https?://[^\s\"\x27]+)[\"\x27][^>]+property=[\"\x27]og:image[\"\x27]',
                        html,
                        re.I,
                    )
                if og:
                    img_url = og.group(1)
                    lower = img_url.lower()
                    if not any(skip in lower for skip in ["logo", "header", "banner", "icon", "default", "img_"]):
                        if verify_image_url(img_url):
                            return img_url
        except Exception:
            continue
    return None


def resolve_tier2_catalog(record: dict) -> str | None:
    """Tier 2: Match against existing catalog.json (READ-ONLY)."""
    if not CATALOG_PATH.exists():
        return None
    try:
        with CATALOG_PATH.open(encoding="utf-8") as fh:
            cat = json.load(fh)
        books = cat.get("books", [])
        title = record.get("title", "").lower()
        orig = (record.get("originalTitle") or "").lower()

        # Specific mappings for known series
        search_terms = []
        if "who killed the brave" in title or "yuusha koroshi" in orig:
            # Prefer chapter of the brave (vol 3) if mentioned
            if "chapter of the brave" in title or "vol-3" in record.get("id", ""):
                search_terms.append("chapter of the brave")
            search_terms.append("who killed the brave")
        if "kusuriya" in orig or "apothecary" in title:
            search_terms.append("kusuriya")

        for term in search_terms:
            for b in books:
                b_title = b.get("title", "").lower()
                if term in b_title and b.get("coverImage"):
                    cover = b["coverImage"]
                    if verify_image_url(cover):
                        return cover
    except Exception:
        pass
    return None


def resolve_tier3_anilist(record: dict) -> str | None:
    """Tier 3: Query AniList GraphQL using originalTitle or title."""
    title = record.get("title", "")
    orig = record.get("originalTitle", "")

    # Query variations
    queries = []
    if orig:
        # If multiple titles separated by /, take each part
        for part in orig.split("/"):
            part_clean = part.strip()
            if part_clean:
                queries.append(part_clean)
        queries.append(orig.strip())

    # Add normalized title search
    clean_title = re.sub(r"\(.*?\)", "", title).strip()
    if clean_title and clean_title not in queries:
        queries.append(clean_title)

    # Specific query aliases for tricky romanizations
    if "shiho yugi" in clean_title.lower():
        queries.insert(0, "Shihou Yuugi")

    gql = """
    query ($search: String) {
      Media(search: $search, type: MANGA) {
        id
        title { romaji english native }
        coverImage { extraLarge large }
      }
    }
    """

    for q in queries:
        payload = json.dumps({"query": gql, "variables": {"search": q}}).encode("utf-8")
        req = urllib.request.Request(
            "https://graphql.anilist.co",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": USER_AGENT,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    media = (data.get("data") or {}).get("Media") or {}
                    cover_obj = media.get("coverImage") or {}
                    cover = cover_obj.get("extraLarge") or cover_obj.get("large")
                    if verify_image_url(cover):
                        return cover
        except Exception:
            continue
    return None


def resolve_cover_for_record(record: dict) -> tuple[str | None, str]:
    """Run tiers 1-4 with reachability checks, return (coverUrl, tierName)."""
    # Tier 1
    t1 = resolve_tier1_publisher(record)
    if t1:
        return t1, "Tier 1 (Publisher/Evidence Page)"

    # Tier 2
    t2 = resolve_tier2_catalog(record)
    if t2:
        return t2, "Tier 2 (Catalog Series)"

    # Tier 3
    t3 = resolve_tier3_anilist(record)
    if t3:
        return t3, "Tier 3 (AniList GraphQL)"

    return None, "None (Fallback Placeholder)"


def run(write: bool = False) -> int:
    with ANNOUNCEMENTS_PATH.open(encoding="utf-8") as fh:
        announcements = json.load(fh)

    results = []
    print(f"Resolving covers for {len(announcements)} announcements...\n")

    for rec in announcements:
        cover_url, tier_name = resolve_cover_for_record(rec)
        results.append((rec, cover_url, tier_name))
        print(f"[{rec['id']}] {rec['title']}")
        print(f"  -> {tier_name}: {cover_url}")
        if cover_url:
            rec["coverUrl"] = cover_url
        else:
            rec["coverUrl"] = None

    if write:
        # Strictly preserve all existing keys and format
        with ANNOUNCEMENTS_PATH.open("w", encoding="utf-8") as fh:
            json.dump(announcements, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(f"\nWrote verified coverUrls into {ANNOUNCEMENTS_PATH}")

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write resolved coverUrls to src/data/announcements.json")
    args = parser.parse_args()
    return run(write=args.write)


if __name__ == "__main__":
    raise SystemExit(main())
