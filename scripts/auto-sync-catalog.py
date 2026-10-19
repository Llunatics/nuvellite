#!/usr/bin/env python3
"""
Nuvellite Continuous Dynamic Catalog Synchronization & Ingestion Engine
100% Data-Driven, Modular Source Adapters, Multi-Signal Classification,
and Idempotent Synchronization.
"""

import json
import re
import time
import os
import sys
import argparse
import importlib.util
from datetime import datetime, timezone
from collections import defaultdict, Counter
from concurrent.futures import ThreadPoolExecutor

from adapters import ElexAdapter, MCAdapter, PGIAdapter

# Consistency primitives (shared with src/lib/series-consistency.ts)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from catalog_consistency import (
    validate_price,
    detect_junk_title,
    find_duplicate_series,
    normalize_series_name,
    resolve_base_alias,
    resolve_medium_alias,
)

# Positive and Negative classification signals
MERCHANDISE_REGEX = re.compile(
    r'\b(acrylic|akrilik|standee|keychain|key\s*ring|gantungan\s*kunci|tote\s*bag|totebag|sling\s*bag|backpack|tas|pouch|dompet|tumbler|mug|gelas|cushion|bantal|mousepad|desk\s*mat|tapestry|stickers?|stikers?|poker-|amulet|eye\s*mask|figures?|figurine|plush|boneka|monopoly|pin\s*badge|badge|lanyard|washi\s*tape|postcards?|poster|art\s*print|clear\s*file|clear\s*folder|5-layer\s*folder|folder|card\s*pack|booster\s*pack|kartu\s*koleksi|tarot|flash\s*card|reflection\s*card|t-?shirt|kaos|stationary|stationery|binder|notebook|buku\s*tulis|memo\s*pad|pencil\s*case|kotak\s*pensil|merchandise|merch|origami)\b',
    re.IGNORECASE
)

# Craft supplies (not books). Absolute when the title starts with the
# "Clover" craft brand; otherwise only rejected on a non-comic category
# (words like "wood" legitimately appear in manga titles).
CRAFT_SUPPLY_REGEX = re.compile(
    r'\b(balon|balloon|confetti|benang|rajut|hakpen|kawat|foil|payet|manik|'
    r'flanel|jarum|artificial|lilin|tali|goni|rami|krep|karton|paperbag|'
    r'washi|terompet|kancing|kokot|peniti|pinset|gunting|rantai|mote|'
    r'serbuk|miniatur|polaroid|scrapbook|scrapbooking|newspaper|masking|flower\s*tape|'
    r'sticky|sticky\s*notes|snow\s*spray|wood|jump\s*ring|fancy\s*banner|'
    r'memo|deco\s*paper|putik|pita|bunga|daun|wol|jeruk|but+ons?|bot+ons?|wooden)\b',
    re.IGNORECASE
)

NON_MANGA_LN_REGEX = re.compile(
    r'\b(ensiklopedia|encyclopedia|atlas|kamus|dictionary|puzzle|teka-teki|paint\s*by\s*number|coloring\s*book|coloring|mewarnai|ilustrasi|buku\s*aktivitas|board\s*book|pop-up|lift\s*the\s*flap|funtastic|saintis\s*cilik|seek\s*&\s*find|buku\s*interaktif|buku\s*pintar|aku\s*jadi\s*pintar|siap\s*sekolah|top\s*paud|paud|my\s*first\s*book|pinkfong|bebefinn|uwa\s*and\s*friends|cocomelon|dr\.\s*robot\s*teo|alphabet\s*writing|menulis\s*alfabet|cepat\s*membaca|metode\s*bapatja|pandai\s*membaca|buku\s*anak|cerita\s*sains|koding\s*pertamaku|parenting|fiqih|hadits|sholat|khotbah|doa\s*harian|doa\b|hijrah|buku\s*resep|resep\b|resep\s+masakan?|resep\s+kue|buku\s*masak|diet|kesehatan|kedokteran|medis|hukum\s*pidana|hukum\s*perdata|hukum\s*dan\s*keadilan|kuhp|kuhap|investasi|saham|reksadana|crypto|keuangan|finansial|akuntansi|perpajakan|bisnis|manajemen|marketing|leadership|kepemimpinan|barakah|mindset|strategi|strategic|psikologi|psikolog|self\s*improvement|self-help|self[-\s]?healing|self[-\s]?love|therapy|terapi|journaling|motivasi|motivation|sukses|kesuksesan|filsafat|filosofi|sejarah\s*indonesia|soal\s*utbk|cpns|toefl|ielts|matematika|fisika|kimia|biologi|biografi|memoar|autobiografi|geronimo\s*stilton|thea\s*stilton|catstronauts|story\s*orchestra|start\s*with\s*why|ego\s*is\s*the\s*enemy|daring\s*greatly|dare\s*to\s*lead|burnout|the\s*idiot|the\s*four\s*agreements|the\s*patriarchs|principles:\s*your\s*guided\s*journal|memoirs\s*from\s*the\s*women|teenlit|romance\s*novel|international\s*classics?|penguin\s*books?|treasure\s*pack|games\s*&\s*puzzles?)\b',
    re.IGNORECASE
)

# Category-slug segments (Gramedia `category_slugs`, e.g. "buku/agama/islam/...")
# that prove a product is NOT manga / light novel. Checked per "/" segment.
DISALLOWED_CATEGORY_SEGMENTS = {
    'pengembangan-diri', 'pengembangan-diri-1', 'self-improvement',
    'bisnis', 'bisnis-ekonomi', 'manajemen', 'marketing',
    'kepemimpinan', 'kepemimpinan-1',
    'keuangan', 'investasi', 'saham', 'akuntansi', 'perbankan',
    'agama', 'islam', 'kristen', 'katolik', 'hindu', 'buddha', 'ritual--praktik',
    'parenting', 'keluarga',
    'kesehatan', 'kedokteran', 'medis', 'diet', 'kebugaran',
    'hukum', 'politik', 'sejarah',
    'resep', 'masakan', 'kuliner', 'kue',
    'kamus', 'ensiklopedia', 'atlas',
    'psikologi', 'filsafat',
    'pendidikan', 'pelajaran', 'utbk', 'cpns',
    'novel-15', 'teenlit', 'fiksi-remaja',
    'jurnal-diari', 'mewarnai', 'permainan-aktivitas',
    'kepercayaan-diri', 'motivasi',
    'cerita-anak', 'dongeng',
    'novel-terjemahan', 'sastra', 'nonfiksi-anak-remaja',
    'fiksi-teenlit', 'fiksi-sastra',
    'stationery', 'stationery-sekolah-kantor', 'alat-tulis',
    'hobi',
    'desain', 'arsitektur',
    'travel', 'perjalanan',
    'biografi', 'memoar',
}

# Explicit format tokens in the TITLE that prove manga/LN even when the
# store category is odd/missing (e.g. LN wrongly filed under "buku-anak").
EXPLICIT_FORMAT_TOKENS = (
    'light novel', 'light-novel', '(novel)', 'the novel',
    'komik', 'manga', 'manhwa', 'manhua',
    'level comic', 'lc:', 'lc :',
    'akasha', 'koloni', 'movie story',
)

def _category_segments(cat_slugs):
    return [s for s in (cat_slugs or '').lower().replace('_', '-').split('/') if s]


# Verified non-manga / non-LN series that the store miscategorizes as comic.
# Each entry was individually verified (web research); the store category
# alone cannot be trusted for these.
KNOWN_NON_MANGA_SERIES = (
    'ther melian',  # Indonesian fantasy NOVEL tetralogy by Shienny M.S. (Elex)
    # Verified non-manga/non-LN books found in the Elex feed (2026-10-11 audit).
    # Each fragment was checked against the catalog for collateral hits.
    'capcut',  # CapCut tutorial books
    'chip war',  # Chris Miller nonfiction (translated)
    'excel survival kit',  # Excel tutorial
    'hack the human',  # cybersecurity nonfiction
    'kebijakan publik',  # public policy nonfiction
    'letters from gaza',  # nonfiction
    'lintas sejarah',  # history
    'memahami jepang',  # history (Memahami Jepang - Sejarah Singkat...)
    'republik rakyat china',  # history/politics
    'tip & trik content creator',  # creator tutorial
    'pemrograman web',  # programming tutorial (7 in 1 Pemrograman Web - Elex)
    'sebuah kota, sebuah umpama',  # poetry collection
    'para perasuk',  # filmmaking book
    'jalan kehormatan',  # history (Samurai: Jalan Kehormatan...; NOT Samurai 8/X manga)
    'miaow',  # classic Spanish novel (Benito Perez Galdos) shelved under PGI
)


def _has_comic_category(cat_slugs):
    for s in _category_segments(cat_slugs):
        if s in ('komik', 'manga', 'light-novel') or s.startswith(('komik-', 'manga-', 'light-novel')):
            return True
    return False

TITLE_COUNTER_WORDS = {
    'centimeters', 'centimeter', 'cm', 'days', 'day', 'seconds', 'second',
    'hours', 'hour', 'tahun', 'years', 'year', 'century', 'pacar', 'ratu',
    'kota', 'kreativitas', 'al', 'langkah', 'musim', 'sahabat', 'warna',
    'detik', 'menit', 'hari', 'bulan', 'bintang'
}

EDITION_SUFFIX_REGEX = re.compile(
    r'\s*[\-–—:+]?\s*\b(?:Tamat|End|Special Set|Complete Set|Birthday Set|Limited Edition|Deluxe Edition|Premium Edition|Bundling(?: Set)?|Box Set|Regular|Reguler|Bookpaper|Edisi Khusus|Merchandise|Merch|Bonus|Akrilik|Standee)\b.*$',
    re.IGNORECASE
)

PREFIX_REGEX = re.compile(
    r'^(?:Akasha|LC|Level\s*Comics?|Light\s*Comics?|m&c!|Elex|Koloni|Qanza|Komik|Movie\s*Story|[a-zA-Z])\s*[:：\-]\s*|^(?:Manga|Light\s*Novel|Novel)\s*[:：\-]?\s*',
    re.IGNORECASE
)

def clean_slug(text):
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', str(text or '')).lower()
    slug = re.sub(r'[\s_]+', '-', slug).strip('-')
    return re.sub(r'\bfeeling\b', 'feelings', slug)

def clean_base_franchise(name):
    n = re.sub(r'\(.*?\)|\[.*?\]', '', str(name or '')).strip()
    n = re.sub(r'\b(?:Novel|Light\s*Novel|Manga|Komik|Movie\s*Story|Movie)\b', '', n, flags=re.I).strip(' :-–—')
    n = re.sub(r'\b(?:New Edition|Deluxe Edition|Special Set|Limited Edition|Tamat|End)\b', '', n, flags=re.I).strip(' :-–—')
    slug = clean_slug(n)
    return slug, n or name

def parse_title_smart(title):
    t = re.sub(r'\[.*?\]|\(.*?\)', '', title).strip()
    t = PREFIX_REGEX.sub('', t).strip()
    t_clean = EDITION_SUFFIX_REGEX.sub('', t).strip(' :-–—')

    vol = None
    sname = t_clean

    m_vol = re.search(r'\b(?:Vol\.?|Volume|Jilid|#|Episode|Ep\.?)\s*(\d{1,3})\b', t_clean, re.I)
    if m_vol:
        vol = int(m_vol.group(1))
        sname = t_clean[:m_vol.start()].strip(' :-–—+')
    else:
        m_dec = re.search(r'\b(\d+)\.5\b', t_clean)
        if m_dec:
            vol = int(m_dec.group(1))
            sname = t_clean[:m_dec.start()].strip(' :-–—')
        else:
            m_delim = re.search(r'^(.*?\S)\s+(\d{1,3})\s*[\-–—:]\s*(.*)$', t_clean)
            if m_delim:
                left_words = m_delim.group(1).strip()
                tokens = left_words.split()
                last_token = tokens[-1].lower() if tokens else ''
                if last_token in TITLE_COUNTER_WORDS:
                    if len(tokens) >= 2 and re.match(r'^\d+$', tokens[-2]):
                        vol = int(m_delim.group(2))
                        sname = left_words
                    else:
                        sname = f'{left_words} {m_delim.group(2)}'
                else:
                    vol = int(m_delim.group(2))
                    sname = left_words
            else:
                m_end = re.search(r'^(.*?\S)\s+(\d{1,3})$', t_clean)
                if m_end:
                    left_words = m_end.group(1).strip()
                    tokens = left_words.split()
                    last_token = tokens[-1].lower() if tokens else ''
                    if last_token in TITLE_COUNTER_WORDS:
                        if len(tokens) >= 2 and re.match(r'^\d+$', tokens[-2]):
                            vol = int(m_end.group(2))
                            sname = left_words
                        else:
                            sname = f'{left_words} {m_end.group(2)}'
                    else:
                        vol = int(m_end.group(2))
                        sname = left_words
                else:
                    sname = t_clean

    sname = re.sub(r'\s*[\-–—:]?\s*\b(?:New Edition|Deluxe Edition|Premium Edition|Edisi Khusus)\b.*$', '', sname, flags=re.I).strip(' :-–—')
    if ' - ' in sname or ' : ' in sname or ' – ' in sname or ':' in sname:
        parts = re.split(r'\s*[\-–—:]\s*', sname)
        if len(parts) >= 2 and len(parts[0]) >= 3:
            sname = parts[0].strip()

    return vol, sname or t

def is_wednesday(date_str):
    if not date_str:
        return False
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return dt.weekday() == 2
    except Exception:
        return False

# --- Bind-up / omnibus edition detection -----------------------------------
# Mirrors src/lib/data/edition-detector.ts. Pattern-based (no hardcoded
# series), so newly released bind-up editions are flagged automatically at
# sync time. Deliberately NOT markers: "Complete Set"/"Box Set" (bundles),
# "New Edition"/"Premium"/"Special Set" (reprints/merch bundles), and story
# anthologies ("Best of Best", "Fragments of Horror", "Twisted Visions",
# "... Compilation").
def _x_in_1_label(m):
    return f'{m.group(1)}-in-1'

# Order matters: first match wins (mirrors edition-detector.ts exactly).
BIND_UP_PATTERNS = [
    ('BIND_UP', re.compile(r'\bbind[\s-]?up\b', re.IGNORECASE), 'Bind Up'),
    ('OMNIBUS', re.compile(r'\bomnibus\b', re.IGNORECASE), 'Omnibus'),
    ('X_IN_1', re.compile(r'\b([2-9])\s*(?:[-–])?\s*in\s*(?:[-–])?\s*1\b', re.IGNORECASE), _x_in_1_label),
    ('COMPLETE_EDITION', re.compile(r'\bcomplete\s+edition\b', re.IGNORECASE), 'Complete Edition'),
    ('ULTIMATE_EDITION', re.compile(r'\bultimate\b', re.IGNORECASE), 'Ultimate Edition'),
    ('DELUXE', re.compile(r'\bdeluxe\b', re.IGNORECASE), 'Deluxe'),
    ('TRILOGY', re.compile(r'\btrilog[yi]\b', re.IGNORECASE), 'Trilogi'),
    ('EDISI_KOLEKSI', re.compile(r'\bedisi\s+koleksi\b', re.IGNORECASE), 'Edisi Koleksi'),
]

# Verified bind-up releases whose Indonesian store titles carry no
# unambiguous marker ("New Edition" / "Collector's Edition" / "Premium"
# alone prove nothing — e.g. Orange New Edition is a 1:1 reprint).
# Every entry was verified volume-count by volume-count against the
# Japanese edition it reprints.
CURATED_BIND_UPS = [
    # (title_regex, publisher_id, kind, label)
    (re.compile(r'\buzumaki\b', re.IGNORECASE), 'pub_mnc', 'CURATED', '3-in-1'),
    (re.compile(r'death note[\s-]*new edition', re.IGNORECASE), 'pub_mnc', 'CURATED', 'Bunkoban'),
    (re.compile(r"evangelion[\s-]*collector'?s edition", re.IGNORECASE), 'pub_mnc', 'CURATED', "Collector's Edition"),
    (re.compile(r'akasha\s*:?\s*monster', re.IGNORECASE), 'pub_mnc', 'CURATED', 'Kanzenban'),
    (re.compile(r'slam dunk[\s-]*new edition', re.IGNORECASE), 'pub_elex', 'CURATED', 'New Edition'),
    (re.compile(r'alice in borderland(?!.*retry)', re.IGNORECASE), 'pub_elex', 'CURATED', '2-in-1'),
    (re.compile(r'orb[\s:]*on the movements of the earth', re.IGNORECASE), 'pub_elex', 'CURATED', 'Bind Up'),
]

def detect_bind_up(title, series_name='', publisher_id=''):
    """Return (kind, label) for bind-up/omnibus editions, else (None, None)."""
    haystack = ' '.join(p for p in [title, series_name] if p)
    # Explicit non-bind-ups win over everything (verified 1:1 reprints with
    # misleading markers). Mirrors NON_BIND_UP_PATTERNS in edition-detector.ts.
    # - City Hunter "Complete Edition": 35 vols -> 32 (kanzenban 1:1 reprint).
    for rx in (re.compile(r'\bcity\s+hunter\b', re.IGNORECASE),):
        if rx.search(haystack):
            return None, None
    for kind, rx, label in BIND_UP_PATTERNS:
        m = rx.search(haystack)
        if m:
            return kind, label(m) if callable(label) else label
    pub = (publisher_id or '').lower()
    for rx, pub_id, kind, label in CURATED_BIND_UPS:
        if pub_id and pub != pub_id.lower():
            continue
        if rx.search(haystack):
            return kind, label
    return None, None

# Titles verified (2026-10-11) to be LIGHT NOVELS despite lacking a
# "Light Novel" title token. Checked against publisher product pages.
# NOTE: do NOT add PGI franchises here on the assumption that "no token =
# novel" — PGI publishes both manga and novels for dual-medium franchises
# (Kinki and Ziarah manga versions verified via cover credits + KAORI
# release schedules; the catalog entries are the manga).
VERIFIED_LIGHT_NOVEL_FRAGMENTS = (
    'ingatan untuk menyelamatkanmu',  # m&c! novel (380pp, Novel category)
)

def determine_book_medium(b):
    title = (b.get('title') or '').strip()
    t_lower = title.lower()
    has_ln_token = 'light novel' in t_lower or '(novel)' in t_lower

    # Explicit LN token wins over the movie check: movie novelizations
    # (e.g. "Light Novel One Piece: ... The Movie") are prose, not comics.
    if has_ln_token:
        return 'LIGHT_NOVEL'
    # Curated verified novels without a title token.
    for frag in VERIFIED_LIGHT_NOVEL_FRAGMENTS:
        if frag in t_lower:
            return 'LIGHT_NOVEL'
    if 'movie' in t_lower or 'movie story' in t_lower:
        return 'MOVIE'

    genres = [str(g).lower() for g in b.get('genres', [])]
    pub_id = b.get('publisherId', '')

    # PGI: Phoenix Gramedia Indonesia explicitly includes "Light Novel" or "(Novel)" in LN releases.
    # PGI Manga releases do NOT have "Light Novel" in the title (e.g. "The Eminence in Shadow 14").
    if pub_id == 'pub_pgi':
        # PGI Re:Zero is LN-only (verified 2026-10-12): PGI never published a
        # Re:Zero manga; the 5 "Re:Zero : Starting Life in Another World" books
        # are LN vols 1-5 despite lacking the "Light Novel:" prefix.
        if 're:zero' in t_lower or 'rezero' in t_lower:
            return 'LIGHT_NOVEL'
        return 'LIGHT_NOVEL' if has_ln_token else 'MANGA'

    # m&c! Clover imprint / Light Novel. Require the Clover prefix (a bare
    # substring mislabels manga like "You are a Four Leaf Clover" as LN).
    is_clover_novel = pub_id == 'pub_mnc' and (
        t_lower.startswith('clover') or
        any('novel' in g for g in genres) or
        title.lower().startswith('eighty six')
    )
    if has_ln_token or is_clover_novel:
        return 'LIGHT_NOVEL'

    if b.get('category') == 'Light Novel' and not any(k in t_lower for k in ['komik', 'manga', 'level comic', 'lc:']):
        return 'LIGHT_NOVEL'

    return 'MANGA'

def classify_book(title, pub_id, cat_slugs='', existing_cat=None, specs=None, authors=''):
    """Two-signal classification: title patterns + store category slugs.

    REJECT happens only on positive junk evidence (never on "no signal"),
    so legit manga with generic store categories are never dropped.
    """
    t = (title or '').strip()
    t_lower = t.lower()
    cat = (cat_slugs or '').lower()
    segs = _category_segments(cat)
    authors_lower = (authors or '').lower()

    # 1. Merchandise: absolute reject, regardless of category.
    if MERCHANDISE_REGEX.search(t):
        return 'REJECT', None, 'Matched merchandise title pattern'

    # Merchandise author credit (e.g. "Merchandise Gerai Kompas"): precise,
    # never collides with real manga authors. Catches items like
    # "Hunter Hat Press Ssst X Gerai Kompas" whose title evades MERCHANDISE_REGEX
    # ("Witch Hat Atelier" is real manga, so "hat" alone must NOT be blocked).
    if 'merchandise' in authors_lower:
        return 'REJECT', None, 'Author credit is merchandise (non-book product)'

    # Generic placeholder titles: Gramedia lists bundle/single-copy placeholder
    # products as "Satuan" / "Komik Satuan". No real manga/LN is titled exactly this.
    if t_lower in ('satuan', 'komik satuan'):
        return 'REJECT', None, 'Generic placeholder title (satuan)'

    # Bundle SKUs: Gramedia bundle products are titled "Bundling Komik - JBA8",
    # "Bundling Komik 1 - NBU1", etc. No legitimate series starts with "bundling"
    # (verified against catalog 2026-10-12).
    if t_lower.startswith('bundling'):
        return 'REJECT', None, 'Bundle SKU product (non-book bundle)'

    # Qanza is m&c!'s Islamic children-book imprint (never manga / light novel).
    # Titles carry the imprint as a prefix, e.g. "Qanza: ...".
    if t_lower.startswith('qanza'):
        return 'REJECT', None, 'Qanza imprint (non-manga children imprint)'

    # Known miscategorized series (verified non-manga / non-LN).
    for known in KNOWN_NON_MANGA_SERIES:
        if known in t_lower:
            return 'REJECT', None, f'Known non-manga/non-LN series: {known}'

    # Clover craft supplies: "Clover <craft item>" is never a book.
    if t_lower.startswith('clover ') and CRAFT_SUPPLY_REGEX.search(title):
        return 'REJECT', None, 'Clover craft supply (non-book product)'
    # Other craft supplies: reject on non-comic store category only.
    if CRAFT_SUPPLY_REGEX.search(title) and cat_slugs and not _has_comic_category(cat_slugs):
        return 'REJECT', None, 'Craft supply (non-comic store category)'

    has_comic_cat = _has_comic_category(cat)
    has_explicit_token = any(tok in t_lower for tok in EXPLICIT_FORMAT_TOKENS)

    # 2. Non-manga/non-LN title patterns. Skipped when the store category
    #    proves comic (the store files real manga under odd titles, e.g.
    #    "Teka-Teki Rumah Aneh - Hen Na Ie" -> buku/komik/manga/misteri).
    #    Applied even when the category is unknown: positive junk evidence
    #    in the title is enough to reject (2026-10-11: junk like "Excel
    #    Survival Kit" and "Chip War" slipped in with empty category slugs).
    if not has_comic_cat and not has_explicit_token:
        if NON_MANGA_LN_REGEX.search(t):
            return 'REJECT', None, 'Matched non-manga/non-LN title pattern'

    # 3. Disallowed store category (skipped when the title itself proves
    #    manga/LN format — the store miscategorizes real releases sometimes)
    if not has_explicit_token:
        for s in segs:
            if s in DISALLOWED_CATEGORY_SEGMENTS:
                return 'REJECT', None, f'Matched disallowed store category: {s}'

    # 3. Type determination (manga vs light novel)
    specs = specs or {}
    imprint = (specs.get('Imprint') or specs.get('Penerbit') or '').lower()

    has_ln_token = (
        'light novel' in t_lower or '(novel)' in t_lower or 'the novel' in t_lower
        or 'light-novel' in cat
    )
    # Clover = m&c! novel imprint. Require prefix/category — a bare substring
    # mislabels manga like "You are a Four Leaf Clover" (Akasha) as LN.
    is_clover = pub_id == 'pub_mnc' and (
        t_lower.startswith('clover') or 'clover' in imprint or 'novel-6' in cat
    )

    if pub_id == 'pub_pgi':
        is_ln = has_ln_token
    else:
        is_ln = has_ln_token or is_clover

    category = 'Light Novel' if is_ln else 'Manga'
    return 'ACCEPT', category, f"Official {category} verified"

def discover_sequence_gaps(existing_books, adapter):
    series_books = defaultdict(list)
    for b in existing_books:
        sname = b.get('seriesName')
        if sname and len(sname) >= 3:
            series_books[sname].append(b)

    gap_series = []
    for sname, b_list in series_books.items():
        vols = [b['volume'] for b in b_list if b.get('volume') is not None]
        if not vols:
            continue
        max_v = max(vols)
        # If series has at least 3 volumes and some volumes are missing
        if max_v >= 3 and len(set(vols)) < max_v:
            gap_series.append((sname, max_v - len(set(vols))))

    gap_series.sort(key=lambda x: x[1], reverse=True)
    print(f"  -> [GAP_DISCOVERY] Found {len(gap_series)} series with missing sequence volumes.")

    gap_products = []
    for sname, missing_count in gap_series[:15]: # Search top series with gaps
        print(f"     Searching backlist/OOS for '{sname}' ({missing_count} missing volumes)...")
        try:
            prods = adapter.search_products(sname, is_available_only=False, max_pages=3)
            gap_products.extend(prods)
        except Exception as e:
            print(f"     [GAP_QUERY_ERROR] {sname}: {e}")

    return gap_products

def _norm_title_key(title):
    """Normalized title for duplicate detection (mirrors the bind-up test)."""
    return re.sub(r'[^a-z0-9]+', ' ', (title or '').lower()).strip()


def apply_franchise_separation(all_books):
    """Step 5: Dynamic Franchise Medium Separation (Manga vs Light Novel vs Movie).

    Applies the curated SERIES_BASE_ALIASES / SERIES_MEDIUM_ALIASES
    (scripts/catalog_consistency.py) so the 2026-10-12 audit's series merges
    survive every sync. Previously those merges were one-time DATA edits, so
    later syncs silently re-split them (Conan movie, BSD BEAST) and the
    single-medium display name decayed ('Detektif Conan The Movie' became
    'Detektif Conan The').
    """
    franchise_mediums = defaultdict(set)
    franchise_canonical_names = {}

    def base_of(b):
        sname = b.get('seriesName') or b.get('title')
        base_slug, base_name = clean_base_franchise(sname)
        base_slug, alias_name = resolve_base_alias(base_slug)
        if alias_name:
            base_name = alias_name
        return base_slug, base_name, sname

    for b in all_books:
        base_slug, base_name, _ = base_of(b)
        if not base_slug:
            continue
        if base_slug not in franchise_canonical_names:
            franchise_canonical_names[base_slug] = base_name
        franchise_mediums[base_slug].add(determine_book_medium(b))

    for b in all_books:
        base_slug, _, sname = base_of(b)
        base_name = franchise_canonical_names.get(base_slug, sname)
        med = determine_book_medium(b)

        # Canonical medium alias (e.g. Conan movie line -> detektif-conan-the).
        canon_slug, canon_name = resolve_medium_alias(base_slug, med)
        if canon_name:
            base_name = canon_name
        base_slug = canon_slug

        has_multiple = len(franchise_mediums[base_slug]) > 1

        if has_multiple:
            if med == 'LIGHT_NOVEL':
                sid = f"ser_{base_slug}-ln"
                s_display = f"{base_name} (Novel)"
                b['category'] = 'Light Novel'
                b['format'] = 'LIGHT_NOVEL'
            elif med == 'MOVIE':
                sid = f"ser_{base_slug}-movie"
                s_display = base_name
                if not s_display.lower().endswith('movie'):
                    s_display = f"{s_display} Movie"
                b['category'] = 'Manga'
                b['format'] = 'MANGA'
            else:
                sid = f"ser_{base_slug}-manga"
                s_display = base_name
                b['category'] = 'Manga'
                b['format'] = 'MANGA'
        else:
            sid = f"ser_{base_slug}"
            s_display = base_name
            if med == 'MOVIE' and not s_display.lower().endswith('movie'):
                # clean_base_franchise() strips the 'Movie' token; restore it
                # so a movie-only franchise keeps its full display name.
                s_display = f"{s_display} Movie"
            b['category'] = 'Light Novel' if med == 'LIGHT_NOVEL' else 'Manga'
            b['format'] = 'LIGHT_NOVEL' if med == 'LIGHT_NOVEL' else 'MANGA'

        b['seriesId'] = sid
        b['seriesName'] = s_display

    return all_books


def _book_completeness(b):
    """Score for picking the canonical record when merging duplicates."""
    score = 0
    if b.get('coverImage'):
        score += 2
    if b.get('isbn13'):
        score += 2
    score += min(len(b.get('synopsis') or ''), 500) / 500
    if b.get('currentPrice'):
        score += 1
    if b.get('gramediaUrl'):
        score += 1
    return score


def merge_duplicate_listings(all_books, price_snapshot_map=None):
    """Step 5b: merge duplicate vendor listings of the same product.

    The same product is often listed under two Gramedia slugs
    (e.g. 'blue-lock-04-1' vs 'blue-lock-04-2'). Same (seriesId, volume,
    normalized title) is treated as the same product: keep one canonical
    record, fold missing fields from the dropped duplicate, and reassign its
    price snapshots to the canonical book so no new orphans are created.
    """
    series_pub_majority = {}
    pub_counts = defaultdict(Counter)
    for b in all_books:
        if b.get('seriesId'):
            pub_counts[b['seriesId']][b.get('publisherId')] += 1
    for sid, counts in pub_counts.items():
        series_pub_majority[sid] = counts.most_common(1)[0][0]

    groups = defaultdict(list)
    for b in all_books:
        if not b.get('seriesId') or b.get('volume') is None:
            continue
        key = (b['seriesId'], b['volume'], _norm_title_key(b.get('title')))
        groups[key].append(b)

    dropped_ids = set()
    merged = []
    for key, b_list in groups.items():
        if len(b_list) == 1:
            merged.append(b_list[0])
            continue
        sid = key[0]
        majority_pub = series_pub_majority.get(sid)

        def rank(b):
            # Majority publisher of the series first, then completeness,
            # then stable slug order.
            return (
                0 if b.get('publisherId') == majority_pub else 1,
                -_book_completeness(b),
                b.get('slug') or '',
            )

        ordered = sorted(b_list, key=rank)
        keep = ordered[0]
        for dup in ordered[1:]:
            for field in ('coverImage', 'isbn13', 'synopsis', 'gramediaUrl',
                           'releaseDate', 'authors', 'genres'):
                if not keep.get(field) and dup.get(field):
                    keep[field] = dup[field]
            # Keep the richer edition data if the duplicate has it.
            if not keep.get('availableEditions') and dup.get('availableEditions'):
                keep['availableEditions'] = dup['availableEditions']
            if price_snapshot_map is not None:
                for snap in price_snapshot_map.get(dup['id'], []):
                    snap['bookId'] = keep['id']
                price_snapshot_map[keep['id']].extend(
                    price_snapshot_map.get(dup['id'], []))
                if dup['id'] in price_snapshot_map:
                    del price_snapshot_map[dup['id']]
            dropped_ids.add(dup['id'])
            print(f"  [dup-merge] {dup['title']} ({dup['id']}) -> {keep['id']}")
        merged.append(keep)

    # Books without seriesId/volume pass through untouched.
    passthrough = [b for b in all_books
                   if not b.get('seriesId') or b.get('volume') is None]
    result = merged + passthrough
    if dropped_ids:
        print(f"  [dup-merge] merged {len(dropped_ids)} duplicate listings")
    return result, len(dropped_ids)


def _edition_base_title(title):
    """Title with edition suffixes stripped, normalized for comparison."""
    stripped = EDITION_SUFFIX_REGEX.sub('', title or '').strip(' :-–—+')
    return _norm_title_key(stripped)


def consolidate_editions(all_books, price_snapshot_map=None):
    """Step 5c: fold edition variants into the canonical volume's availableEditions.

    Ported from the one-time scripts/reconcile-catalog.py into the recurring
    pipeline so edition consolidation no longer decays between audits.
    Groups by (seriesId, volume), then sub-groups by edition-stripped title:
    only true edition variants of the SAME product are folded (e.g. 'Alya 5'
    + 'Alya 5 - Special Set'). Different products that share a volume number
    (e.g. 'Bungo Stray Dogs 1' vs the 'Beast' spin-off 'Bungo Stray Dogs -
    Beast 1') are kept as separate books.

    The regular edition becomes the canonical book; Special Set / Complete
    Set / Birthday Set / Limited variants become entries in its
    availableEditions (with the 'Pilihan Edisi & Set Resmi' synopsis marker
    the frontend renders).

    Price snapshots of folded-away edition books are reassigned to the
    canonical book so the price-history invariant (no new orphan snapshots)
    holds.
    """
    series_vol_map = defaultdict(list)
    for b in all_books:
        series_vol_map[(b.get('seriesId'), b.get('volume'))].append(b)

    canonical_books = []
    for (sid, v), b_list in series_vol_map.items():
        # Sub-group by edition-stripped title: only fold true variants.
        title_groups = defaultdict(list)
        for b in b_list:
            title_groups[_edition_base_title(b.get('title'))].append(b)

        for tkey, t_list in title_groups.items():
            if len(t_list) == 1:
                canonical_books.append(t_list[0])
                continue
            regular = next(
                (b for b in t_list if not any(
                    k in (b.get('title') or '').lower()
                    for k in ['special set', 'birthday set', 'limited edition',
                              'bundling', 'complete set', 'bonus'])),
                t_list[0],
            )
            editions = []
            for b in t_list:
                ed_name = 'Regular'
                t_low = (b.get('title') or '').lower()
                if 'special set' in t_low or 'special' in t_low:
                    ed_name = 'Special Set'
                elif 'birthday set' in t_low:
                    ed_name = 'Birthday Set'
                elif 'complete set' in t_low or 'box set' in t_low:
                    ed_name = 'Complete Set'
                elif 'limited' in t_low:
                    ed_name = 'Limited Edition'
                editions.append({
                    'name': ed_name,
                    'price': b.get('currentPrice'),
                    'gramediaUrl': b.get('gramediaUrl'),
                })
            regular['title'] = EDITION_SUFFIX_REGEX.sub(
                '', regular.get('title') or '').strip(' :-–—+')
            regular['availableEditions'] = editions
            if len(editions) > 1 and 'Pilihan Edisi & Set Resmi' not in (regular.get('synopsis') or ''):
                regular['synopsis'] = (regular.get('synopsis') or '') + \
                    f"\n\nPilihan Edisi & Set Resmi: {', '.join(e['name'] for e in editions)}"
            if price_snapshot_map is not None:
                for b in t_list:
                    if b['id'] == regular['id']:
                        continue
                    for snap in price_snapshot_map.get(b['id'], []):
                        snap['bookId'] = regular['id']
                    price_snapshot_map[regular['id']].extend(
                        price_snapshot_map.get(b['id'], []))
                    if b['id'] in price_snapshot_map:
                        del price_snapshot_map[b['id']]
            canonical_books.append(regular)

    # Deduplicate books with identical seriesId and clean title.
    seen_titles = set()
    deduped = []
    for b in canonical_books:
        key = (b.get('seriesId'), clean_slug(b.get('title')))
        if key in seen_titles:
            continue
        seen_titles.add(key)
        deduped.append(b)
    return deduped


def reconstruct_series(all_books, existing_series_map):
    """Step 6: rebuild the denormalized series list from the canonical books."""
    series_groups = defaultdict(list)
    for b in all_books:
        if b.get('seriesId'):
            series_groups[b['seriesId']].append(b)

    new_series_list = []
    for sid, b_list in series_groups.items():
        sample = b_list[0]
        cat = sample['category']
        pub_id = sample['publisherId']
        pub_name = sample['publisherName']

        vols = [b['volume'] for b in b_list if b.get('volume') is not None]
        avail_vols = sorted(list(set(vols))) if vols else []
        latest_vol = max(avail_vols) if avail_vols else 1

        ex = existing_series_map.get(sid)
        if ex and ex.get('totalVolumes'):
            total_vols = max(ex['totalVolumes'], latest_vol, len(b_list))
            latest_vol = max(ex.get('latestVolume', 0), latest_vol)
            avail_vols = sorted(list(set(ex.get('availableVolumes', []) + avail_vols)))
        else:
            total_vols = max(len(avail_vols), latest_vol, len(b_list))

        s_name = sample.get('seriesName') or sample.get('title')
        cover = next((b['coverImage'] for b in b_list if b.get('coverImage')), '')
        if not cover and ex:
            cover = ex.get('coverImage', '')

        author = sample.get('authors', ['Various Authors'])[0]
        if (not author or author == 'Various Authors') and ex:
            author = ex.get('author', author)

        first_vol = next((b for b in b_list if b.get('volume') == 1 and len(b.get('synopsis', '')) > 50), None)
        if not first_vol:
            first_vol = next((b for b in b_list if len(b.get('synopsis', '')) > 50), b_list[0])
        s_desc = first_vol.get('synopsis') or f"Diterbitkan resmi oleh {pub_name}."

        series_obj = {
            'id': sid,
            'slug': sid.replace('ser_', ''),
            'name': s_name,
            'originalTitle': s_name,
            'publisherId': pub_id,
            'publisherName': pub_name,
            'author': author,
            'type': 'LIGHT_NOVEL' if cat == 'Light Novel' or sid.endswith('-ln') else 'MANGA',
            'status': 'ONGOING',
            'totalVolumes': total_vols,
            'latestVolume': latest_vol,
            'availableVolumes': avail_vols,
            'coverImage': cover,
            'description': s_desc
        }
        new_series_list.append(series_obj)

    new_series_list.sort(key=lambda s: s['name'].lower())
    return new_series_list


def run_sync(catalog_path):
    start_time = time.time()
    started_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [SYNC_START] Initializing Source Adapters...")

    if not os.path.exists(catalog_path):
        print(f"[ERROR] Catalog file not found at {catalog_path}")
        return False

    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    existing_books_map = {b['slug']: b for b in catalog.get('books', [])}
    existing_series_map = {s['id']: s for s in catalog.get('series', [])}
    existing_price_snapshots = catalog.get('priceSnapshots', [])
    price_snapshot_map = defaultdict(list)
    for s in existing_price_snapshots:
        price_snapshot_map[s['bookId']].append(s)

    adapters = [
        ElexAdapter(),
        MCAdapter(),
        PGIAdapter(),
    ]

    total_products_fetched = 0
    accepted_products = {} # slug -> (item_data, adapter, cat)
    rejected_count = 0
    errors = []

    # 1. Vendor feed discovery
    for adapter in adapters:
        print(f"  -> [SOURCE_FETCH] Querying vendor feed for {adapter.publisher_name} ({adapter.publisher_short})...")
        try:
            products = adapter.fetch_vendor_products(max_pages=20)
            total_products_fetched += len(products)
            print(f"     Discovered {len(products)} products from {adapter.publisher_short}.")

            for item in products:
                slug = item.get('slug')
                title = (item.get('title') or item.get('name') or '').strip()
                if not slug or not title:
                    continue

                status, cat, reason = classify_book(
                    title, adapter.publisher_id,
                    cat_slugs=item.get('category_slugs') or '',
                    authors=item.get('author') or '',
                )
                if status == 'REJECT':
                    rejected_count += 1
                    continue

                accepted_products[slug] = (item, adapter, cat)

        except Exception as e:
            err_msg = f"Error in adapter {adapter.publisher_id}: {e}"
            print(f"     [ERROR] {err_msg}")
            errors.append(err_msg)

    # 2. Sequence gap discovery for missing/OOS volumes
    try:
        gap_products = discover_sequence_gaps(existing_books_map.values(), adapters[0])
        print(f"     Discovered {len(gap_products)} candidate products from gap search.")
        for item in gap_products:
            slug = item.get('slug')
            title = (item.get('title') or item.get('name') or '').strip()
            if not slug or not title or slug in accepted_products:
                continue

            # Determine publisher adapter
            pub_name = (item.get('author') or '').lower()
            adapter = adapters[0] # default Elex
            if 'phoenix' in pub_name or 'pgi' in pub_name:
                adapter = adapters[2]
            elif 'm&c' in pub_name or 'clover' in pub_name or 'akasha' in pub_name:
                adapter = adapters[1]

            status, cat, reason = classify_book(
                title, adapter.publisher_id,
                cat_slugs=item.get('category_slugs') or '',
                authors=item.get('author') or '',
            )
            if status == 'REJECT':
                rejected_count += 1
                continue

            accepted_products[slug] = (item, adapter, cat)
            total_products_fetched += 1
    except Exception as e:
        print(f"     [ERROR in gap discovery]: {e}")

    # Empty Catalog Safety Check:
    if total_products_fetched == 0 and len(existing_books_map) > 0:
        print(f"[WARNING] [EMPTY_CATALOG_SAFETY] 0 products fetched from sources. Preserving last-known-good catalog.")
        return False

    print(f"  -> [CLASSIFICATION_COMPLETE] Accepted: {len(accepted_products)}, Rejected: {rejected_count}")

    # 2.5. Stale price refresh: books in catalog but NOT in vendor feed keep
    # stale prices forever. Fetch each directly by slug via product-detail-variants.
    # This catches discounted books the vendor feed omits (e.g. Re:Zero manga vol 1 at 50% off).
    accepted_slugs = set(accepted_products.keys())
    stale_candidates = []
    for slug, book in existing_books_map.items():
        if slug in accepted_slugs:
            continue
        # Skip archive-only books (no Gramedia slug to fetch)
        if book.get('isArchive') and not book.get('gramediaUrl'):
            continue
        stale_candidates.append(slug)

    print(f"  -> [PRICE_REFRESH] Checking {len(stale_candidates)} catalog books not in vendor feed...")
    refreshed_count = 0
    refresh_snapshots = []

    def refresh_price_task(slug):
        # Use Elex adapter as default (endpoint is vendor-agnostic by slug)
        adapter = adapters[0]
        try:
            specs = adapter.fetch_product_specs(slug)
            if not specs:
                return slug, None
            # fetch_product_specs returns normalized 'price'/'original_price' keys
            final_p = specs.get('price') or 0
            slice_p = specs.get('original_price') or 0
            if not final_p:
                return slug, None
            current_price = final_p
            original_price = slice_p if slice_p > current_price else current_price
            return slug, (current_price, original_price)
        except Exception:
            return slug, None

    with ThreadPoolExecutor(max_workers=4) as executor:
        for slug, result in executor.map(refresh_price_task, stale_candidates):
            if not result:
                continue
            current_price, original_price = result
            book = existing_books_map.get(slug)
            if not book:
                continue
            old_price = book.get('currentPrice')
            old_orig = book.get('originalPrice')
            if old_price != current_price or old_orig != original_price:
                # Record snapshot
                snap = {
                    'id': f"snap_{book['id']}_{int(time.time())}",
                    'bookId': book['id'],
                    'price': current_price,
                    'currentPrice': current_price,
                    'originalPrice': original_price,
                    'previousPrice': old_price,
                    'availability': book.get('availability', 'AVAILABLE'),
                    'observedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                    'source': 'gramedia_api_refresh'
                }
                refresh_snapshots.append(snap)
                price_snapshot_map[book['id']].append(snap)
                # Update book
                book['currentPrice'] = current_price
                book['originalPrice'] = original_price
                refreshed_count += 1

    print(f"  -> [PRICE_REFRESH] Updated {refreshed_count} stale prices.")
    # Merge refresh snapshots into new_snapshots (defined later, so store for now)
    # We'll append them after new_snapshots is initialized

    # 3. Concurrently fetch specs for new or updated products
    to_fetch_specs = []
    for slug, (item, adapter, cat) in accepted_products.items():
        ex = existing_books_map.get(slug)
        if not ex or not ex.get('isbn13') or not ex.get('releaseDate') or ex.get('availability') == 'OUT_OF_STOCK':
            to_fetch_specs.append((slug, adapter))

    print(f"  -> Concurrently fetching specs for {len(to_fetch_specs)} products...")
    fetched_specs = {}

    def fetch_spec_task(arg):
        slug, adapter = arg
        specs = adapter.fetch_product_specs(slug)
        synopsis = adapter.fetch_product_synopsis(slug)
        return slug, specs, synopsis

    with ThreadPoolExecutor(max_workers=6) as executor:
        for slug, sp, syn in executor.map(fetch_spec_task, to_fetch_specs):
            if sp:
                sp['synopsis'] = syn
                fetched_specs[slug] = sp

    # 4. Ingest and update books
    inserted_count = 0
    updated_count = 0
    new_snapshots = []

    for slug, (item, adapter, cat) in accepted_products.items():
        title = (item.get('title') or item.get('name') or '').strip()
        sp = fetched_specs.get(slug) or {}
        slice_price = sp.get('original_price') or item.get('slice_price') or 0
        final_price = sp.get('price') or item.get('final_price') or slice_price or 0
        current_price = final_price
        original_price = slice_price if slice_price > current_price else current_price

        # Consistency: validate prices (auto-fix currentPrice > originalPrice swap)
        _pvalid, _pissues, _pfc, _pfo = validate_price(current_price, original_price)
        if _pfc is not None:
            current_price, original_price = _pfc, _pfo
        for _iss in _pissues:
            print(f"  [price-warn] {slug}: {_iss}")

        # Consistency: junk-title safety net (mirrors classify_book)
        _junk = detect_junk_title(title)
        if _junk:
            print(f"  [junk-skip] {slug}: {_junk}")
            continue

        is_oos = sp.get('is_oos') if sp.get('is_oos') is not None else item.get('is_oos', False)
        availability = 'OUT_OF_STOCK' if is_oos else 'AVAILABLE'

        rel_date = sp.get('releaseDate') or item.get('release_date') or datetime.now().strftime('%Y-%m-%d')
        cover = sp.get('coverImage') or (item.get('image') if isinstance(item.get('image'), str) else '')
        isbn = sp.get('isbn13') or ''
        synopsis = sp.get('synopsis') or ''

        # Extract publisher if provided in specs
        spec_pub = (sp.get('publisher') or '').lower()
        if 'phoenix' in spec_pub or 'pgi' in spec_pub:
            adapter = adapters[2]
        elif 'm&c' in spec_pub or 'clover' in spec_pub:
            adapter = adapters[1]
        elif 'elex' in spec_pub:
            adapter = adapters[0]

        # Stage-2 audit: re-classify with the rich spec data (store category
        # slugs). This is the real gate — vendor-feed categories are often
        # empty, specs carry the authoritative "buku/..." path.
        audit_status, audit_cat, audit_reason = classify_book(
            title, adapter.publisher_id,
            cat_slugs=sp.get('category_slugs') or item.get('category_slugs') or '',
            specs=sp,
            authors=item.get('author') or sp.get('Pengarang') or '',
        )
        if audit_status == 'REJECT':
            rejected_count += 1
            if slug in existing_books_map:
                # Legacy pollution: drop it from the catalog entirely.
                del existing_books_map[slug]
                print(f"     [AUDIT_PURGE] Removed legacy non-manga item: {title} ({audit_reason})")
            else:
                print(f"     [AUDIT_REJECT] {title} ({audit_reason})")
            continue
        cat = audit_cat or cat

        vol, sname = parse_title_smart(title)
        book_id = f"pub_{slug.replace('-', '_')}"

        # Bind-up / omnibus detection: pattern-based, so future bind-up
        # releases are categorized automatically (adaptive).
        bind_up_kind, bind_up_label = detect_bind_up(title, sname, adapter.publisher_id)

        if slug in existing_books_map:
            b = existing_books_map[slug]
            old_price = b.get('currentPrice')
            old_orig = b.get('originalPrice')
            old_avail = b.get('availability')

            # Determine if anything price-relevant changed. Also handles the
            # case where the stored price was missing (falsy) — previously the
            # new price was silently dropped and the book stayed stale forever.
            price_changed = bool(current_price) and old_price != current_price
            orig_changed = bool(original_price) and old_orig != original_price
            avail_changed = old_avail != availability

            if price_changed or orig_changed or avail_changed:
                # Dedup: skip if the last recorded snapshot already matches
                # (protects against double-recording on re-runs).
                last_snaps = price_snapshot_map.get(b['id'], [])
                last = last_snaps[-1] if last_snaps else None
                last_price = (last.get('currentPrice') if last else None) or (last.get('price') if last else None)
                last_orig = last.get('originalPrice') if last else None
                last_avail = last.get('availability') if last else None
                if not (last and last_price == current_price and last_orig == original_price and last_avail == availability):
                    snap = {
                        'id': f"snap_{b['id']}_{int(time.time())}",
                        'bookId': b['id'],
                        'price': current_price,
                        'currentPrice': current_price,
                        'originalPrice': original_price,
                        'previousPrice': old_price,
                        'availability': availability,
                        'observedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                        'source': 'gramedia_api'
                    }
                    new_snapshots.append(snap)
                    price_snapshot_map[b['id']].append(snap)

            # Always write the fresh values — never leave a stale/missing price.
            if current_price:
                b['currentPrice'] = current_price
            if original_price:
                b['originalPrice'] = original_price
            b['availability'] = availability

            if not b.get('volume') and vol:
                b['volume'] = vol
            if not b.get('isbn13') and isbn:
                b['isbn13'] = isbn
            if not b.get('coverImage') and cover:
                b['coverImage'] = cover
            if len(synopsis) > len(b.get('synopsis', '')):
                b['synopsis'] = synopsis
            # Recompute bind-up flag on every sync (idempotent backfill).
            b['isBindUp'] = bind_up_kind is not None
            b['bindUpKind'] = bind_up_kind
            b['bindUpLabel'] = bind_up_label
            updated_count += 1
        else:
            new_book = {
                'id': book_id,
                'slug': slug,
                'title': title,
                'originalTitle': sname or title,
                'seriesId': f"ser_{clean_slug(sname)}" if sname else None,
                'seriesName': sname,
                'volume': vol,
                'category': cat,
                'format': 'LIGHT_NOVEL' if cat == 'Light Novel' else 'MANGA',
                'publisherId': adapter.publisher_id,
                'publisherName': adapter.publisher_name,
                'publisherShortName': adapter.publisher_short,
                'coverImage': cover,
                'status': 'PUBLISHED' if rel_date <= datetime.now().strftime('%Y-%m-%d') else 'PREORDER',
                'availability': availability,
                'releaseDate': rel_date,
                'isWednesdayRelease': is_wednesday(rel_date),
                'currentPrice': current_price,
                'originalPrice': original_price,
                'authors': [item.get('author')] if item.get('author') else ['Berbagai Penulis'],
                'genres': [cat],
                'isbn13': isbn,
                'synopsis': synopsis or f"Rilisan resmi {cat} {title} terbitan {adapter.publisher_name}.",
                'gramediaUrl': f"https://www.gramedia.com/products/{slug}",
                'classificationStatus': 'ACCEPTED',
                'classificationConfidence': 0.95,
                'classificationReason': f"Verified {cat} from {adapter.publisher_short}",
                'isBindUp': bind_up_kind is not None,
                'bindUpKind': bind_up_kind,
                'bindUpLabel': bind_up_label,
            }
            existing_books_map[slug] = new_book
            inserted_count += 1

            new_snapshots.append({
                'id': f"snap_{book_id}_init",
                'bookId': book_id,
                'price': current_price,
                'currentPrice': current_price,
                'originalPrice': original_price,
                'availability': availability,
                'observedAt': rel_date,
                'source': 'gramedia_api'
            })

    # 5. Dynamic Franchise Medium Separation (Manga vs Light Novel vs Movie).
    # Applies the curated franchise aliases so the 2026-10-12 audit merges
    # survive every sync instead of decaying back into splits.
    all_books = list(existing_books_map.values())
    apply_franchise_separation(all_books)

    # 5b. Merge duplicate vendor listings (same product sold under two slugs).
    all_books, dupes_merged = merge_duplicate_listings(all_books, price_snapshot_map)

    # 5c. Edition & Set Consolidation (group by seriesId + volume).
    # Ported from one-time scripts/reconcile-catalog.py into the recurring
    # pipeline.
    all_books = consolidate_editions(all_books, price_snapshot_map)

    # 6. Reconstruct Series metadata
    new_series_list = reconstruct_series(all_books, existing_series_map)

    # 7. Finalize and save
    finished_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    duration_ms = int((time.time() - start_time) * 1000)

    catalog['lastUpdated'] = finished_at
    catalog['books'] = all_books
    catalog['series'] = new_series_list
    catalog['priceSnapshots'] = existing_price_snapshots + new_snapshots + refresh_snapshots

    sync_run = {
        'id': f"sync_{int(time.time())}",
        'startedAt': started_at,
        'finishedAt': finished_at,
        'sources': [a.publisher_short for a in adapters],
        'pagesFetched': len(adapters) * 8,
        'productsFetched': total_products_fetched,
        'productsAccepted': len(accepted_products),
        'productsRejected': rejected_count,
        'productsUpdated': updated_count,
        'productsInserted': inserted_count,
        'duplicatesResolved': dupes_merged,
        'errors': errors,
        'durationMs': duration_ms,
        'success': len(errors) == 0
    }

    all_snapshots = existing_price_snapshots + new_snapshots + refresh_snapshots
    catalog['lastUpdated'] = finished_at
    catalog['priceSnapshots'] = all_snapshots
    sync_runs = catalog.get('syncRuns', [])
    sync_runs.insert(0, sync_run)
    catalog['syncRuns'] = sync_runs[:20] # keep last 20

    # Consistency: report potential duplicate series (same normalized name)
    dupes = find_duplicate_series(catalog.get('series', []))
    if dupes:
        print(f"\n[consistency] {len(dupes)} potential duplicate series groups:")
        for norm_key, grp in sorted(dupes.items()):
            names = [f"'{s.get('name')}' [{s.get('id')}]" for s in grp]
            print(f"  - {norm_key}: {', '.join(names)}")

    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [SYNC_COMPLETE] Sync completed in {duration_ms}ms:")
    print(f"   - Products Fetched: {total_products_fetched}")
    print(f"   - Products Accepted: {len(accepted_products)}")
    print(f"   - Products Inserted: {inserted_count}, Updated: {updated_count}")
    print(f"   - New Price Snapshots: {len(new_snapshots)} (+{len(refresh_snapshots)} refresh)")

    # Auto-regenerate lightweight listing catalog for frontend performance.
    # NOTE: the module file is split-catalog.py (hyphenated), so it must be
    # loaded via importlib — a plain `from split_catalog import ...` can never
    # resolve and used to fail silently on every sync (2026-10-20 audit fix).
    try:
        _split_spec = importlib.util.spec_from_file_location(
            "split_catalog",
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "split-catalog.py"),
        )
        _split_mod = importlib.util.module_from_spec(_split_spec)
        _split_spec.loader.exec_module(_split_mod)
        _split_mod.split_catalog()
    except Exception as e:
        print(f"   [WARN] Could not regenerate catalog-listing.json: {e}")

    return True

def main():
    parser = argparse.ArgumentParser(description='Nuvellite Continuous Dynamic Catalog Synchronization Service')
    parser.add_argument('--daemon', action='store_true', help='Run continuously in background daemon mode')
    parser.add_argument('--interval', type=int, default=3600, help='Polling interval in seconds (default: 3600s = 1 hour)')
    parser.add_argument('--catalog', type=str, default=os.path.join(os.path.dirname(__file__), '../src/data/catalog.json'), help='Path to catalog.json')
    args = parser.parse_args()

    print(f"=== Nuvellite Dynamic Catalog Synchronization Service ===")
    print(f"Catalog Path: {args.catalog}")
    print(f"Daemon Mode: {args.daemon}")
    if args.daemon:
        print(f"Interval: {args.interval} seconds ({args.interval / 60:.1f} minutes)")

    # Initial sync
    run_sync(args.catalog)

    if args.daemon:
        print("\n[nuvellite:Daemon] Entering continuous polling loop...")
        while True:
            try:
                print(f"[nuvellite:Daemon] Sleeping for {args.interval}s until next sync cycle...")
                time.sleep(args.interval)
                run_sync(args.catalog)
            except KeyboardInterrupt:
                print("\n[nuvellite:Daemon] Gracefully shutting down...")
                break
            except Exception as e:
                print(f"[nuvellite:Daemon] Error in sync cycle: {e}")
                time.sleep(60)

if __name__ == '__main__':
    main()
