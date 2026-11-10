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

Only step 1's hash is implemented in this scaffold; steps 2-4 raise
NotImplementedError until their dependencies (PaddleOCR, Gemini key) are
provisioned. Nothing here writes src/data/catalog.json.
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


def ocr_gate_and_slice(image_path: str) -> list[str]:
    raise NotImplementedError("Step 2 (PaddleOCR gate + quadrant slicing) not provisioned yet")


def vision_extract(tiles: list[str], caption: str) -> dict:
    raise NotImplementedError("Step 3 (Gemini Flash structured extraction) not provisioned yet")


def expand_and_resolve(extraction: dict) -> list[dict]:
    raise NotImplementedError("Step 4 (AniList/RanobeDB alias resolution) not provisioned yet")
