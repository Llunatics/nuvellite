#!/usr/bin/env python3
"""
Split catalog.json into optimized variants:
- catalog-listing.json: Data for card/grid views, search (including ISBN & originalTitle),
  and genre recommendations. Strips heavy narrative synopsis and folded variant metadata.
"""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
CATALOG_PATH = os.path.join(PROJECT_ROOT, "src", "data", "catalog.json")
LISTING_PATH = os.path.join(PROJECT_ROOT, "src", "data", "catalog-listing.json")

LISTING_BOOK_FIELDS = [
    "id",
    "slug",
    "title",
    "originalTitle",
    "isbn13",
    "volume",
    "category",
    "format",
    "publisherId",
    "publisherName",
    "publisherShortName",
    "imprint",
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
    "isBindUp",
    "bindUpKind",
    "bindUpLabel",
    "authors",
    "genres",
    "classificationStatus",
    "gramediaUrl",
]


def split_catalog():
    if not os.path.exists(CATALOG_PATH):
        print(f"ERROR: catalog.json not found at {CATALOG_PATH}")
        sys.exit(1)

    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            catalog = json.load(f)
    except Exception as e:
        print(f"ERROR: Failed to load catalog JSON at {CATALOG_PATH}: {e}")
        sys.exit(1)

    full_size = os.path.getsize(CATALOG_PATH)
    books = catalog.get("books", [])
    series = catalog.get("series", [])
    publishers = catalog.get("publishers", [])

    listing_books = []
    for idx, book in enumerate(books):
        try:
            if not isinstance(book, dict):
                print(f"WARNING: Skipping malformed book record at index {idx}: {book}")
                continue
            listing_book = {}
            for field in LISTING_BOOK_FIELDS:
                # Keep explicit nulls (e.g. volume: null for one-shots): the
                # frontend Book type is `number | null`, and dropping the key
                # surfaces `undefined` instead, breaking that contract.
                if field in book:
                    listing_book[field] = book[field]
            listing_books.append(listing_book)
        except Exception as err:
            offending_id = book.get("id") if isinstance(book, dict) else f"index_{idx}"
            print(f"ERROR: Processing failure on book {offending_id}: {err}")
            sys.exit(1)

    book_ids = {b["id"] for b in listing_books if "id" in b}
    clean_snapshots = [
        s for s in catalog.get("priceSnapshots", [])
        if s.get("bookId") in book_ids
    ]

    listing_catalog = {
        "version": catalog.get("version", "1.1.0"),
        "lastUpdated": catalog.get("lastUpdated", ""),
        "publishers": publishers,
        "books": listing_books,
        "series": series,
        "priceSnapshots": clean_snapshots,
    }

    with open(LISTING_PATH, "w", encoding="utf-8") as f:
        json.dump(listing_catalog, f, ensure_ascii=False, indent=2)

    listing_size = os.path.getsize(LISTING_PATH)
    reduction = ((full_size - listing_size) / full_size) * 100 if full_size else 0

    print(f"✓ Split catalog complete")
    print(f"  Full catalog:    {full_size / 1024 / 1024:.1f} MB ({len(books)} books)")
    print(f"  Listing catalog: {listing_size / 1024 / 1024:.1f} MB")
    print(f"  Reduction:       {reduction:.0f}%")
    print(f"  Output: {LISTING_PATH}")


if __name__ == "__main__":
    split_catalog()