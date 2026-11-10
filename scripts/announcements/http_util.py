#!/usr/bin/env python3
"""Shared HTTP helpers for Radar Lisensi adapters (stdlib only).

Every adapter follows the same contract: run() returns
    {"adapter": <id>, "status": "ok" | "offline_in_build_env" | "error",
     "sightings": [ {title, url, observedAt, evidenceNote?}, ... ],
     "error": <message, only on failure>}
and NEVER raises for network problems — failure isolation (S5.6) means one
dead source must not take the other adapters down with it.
"""

import json
import urllib.error
import urllib.request

USER_AGENT = "NuvelliteRadar/1.0 (announcement tracker; +https://nuvellite.llunaticsys.web.id)"
TIMEOUT_SECONDS = 20


class OfflineError(Exception):
    """Raised when the network is unreachable from this environment."""


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            charset = resp.headers.get_content_charset() or "utf-8"
            return resp.read().decode(charset, errors="replace")
    except (urllib.error.URLError, OSError) as exc:
        raise OfflineError(f"{url}: {exc}") from exc


def fetch_json(url: str):
    return json.loads(fetch_text(url))


def result(adapter: str, status: str, sightings=None, error: str | None = None) -> dict:
    out = {"adapter": adapter, "status": status, "sightings": sightings or []}
    if error:
        out["error"] = error
    return out
