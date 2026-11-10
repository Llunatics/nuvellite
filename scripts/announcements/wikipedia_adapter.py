#!/usr/bin/env python3
"""Tier 2 adapter: Indonesian Wikipedia publisher-page revision watch (S5.2).

Community editors update the Phoenix Gramedia Indonesia and Elex Media
Komputindo pages within hours of convention stage panels, so a revision
diff is an early corroborating signal. This adapter fetches the newest
revisions of the watched pages and extracts candidate work titles from
the added lines of the latest diff (wikitext bold/italic titles).

Offline behaviour: any URLError -> status "offline_in_build_env".
"""

import re
import urllib.parse

try:
    from http_util import OfflineError, fetch_json, result
except ImportError:  # imported as part of a package-less script dir
    from scripts.announcements.http_util import OfflineError, fetch_json, result  # type: ignore

ADAPTER_ID = "tier2_wikipedia_id_diff"
API = "https://id.wikipedia.org/w/api.php"
WATCHED_PAGES = ["Phoenix_Gramedia_Indonesia", "Elex_Media_Komputindo"]

_TITLE_MARKUP = re.compile(r"'''+([^'\n]{3,80})'''+|\[\[([^\]|]{3,80})(?:\|[^\]]*)?\]\]")


def parse_revisions(api_payload: dict) -> list[dict]:
    """Extract revision metadata from a MediaWiki query response."""
    revisions = []
    pages = (api_payload.get("query") or {}).get("pages") or {}
    for page in pages.values():
        for rev in page.get("revisions", []) or []:
            revisions.append(
                {
                    "page": page.get("title", ""),
                    "revid": rev.get("revid"),
                    "parentid": rev.get("parentid"),
                    "timestamp": rev.get("timestamp", ""),
                    "comment": rev.get("comment", ""),
                }
            )
    return revisions


def extract_candidate_titles(diff_text: str) -> list[str]:
    """Pull candidate titles from wikitext added in a revision diff."""
    titles: list[str] = []
    for bold, link in _TITLE_MARKUP.findall(diff_text or ""):
        title = (bold or link).strip()
        if title and title not in titles:
            titles.append(title)
    return titles


def fetch_revisions(title: str, limit: int = 5) -> list[dict]:
    query = urllib.parse.urlencode(
        {
            "action": "query",
            "prop": "revisions",
            "titles": title,
            "rvprop": "ids|timestamp|comment",
            "rvlimit": str(limit),
            "format": "json",
        }
    )
    return parse_revisions(fetch_json(f"{API}?{query}"))


def run(pages: list[str] | None = None) -> dict:
    sightings = []
    try:
        for page in pages or WATCHED_PAGES:
            for rev in fetch_revisions(page):
                sightings.append(
                    {
                        "title": rev["page"],
                        "url": (
                            "https://id.wikipedia.org/w/index.php?"
                            f"title={urllib.parse.quote(page)}&oldid={rev['revid']}"
                        ),
                        "observedAt": (rev["timestamp"] or "")[:10],
                        "evidenceNote": rev["comment"] or "Revisi halaman penerbit",
                    }
                )
    except OfflineError as exc:
        return result(ADAPTER_ID, "offline_in_build_env", error=str(exc))
    except Exception as exc:  # failure isolation: never crash the poll
        return result(ADAPTER_ID, "error", error=str(exc))
    return result(ADAPTER_ID, "ok", sightings)


if __name__ == "__main__":
    print(run())
