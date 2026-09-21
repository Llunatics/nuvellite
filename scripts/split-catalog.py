#!/usr/bin/env python3
"""
Split catalog.json into optimized variants:
- catalog-listing.json: Lightweight data for card/grid views (~1.4 MB vs ~9 MB)
  Strips: synopsis, gramediaUrl, classificationReason, classificationConfidence,
          availableEditions, originalTitle, isbn13, genres, format, source*, normalized*,
          and other detail-only fields.

The full catalog.json is still used for book detail pages (server-side only).

Usage:
    python3 scripts/split-catalog.py
"""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
CATALOG_PATH = os.path.join(PROJECT_ROOT, "src", "data", "catalog.json")
LISTING_PATH = os.path.join(PROJECT_ROOT, "src", "data", "catalog-listing.json")

# Fields to keep for listing/card views
LISTING_BOOK_FIELDS = {
    "id",
    "slug",
    "title",
    "volume",
    "category",
    "publisherId",
    "publisherName",
    "publisherShortName",
    "coverImage",
    "status",
    "availability",
    "currentPrice",
    "originalPrice",
    "releaseDate",
    "isWednesdayRelease",
    "seriesId",
    "seriesName",
    "isSetVariant",
    "authors",
    "classificationStatus",
    "gramediaUrl",
}


def split_catalog():
    if not os.path.exists(CATALOG_PATH):
        print(f"ERROR: catalog.json not found at {CATALOG_PATH}")
        sys.exit(1)

    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    full_size = os.path.getsize(CATALOG_PATH)
    books = catalog.get("books", [])
    series = catalog.get("series", [])
    publishers = catalog.get("publishers", [])

    # Build listing books - only fields needed for card rendering
    listing_books = []
    for book in books:
        listing_book = {}
        for field in LISTING_BOOK_FIELDS:
            if field in book:
                listing_book[field] = book[field]
        listing_books.append(listing_book)

    listing_catalog = {
        "version": catalog.get("version", "1.0"),
        "lastUpdated": catalog.get("lastUpdated", ""),
        "publishers": publishers,
        "books": listing_books,
        "series": series,
    }

    with open(LISTING_PATH, "w", encoding="utf-8") as f:
        json.dump(listing_catalog, f, ensure_ascii=False, separators=(",", ":"))

    listing_size = os.path.getsize(LISTING_PATH)
    reduction = ((full_size - listing_size) / full_size) * 100

    print(f"✓ Split catalog complete")
    print(f"  Full catalog:    {full_size / 1024 / 1024:.1f} MB ({len(books)} books)")
    print(f"  Listing catalog: {listing_size / 1024 / 1024:.1f} MB")
    print(f"  Reduction:       {reduction:.0f}%")
    print(f"  Output: {LISTING_PATH}")


if __name__ == "__main__":
    split_catalog()
