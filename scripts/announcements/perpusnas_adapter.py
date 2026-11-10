#!/usr/bin/env python3
"""Tier 1A adapter: Perpusnas ISBN registrations (S5.2).

Publishers register title, volume structure, translator and page count
with the Perpusnas RI ISBN portal weeks or months before a book reaches
Gramedia.com. A verified 13-digit ISBN is the only signal that promotes
an announcement to DATED_ISBN (S5.4), so this adapter extracts ISBN-13s
and their neighbouring titles from the portal's search result HTML
(stdlib html.parser — no third-party dependencies).

Offline behaviour: any URLError -> status "offline_in_build_env".
"""

import re
import urllib.parse
from html.parser import HTMLParser

try:
    from http_util import OfflineError, fetch_text, result
except ImportError:
    from scripts.announcements.http_util import OfflineError, fetch_text, result  # type: ignore

ADAPTER_ID = "tier1a_perpusnas_isbn"
SEARCH_URL = "https://isbn.perpusnas.go.id/landing_page/search"
PUBLISHER_QUERIES = ("Phoenix Gramedia Indonesia", "Elex Media Komputindo", "M&C")

ISBN13_RE = re.compile(r"\b(97[89][-\d]{10,16})\b")


def normalize_isbn(raw: str) -> str:
    return re.sub(r"[^0-9]", "", raw or "")


def is_valid_isbn13(raw: str) -> bool:
    digits = normalize_isbn(raw)
    if len(digits) != 13 or not digits.startswith(("978", "979")):
        return False
    total = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(digits[:12]))
    return (10 - (total % 10)) % 10 == int(digits[12])


class _RowTextExtractor(HTMLParser):
    """Collects the text of each table row / list item as one string."""

    def __init__(self) -> None:
        super().__init__()
        self.rows: list[str] = []
        self._depth = 0
        self._buffer: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ("tr", "li"):
            if self._depth == 0:
                self._buffer = []
            self._depth += 1

    def handle_endtag(self, tag):
        if tag in ("tr", "li") and self._depth > 0:
            self._depth -= 1
            if self._depth == 0:
                text = " ".join(" ".join(self._buffer).split())
                if text:
                    self.rows.append(text)

    def handle_data(self, data):
        if self._depth > 0:
            self._buffer.append(data)


def parse_isbn_results(html_text: str) -> list[dict]:
    """Extract {isbn13, title} pairs from Perpusnas search-result HTML."""
    extractor = _RowTextExtractor()
    extractor.feed(html_text or "")
    found: list[dict] = []
    seen: set[str] = set()
    for row in extractor.rows:
        for match in ISBN13_RE.finditer(row):
            isbn = normalize_isbn(match.group(1))
            if not is_valid_isbn13(isbn) or isbn in seen:
                continue
            seen.add(isbn)
            title = row[: match.start()].strip(" -–—:|") or row[match.end():].strip(" -–—:|")
            found.append({"isbn13": isbn, "title": title[:160]})
    return found


def run(queries: tuple[str, ...] = PUBLISHER_QUERIES) -> dict:
    sightings = []
    try:
        for query in queries:
            url = f"{SEARCH_URL}?{urllib.parse.urlencode({'q': query})}"
            for item in parse_isbn_results(fetch_text(url)):
                sightings.append(
                    {
                        "title": item["title"] or query,
                        "url": url,
                        "observedAt": "",
                        "isbn13": item["isbn13"],
                        "evidenceNote": f"Registrasi ISBN Perpusnas ({query})",
                    }
                )
    except OfflineError as exc:
        return result(ADAPTER_ID, "offline_in_build_env", error=str(exc))
    except Exception as exc:  # failure isolation
        return result(ADAPTER_ID, "error", error=str(exc))
    return result(ADAPTER_ID, "ok", sightings)


if __name__ == "__main__":
    print(run())
