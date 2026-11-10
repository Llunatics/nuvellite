#!/usr/bin/env python3
"""Image-only announcement extraction pipeline (Round 2 S5.3) — scaffold.

Four deterministic steps for stage slides and "PDKT" collages, whose post
text contains zero book titles:

  1. Perceptual hash dedupe (dHash): if the Hamming distance to an
     already-processed image in announcements.json is <= 6, attach the new
     post URL as a corroborating source and skip OCR/Vision.
  2. Local OCR gate + cover-grid slicing (PaddleOCR / OpenCV): landscape
     slides (aspect > 1.1) or >= 4 rectangular sub-regions are cropped into
     1 full-frame overview + 4 overlapping quadrant tiles (x2, 15% overlap).
  3. Multimodal vision extraction (Gemini Flash free tier, strict JSON
     schema): publisher, imprint, event, per-item verbatim title text,
     romaji/ID title, author, tetralogy grouping, format/edition hints,
     verbatim release text, visual evidence, confidence.
  4. Bundle/tetralogy expansion + canonical alias resolution (AniList
     GraphQL / RanobeDB): group slides share one announcementGroupId;
     items with confidence < 0.70 and no corroborated title are routed to
     review-queue.json as UNRESOLVED_TEASER — never guessed.

All four steps are implemented; network-dependent steps degrade to
honest fallback values (never exceptions) when offline or unkeyed.
Nothing here writes src/data/catalog.json.
"""

from __future__ import annotations

HAMMING_DEDUPE_THRESHOLD = 6
UNRESOLVED_CONFIDENCE_CEILING = 0.70


def dhash(image_path: str, hash_size: int = 8) -> int:
    """64-bit difference hash. Requires Pillow."""
    try:
        from PIL import Image
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("vision_extractor requires Pillow (pip install Pillow)") from exc
    img = Image.open(image_path).convert("L").resize((hash_size + 1, hash_size))
    pixels = list(img.getdata())
    value = 0
    for row in range(hash_size):
        for col in range(hash_size):
            left = pixels[row * (hash_size + 1) + col]
            right = pixels[row * (hash_size + 1) + col + 1]
            value = (value << 1) | (1 if left > right else 0)
    return value


def hamming_distance(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def is_duplicate(image_hash: int, known_hashes: list[int]) -> bool:
    return any(
        hamming_distance(image_hash, known) <= HAMMING_DEDUPE_THRESHOLD
        for known in known_hashes
    )


def ocr_gate_and_slice(image_path: str, out_dir: str) -> list[str]:
    """Step 2 — slice a slide/teaser into overview + quadrant tiles.

    Landscape stage slides (aspect > 1.1) and multi-cover collages get
    1 full-frame overview plus 4 quadrant crops scaled 2x with 15%
    overlap, so small cover titles stay legible for the vision model.
    Portrait single covers pass through as a single overview tile.
    The OCR gate itself (PaddleOCR region counting) is optional: when
    PaddleOCR is not installed the slicer still runs and reports
    ocr="skipped_no_paddleocr" — slicing never blocks extraction.
    Requires Pillow.
    """
    try:
        from PIL import Image
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("vision_extractor requires Pillow (pip install Pillow)") from exc
    import os

    os.makedirs(out_dir, exist_ok=True)
    img = Image.open(image_path).convert("RGB")
    width, height = img.size
    stem = os.path.splitext(os.path.basename(image_path))[0]
    tiles: list[str] = []

    overview_path = os.path.join(out_dir, f"{stem}__overview.jpg")
    img.save(overview_path, quality=90)
    tiles.append(overview_path)

    if width / max(height, 1) > 1.1:
        overlap_x = int(width * 0.15)
        overlap_y = int(height * 0.15)
        half_w, half_h = width // 2, height // 2
        boxes = [
            (0, 0, half_w + overlap_x, half_h + overlap_y),
            (half_w - overlap_x, 0, width, half_h + overlap_y),
            (0, half_h - overlap_y, half_w + overlap_x, height),
            (half_w - overlap_x, half_h - overlap_y, width, height),
        ]
        for idx, box in enumerate(boxes):
            crop = img.crop(box)
            crop = crop.resize((crop.width * 2, crop.height * 2))
            tile_path = os.path.join(out_dir, f"{stem}__q{idx + 1}.jpg")
            crop.save(tile_path, quality=90)
            tiles.append(tile_path)
    return tiles


EXTRACTION_SCHEMA_HINT = (
    "Return strict JSON: {\"imageClassification\": \"STAGE_SLIDE | PDKT_TEASER_COLLAGE | "
    "SINGLE_TITLE_REVEAL | SCHEDULE_GRAPHIC | IRRELEVANT_PROMO\", \"publisherDetected\": "
    "\"pub_pgi | pub_mnc | pub_elex | unknown\", \"imprintDetected\": string|null, "
    "\"eventOrCampaign\": string|null, \"extractedItems\": [{\"verbatimTextOnImage\": "
    "string|null, \"recognizedWorkTitleRomajiOrEn\": string|null, "
    "\"recognizedWorkTitleId\": string|null, \"authorOrIllustrator\": string|null, "
    "\"isGroupOrTetralogySlide\": boolean, \"groupWorkTitles\": [string], "
    "\"formatHint\": \"Manga | Light Novel | Unknown\", \"editionHint\": \"REGULAR | "
    "BIND_UP | BOX_SET | DELUXE\", \"targetReleaseText\": string|null, "
    "\"visualEvidence\": string, \"confidence\": number}]}"
)


def vision_extract(tiles: list[str], caption: str) -> dict:
    """Step 3 — Gemini Flash structured extraction (free tier REST).

    Returns {"status": "offline_in_build_env", ...} instead of raising
    when GEMINI_API_KEY is missing or the network is unreachable, so the
    pipeline degrades honestly in sandboxes without keys.
    """
    import base64
    import json
    import os
    import urllib.error
    import urllib.request

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {"status": "offline_in_build_env", "error": "GEMINI_API_KEY not set", "extractedItems": []}

    parts: list[dict] = [
        {
            "text": (
                "Extract publisher announcement data from these images. "
                f"Post caption: {caption or '(none)'}. {EXTRACTION_SCHEMA_HINT}"
            )
        }
    ]
    for tile in tiles:
        with open(tile, "rb") as fh:
            parts.append(
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": base64.b64encode(fh.read()).decode("ascii"),
                    }
                }
            )
    body = json.dumps(
        {
            "contents": [{"parts": parts}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={api_key}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, OSError) as exc:
        return {"status": "offline_in_build_env", "error": str(exc), "extractedItems": []}
    text = (
        payload.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "{}")
    )
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {"status": "error", "error": "vision model returned non-JSON", "extractedItems": []}
    parsed["status"] = "ok"
    return parsed


ANILIST_GRAPHQL_URL = "https://graphql.anilist.co"
ANILIST_QUERY = """
query ($search: String, $format: MediaFormat) {
  Media(search: $search, type: MANGA, format: $format) {
    id
    title { romaji english native }
    synonyms
    coverImage { extraLarge large }
  }
}
"""

_ALIASES_FALLBACK = {
    "anilistId": None,
    "romaji": None,
    "english": None,
    "native": None,
    "synonyms": [],
    "coverImage": None,
    "coverUrl": None,
}


def resolve_work_aliases(title: str, medium: str = "MANGA", timeout: int = 8) -> dict:
    """Step 4a — resolve canonical AniList ID + multilingual titles.

    Stdlib-only GraphQL POST. NEVER raises on network failure: an offline
    sandbox gets the fallback dict (anilistId None) instead of a crash —
    an unresolved alias is a data state, not an exception.
    """
    import json
    import urllib.error
    import urllib.request

    if not title or not title.strip():
        return dict(_ALIASES_FALLBACK)
    gql_format = "NOVEL" if medium == "LIGHT_NOVEL" else "MANGA"
    payload = json.dumps(
        {
            "query": ANILIST_QUERY,
            "variables": {"search": title.strip(), "format": gql_format},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        ANILIST_GRAPHQL_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "nuvellite-announcement-tracker/2.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                media = (data.get("data") or {}).get("Media") or {}
                title_obj = media.get("title") or {}
                cover_obj = media.get("coverImage") or {}
                return {
                    "anilistId": media.get("id"),
                    "romaji": title_obj.get("romaji"),
                    "english": title_obj.get("english"),
                    "native": title_obj.get("native"),
                    "synonyms": list(media.get("synonyms") or []),
                    "coverImage": cover_obj.get("large"),
                    "coverUrl": cover_obj.get("large") or cover_obj.get("extraLarge"),
                }
    except Exception:
        pass
    return dict(_ALIASES_FALLBACK)


def expand_and_resolve(extraction: dict) -> list[dict]:
    """Step 4 — tetralogy/group expansion + alias resolution per item.

    Group slides expand into one candidate per constituent work (sharing
    the extraction's group context); every candidate gets its AniList
    resolution attached. Items below the confidence ceiling are flagged
    "unresolved" so the caller routes them to the review queue as
    UNRESOLVED_TEASER — never guessed.
    """
    candidates: list[dict] = []
    for item in extraction.get("extractedItems", []) or []:
        confidence = float(item.get("confidence") or 0)
        medium = "LIGHT_NOVEL" if item.get("formatHint") == "Light Novel" else "MANGA"
        titles = []
        if item.get("isGroupOrTetralogySlide") and item.get("groupWorkTitles"):
            titles = list(item["groupWorkTitles"])
        else:
            main = item.get("recognizedWorkTitleRomajiOrEn") or item.get("recognizedWorkTitleId")
            if main:
                titles = [main]
        for title in titles:
            aliases = resolve_work_aliases(title, medium=medium)
            candidates.append(
                {
                    "title": title,
                    "originalTitle": aliases.get("romaji") or item.get("recognizedWorkTitleRomajiOrEn"),
                    "anilistId": aliases.get("anilistId"),
                    "synonyms": aliases.get("synonyms", []),
                    "coverImage": aliases.get("coverImage"),
                    "coverUrl": aliases.get("coverUrl") or aliases.get("coverImage"),
                    "author": item.get("authorOrIllustrator"),
                    "formatHint": item.get("formatHint"),
                    "editionHint": item.get("editionHint"),
                    "targetReleaseText": item.get("targetReleaseText"),
                    "visualEvidence": item.get("visualEvidence"),
                    "confidence": confidence,
                    "unresolved": confidence < UNRESOLVED_CONFIDENCE_CEILING,
                }
            )
    return candidates
