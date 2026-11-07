#!/usr/bin/env python3
"""
Safe URL validation and IRI-to-URI normalization for KKI scraping scripts.
Prevents crashes on dirty spreadsheet cells (e.g. Japanese titles like "いのちの火"
in the MangaUpdates column for "Api Kehidupan") and blocks non-MU domains from
being scraped by the MangaUpdates parser.
"""

import urllib.parse

MU_ALLOWED_HOSTS = {"www.mangaupdates.com", "mangaupdates.com", "Baka-Updates"}


def sanitize_http_url(raw: str | None, allowed_hosts: set[str] | None = None) -> str | None:
    """Return a safe, ASCII-encoded http(s) URL or None if invalid/disallowed."""
    if not raw or not isinstance(raw, str):
        return None
    s = raw.strip()
    if not s or " " in s:
        return None
    if not (s.startswith("http://") or s.startswith("https://")):
        return None
    try:
        parsed = urllib.parse.urlsplit(s)
    except Exception:
        return None
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    host = (parsed.hostname or "").lower()
    if not host or "." not in host:
        return None
    if allowed_hosts and host not in {h.lower() for h in allowed_hosts}:
        return None
    try:
        ascii_netloc = parsed.netloc.encode("idna").decode("ascii")
        safe_path = urllib.parse.quote(urllib.parse.unquote(parsed.path), safe="/:@!$&'()*+,;=-._~")
        safe_query = urllib.parse.quote_plus(urllib.parse.unquote_plus(parsed.query), safe="=&:@!$'()*+,;-._~")
        return urllib.parse.urlunsplit((parsed.scheme, ascii_netloc, safe_path, safe_query, ""))
    except Exception:
        return None


def sanitize_mu_url(raw: str | None) -> str | None:
    """Return a valid MangaUpdates series URL or None."""
    url = sanitize_http_url(raw, allowed_hosts={"www.mangaupdates.com", "mangaupdates.com"})
    if not url:
        return None
    if "/series/" not in url and "id=" not in url:
        return None
    return url