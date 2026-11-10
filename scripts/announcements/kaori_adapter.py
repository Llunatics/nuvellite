#!/usr/bin/env python3
"""Tier 2 adapter: KAORI Nusantara news feed (S5.2).

KAORI transcribes convention stage slides and weekly publisher spoiler
threads. Their site is WordPress (kaorinusantara.or.id): this adapter
polls the RSS feed and the WP REST search endpoint for announcement
keywords, and normalizes items into tracker sightings.

Offline behaviour: any URLError -> status "offline_in_build_env".
"""

import html
import re
import urllib.parse
import xml.etree.ElementTree as ET

try:
    from http_util import OfflineError, fetch_json, fetch_text, result
except ImportError:
    from scripts.announcements.http_util import OfflineError, fetch_json, fetch_text, result  # type: ignore

ADAPTER_ID = "tier2_kaori_rss"
BASE = "https://www.kaorinusantara.or.id"
KEYWORDS = ("lisensi", "comifuro", "phoenix gramedia", "pdk", "pengumuman")
SEARCH_TERMS = ("Phoenix Gramedia", "Comifuro", "lisensi")


def _clean(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def parse_wp_posts(payload) -> list[dict]:
    """Normalize a WP REST /wp/v2/posts response into sightings."""
    sightings = []
    for post in payload or []:
        title = _clean((post.get("title") or {}).get("rendered", ""))
        url = post.get("link", "")
        if not title or not url:
            continue
        sightings.append(
            {
                "title": title,
                "url": url,
                "observedAt": (post.get("date") or "")[:10],
                "evidenceNote": _clean((post.get("excerpt") or {}).get("rendered", ""))[:200],
            }
        )
    return sightings


def parse_rss(xml_text: str) -> list[dict]:
    """Normalize an RSS 2.0 feed into sightings."""
    sightings = []
    root = ET.fromstring(xml_text)
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        url = (item.findtext("link") or "").strip()
        if not title or not url:
            continue
        pub_date = (item.findtext("pubDate") or "")[:16]
        sightings.append({"title": title, "url": url, "observedAt": pub_date})
    return sightings


def is_announcement_relevant(title: str) -> bool:
    lowered = (title or "").lower()
    return any(keyword in lowered for keyword in KEYWORDS)


def run() -> dict:
    sightings: list[dict] = []
    seen_urls: set[str] = set()
    wp_error: Exception | None = None
    try:
        for term in SEARCH_TERMS:
            query = urllib.parse.urlencode({"search": term, "per_page": "5"})
            for item in parse_wp_posts(fetch_json(f"{BASE}/wp-json/wp/v2/posts?{query}")):
                if item["url"] in seen_urls or not is_announcement_relevant(item["title"]):
                    continue
                seen_urls.add(item["url"])
                sightings.append(item)
    except OfflineError as exc:
        wp_error = exc
    except Exception as exc:  # failure isolation
        return result(ADAPTER_ID, "error", error=str(exc))
    if wp_error is not None:
        # WP REST is often WAF-blocked for non-browser agents while the
        # public RSS feed stays open — fall back to the feed before
        # declaring the source unreachable.
        try:
            for item in parse_rss(fetch_text(f"{BASE}/feed/")):
                if item["url"] in seen_urls or not is_announcement_relevant(item["title"]):
                    continue
                seen_urls.add(item["url"])
                sightings.append(item)
        except OfflineError as exc:
            return result(ADAPTER_ID, "offline_in_build_env", error=str(exc))
        except Exception as exc:  # failure isolation
            return result(ADAPTER_ID, "error", error=str(exc))
    return result(ADAPTER_ID, "ok", sightings)


if __name__ == "__main__":
    print(run())
