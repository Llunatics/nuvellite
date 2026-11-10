#!/usr/bin/env python3
"""Offline unit tests for the Radar Lisensi adapters (Round 2 F-03).

Parsers are verified against local fixture strings — no network. Run:
    python3 -m unittest discover -s scripts/announcements -p "test_*.py"
"""

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import kaori_adapter
import perpusnas_adapter
import vision_extractor
import wikipedia_adapter

WP_FIXTURE = json.dumps(
    [
        {
            "title": {"rendered": "Novel dan Komik Baru Phoenix Gramedia 2026"},
            "link": "https://www.kaorinusantara.or.id/newsline/246154/novel-dan-komik-baru-phoenix-gramedia-2026",
            "date": "2026-01-15T10:00:00",
            "excerpt": {"rendered": "<p>Daftar lisensi baru PGI.</p>"},
        },
        {"title": {"rendered": ""}, "link": "", "date": "", "excerpt": {"rendered": ""}},
    ]
)

RSS_FIXTURE = """<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item><title>Comic Frontier 23 Hadir Kembali</title>
  <link>https://www.kaorinusantara.or.id/newsline/248051/comic-frontier-23</link>
  <pubDate>Sat, 01 Nov 2026 12:00:00 +0700</pubDate></item>
  <item><title>Berita Lain</title><link>https://example.com/x</link>
  <pubDate>Sun, 02 Nov 2026 12:00:00 +0700</pubDate></item>
</channel></rss>"""

WIKI_FIXTURE = {
    "query": {
        "pages": {
            "123": {
                "title": "Phoenix Gramedia Indonesia",
                "revisions": [
                    {
                        "revid": 9001,
                        "parentid": 9000,
                        "timestamp": "2026-11-01T15:04:05Z",
                        "comment": "Tambah lisensi Comifuro 23",
                    }
                ],
            }
        }
    }
}

# ISBN-13 with a valid check digit: 9786021234563
PERPUSNAS_FIXTURE = """
<html><body><table>
<tr><td>Silent Hill f</td><td>9786021234563</td><td>Phoenix Gramedia Indonesia</td></tr>
<tr><td>Buku Tanpa ISBN</td><td>-</td><td>Elex Media</td></tr>
<tr><td>ISBN Rusak</td><td>9786021234567</td><td>M&amp;C</td></tr>
</table></body></html>"""


class TestKaoriAdapter(unittest.TestCase):
    def test_parse_wp_posts(self):
        sightings = kaori_adapter.parse_wp_posts(json.loads(WP_FIXTURE))
        self.assertEqual(len(sightings), 1)
        self.assertEqual(sightings[0]["title"], "Novel dan Komik Baru Phoenix Gramedia 2026")
        self.assertEqual(sightings[0]["observedAt"], "2026-01-15")
        self.assertNotIn("<p>", sightings[0]["evidenceNote"])

    def test_parse_rss(self):
        sightings = kaori_adapter.parse_rss(RSS_FIXTURE)
        self.assertEqual(len(sightings), 2)
        self.assertTrue(sightings[0]["url"].endswith("comic-frontier-23"))

    def test_relevance_filter(self):
        self.assertTrue(kaori_adapter.is_announcement_relevant("Lisensi baru PGI"))
        self.assertFalse(kaori_adapter.is_announcement_relevant("Resep rendang enak"))


class TestWikipediaAdapter(unittest.TestCase):
    def test_parse_revisions(self):
        revisions = wikipedia_adapter.parse_revisions(WIKI_FIXTURE)
        self.assertEqual(len(revisions), 1)
        self.assertEqual(revisions[0]["revid"], 9001)
        self.assertEqual(revisions[0]["page"], "Phoenix Gramedia Indonesia")

    def test_extract_candidate_titles(self):
        diff = "Baru: '''Billy Bat''' dan [[Nippon Sangoku]] serta '''Tetralogi Empat Musim'''"
        titles = wikipedia_adapter.extract_candidate_titles(diff)
        self.assertEqual(titles, ["Billy Bat", "Nippon Sangoku", "Tetralogi Empat Musim"])


class TestPerpusnasAdapter(unittest.TestCase):
    def test_isbn_check_digit(self):
        self.assertTrue(perpusnas_adapter.is_valid_isbn13("9786021234563"))
        self.assertFalse(perpusnas_adapter.is_valid_isbn13("9786021234567"))
        self.assertFalse(perpusnas_adapter.is_valid_isbn13("12345"))

    def test_parse_isbn_results(self):
        found = perpusnas_adapter.parse_isbn_results(PERPUSNAS_FIXTURE)
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["isbn13"], "9786021234563")
        self.assertIn("Silent Hill f", found[0]["title"])


class TestVisionExtractor(unittest.TestCase):
    def test_hamming_dedupe_threshold(self):
        self.assertTrue(vision_extractor.is_duplicate(0b1010, [0b1011]))
        self.assertFalse(vision_extractor.is_duplicate(0b0000, [0b1111111111]))

    def test_quadrant_slicing_landscape(self):
        from PIL import Image

        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "slide.jpg")
            Image.new("RGB", (1200, 675), (24, 24, 27)).save(src)
            tiles = vision_extractor.ocr_gate_and_slice(src, os.path.join(tmp, "tiles"))
            # overview + 4 quadrants for a landscape slide
            self.assertEqual(len(tiles), 5)
            for tile in tiles:
                self.assertTrue(os.path.exists(tile))

    def test_quadrant_slicing_portrait_passthrough(self):
        from PIL import Image

        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "cover.jpg")
            Image.new("RGB", (600, 840), (24, 24, 27)).save(src)
            tiles = vision_extractor.ocr_gate_and_slice(src, os.path.join(tmp, "tiles"))
            self.assertEqual(len(tiles), 1)

    def test_vision_extract_without_api_key_is_honest(self):
        os.environ.pop("GEMINI_API_KEY", None)
        outcome = vision_extractor.vision_extract([], "caption")
        self.assertEqual(outcome["status"], "offline_in_build_env")

    def test_resolve_work_aliases_parses_graphql(self):
        import io
        import urllib.request
        from unittest import mock

        payload = json.dumps(
            {
                "data": {
                    "Media": {
                        "id": 12345,
                        "title": {"romaji": "Billy Bat", "english": "Billy Bat", "native": "ビリーバット"},
                        "synonyms": ["BILLY BAT"],
                        "coverImage": {"large": "https://example.com/billy.jpg"},
                    }
                }
            }
        ).encode("utf-8")

        class FakeResponse(io.BytesIO):
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

        with mock.patch.object(urllib.request, "urlopen", return_value=FakeResponse(payload)):
            aliases = vision_extractor.resolve_work_aliases("Billy Bat")
        self.assertEqual(aliases["anilistId"], 12345)
        self.assertEqual(aliases["native"], "ビリーバット")
        self.assertEqual(aliases["coverImage"], "https://example.com/billy.jpg")
        self.assertEqual(aliases["coverUrl"], "https://example.com/billy.jpg")

    def test_resolve_work_aliases_offline_fallback(self):
        import urllib.error
        import urllib.request
        from unittest import mock

        with mock.patch.object(
            urllib.request, "urlopen", side_effect=urllib.error.URLError("offline")
        ):
            aliases = vision_extractor.resolve_work_aliases("Billy Bat")
        self.assertIsNone(aliases["anilistId"])
        self.assertIsNone(aliases["coverUrl"])
        self.assertEqual(aliases["synonyms"], [])

    def test_expand_and_resolve_tetralogy(self):
        from unittest import mock

        extraction = {
            "extractedItems": [
                {
                    "isGroupOrTetralogySlide": True,
                    "groupWorkTitles": ["Title A", "Title B"],
                    "formatHint": "Light Novel",
                    "confidence": 0.9,
                    "authorOrIllustrator": "Mei Hachimoku",
                },
                {
                    "isGroupOrTetralogySlide": False,
                    "recognizedWorkTitleRomajiOrEn": "Teaser X",
                    "formatHint": "Manga",
                    "confidence": 0.5,
                },
            ]
        }
        with mock.patch.object(
            vision_extractor,
            "resolve_work_aliases",
            side_effect=lambda title, medium="MANGA": {
                "anilistId": 1,
                "romaji": title,
                "english": None,
                "native": None,
                "synonyms": [],
                "coverImage": None,
            },
        ):
            candidates = vision_extractor.expand_and_resolve(extraction)
        self.assertEqual(len(candidates), 3)
        self.assertFalse(candidates[0]["unresolved"])
        self.assertTrue(candidates[2]["unresolved"])  # 0.5 < 0.70 ceiling


if __name__ == "__main__":
    unittest.main()
