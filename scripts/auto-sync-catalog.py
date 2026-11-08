#!/usr/bin/env python3
"""
Nuvellite Continuous Dynamic Catalog Synchronization & Ingestion Engine
Backed by src/data/domain-rules.json for 100% parity with the TypeScript layer.
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adapters import ElexAdapter, MCAdapter, PGIAdapter
from catalog_consistency import (
    DOMAIN_RULES,
    validate_price,
    detect_junk_title,
    find_duplicate_series,
    normalize_series_name,
    resolve_base_alias,
    resolve_medium_alias,
)

_CLS_RULES = DOMAIN_RULES['classification']
_PARSE_RULES = DOMAIN_RULES['titleParsing']
_BIND_UP_RULES = DOMAIN_RULES['bindUp']

MERCHANDISE_REGEX = re.compile(
    r'\b(acrylic|akrilik|standee|keychain|key\s*ring|gantungan\s*kunci|tote\s*bag|totebag|sling\s*bag|backpack|tas|pouch|dompet|tumbler|mug|gelas|cushion|bantal|mousepad|desk\s*mat|tapestry|stickers?|stikers?|poker-|amulet|eye\s*mask|figures?|figurine|plush|boneka|monopoly|pin\s*badge|badge|lanyard|washi\s*tape|postcards?|poster|art\s*print|clear\s*file|clear\s*folder|5-layer\s*folder|folder|card\s*pack|booster\s*pack|kartu\s*koleksi|tarot|flash\s*card|reflection\s*card|t-?shirt|kaos|stationary|stationery|binder|notebook|buku\s*tulis|memo\s*pad|pencil\s*case|kotak\s*pensil|merchandise|merch|origami)\b',
    re.IGNORECASE
)

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

DISALLOWED_CATEGORY_SEGMENTS = set(_CLS_RULES['disallowedCategorySegments'])
DISALLOWED_PUBLISHERS = tuple(_CLS_RULES['disallowedPublishers'])
EXPLICIT_FORMAT_TOKENS = tuple(_CLS_RULES['explicitFormatTokens'])
KNOWN_NON_MANGA_SERIES = tuple(_CLS_RULES['knownNonMangaFragments'])
VERIFIED_LIGHT_NOVEL_FRAGMENTS = tuple(_CLS_RULES['verifiedLightNovelFragments'])
PGI_PROSE_NOVEL_FRAGMENTS = tuple(_CLS_RULES['pgiProseNovelFragments'])
TITLE_COUNTER_WORDS = set(_PARSE_RULES['titleCounterWords'])

# Notice: 'Tamat' and 'End' are ONLY matched when preceded by a delimiter or inside parentheses at the very end!
EDITION_SUFFIX_REGEX = re.compile(
    r'\s*[\-–—:+]?\s*\b(?:Special Set|Complete Set|Birthday Set|Limited Edition|Deluxe Edition|Premium Edition|Bundling(?: Set)?|Box Set|Regular|Reguler|Bookpaper|Edisi Khusus|Merchandise|Merch|Bonus|Akrilik|Standee)\b.*$'
    r'|\s*(?:[\-–—:+]\s*|\(\s*)(?:Tamat|End)\s*\)?\s*$',
    re.IGNORECASE
)

# Fixed: removed single `[a-zA-Z]` which stripped initial letters from titles like "V - Vendetta" or "X - 1999"
PREFIX_REGEX = re.compile(
    r'^(?:FS\s*-\s*)|^(?:Akasha|LC|Level\s*Comics?|Light\s*Comics?|m&c!|Elex|Koloni|Qanza|Komik|Movie\s*Story)\s*[:：\-]\s*|^(?:A\s+Light\s*Novel|Manga|Light\s*Novel|Novel)\s*[:：\-]?\s*',
    re.IGNORECASE
)


def _category_segments(cat_slugs):
    return [s.strip() for s in re.split(r'[/,;|]', (cat_slugs or '').lower().replace('_', '-')) if s.strip()]


def _has_comic_category(cat_slugs):
    for s in _category_segments(cat_slugs):
        if s in ('komik', 'manga', 'light-novel') or s.startswith(('komik-', 'manga-', 'light-novel')):
            return True
    return False


def clean_slug(text):
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', str(text or '')).lower()
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return re.sub(r'\bfeeling\b', 'feelings', slug)


def clean_base_franchise(name):
    raw = str(name or '').strip()
    # Preserve bracketed titles if the entire title is inside brackets (e.g. "[Oshi no Ko]")
    n = re.sub(r'\((?:novel|light\s*novel|manga|komik|omnibus|bind[\s-]?up(?:\s+edition)?|tamat|end)\)', '', raw, flags=re.I).strip()
    n_no_brackets = re.sub(r'\(.*?\)|\[.*?\]', '', n).strip()
    if len(n_no_brackets) >= 2 and not n_no_brackets.isdigit():
        n = n_no_brackets
    else:
        n = re.sub(r'[\[\]()]', ' ', n)
    # Strip trailing 'The Movie' before stripping 'Movie' so 'Detektif Conan The Movie' doesn't decay to 'Detektif Conan The'
    n = re.sub(r'\bThe\s+Movie\s+Story\b|\bThe\s+Movie\b', '', n, flags=re.I).strip(' :-–—')
    n = re.sub(r'\b(?:Novel|Light\s*Novel|Manga|Komik|Movie\s*Story|Movie)\b', '', n, flags=re.I).strip(' :-–—')
    n = re.sub(r'\b(?:New Edition|Deluxe Edition|Special Set|Limited Edition)\b', '', n, flags=re.I).strip(' :-–—')
    n = re.sub(r'(?:[\-–—:+]\s*|\(\s*)\b(?:Tamat|End)\b\s*\)?$', '', n, flags=re.I).strip(' :-–—')
    n = re.sub(r'\s+', ' ', n).strip()
    slug = clean_slug(n) or clean_slug(raw)
    return slug, n or raw


def parse_title_smart(title):
    raw = (title or '').strip()
    # Preserve bind-up marker inside parentheses before stripping parentheticals
    has_paren_bindup = bool(re.search(r'\(\s*bind[\s-]?up(?:\s+edition)?\s*\)', raw, re.I))

    t = re.sub(r'\((?:novel|light\s*novel|manga|komik|omnibus|bind[\s-]?up(?:\s+edition)?|tamat|end|new\s+edition|terbit\s+ulang|cetak\s+ulang|cover\s+baru)\)', '', raw, flags=re.I).strip()
    t_no_brackets = re.sub(r'\[.*?\]|\(.*?\)', '', t).strip()
    t = t_no_brackets if len(t_no_brackets) >= 2 else re.sub(r'[\[\]()]', ' ', t).strip()

    t = PREFIX_REGEX.sub('', t).strip()
    t_clean = EDITION_SUFFIX_REGEX.sub('', t).strip(' :-–—')

    # Protect X-in-1 marker ("4 in 1", "2 In 1") so the trailing "1" is never misparsed as volume 1
    x_in_1_match = re.search(r'\b([2-9])\s*(?:[-–])?\s*in\s*(?:[-–])?\s*1\b', t_clean, re.I)
    t_work = t_clean
    if x_in_1_match:
        t_work = (t_clean[:x_in_1_match.start()] + ' ' + t_clean[x_in_1_match.end():]).strip(' :-–—')

    vol = None
    sname = t_work

    # 1. Explicit volume prefix: Vol., Volume, Jilid, Episode, Ep., or # (note: # is non-word so outside \b!)
    m_vol = re.search(r'(?:\b(?:Vol\.?|Volume|Jilid|Episode|Ep\.?)|#)\s*(\d{1,3})\b', t_work, re.I)
    if m_vol:
        vol = int(m_vol.group(1))
        sname = t_work[:m_vol.start()].strip(' :-–—+#')
    else:
        # 2. "X of Y" volume numbering (e.g. "Jurnal Mukai Usagido 6 of 8", "I Sold My Life... 01 of 3")
        m_of = re.search(r'^(.*?\S)\s+(\d{1,3})\s+of\s+\d{1,3}\b', t_work, re.I)
        if m_of:
            vol = int(m_of.group(2))
            sname = m_of.group(1).strip(' :-–—')
        else:
            # 3. Decimal volume (e.g. "4.5")
            m_dec = re.search(r'\b(\d+)\.5\b', t_work)
            if m_dec:
                vol = int(m_dec.group(1))
                sname = t_work[:m_dec.start()].strip(' :-–—')
            else:
                # 4. Delimited volume: "<Series Name> <Vol> - <Subtitle>"
                m_delim = re.search(r'^(.*?\S)\s+(\d{1,3})\s*[\-–—:]\s*(.*)$', t_work)
                if m_delim:
                    # A delimited number is the volume, even after a counter
                    # word ("Seven Days 02 - ..."): Gramedia's dominant
                    # convention, and the behaviour the test suite locks in.
                    vol = int(m_delim.group(2))
                    sname = m_delim.group(1).strip()
                else:
                    # 5. Trailing number: "<Series Name> <Vol>"
                    m_end = re.search(r'^(.*?\S)\s+(\d{1,3})$', t_work)
                    if m_end:
                        # Trailing number is the volume (see delimited branch).
                        vol = int(m_end.group(2))
                        sname = m_end.group(1).strip()
                    else:
                        sname = t_work

    sname = re.sub(r'\s*[\-–—:]?\s*\b(?:New Edition|Deluxe Edition|Premium Edition|Edisi Khusus)\b.*$', '', sname, flags=re.I).strip(' :-–—')

    # Normalize bind-up series naming so "(Bind Up Edition)", "Bind Up Edition", and "Complete" stay unified
    if has_paren_bindup and not re.search(r'\bbind[\s-]?up\b', sname, re.I):
        sname = f'{sname} Bind Up'.strip()
    sname = re.sub(r'\bBind[\s-]?Up\s+Edition\b', 'Bind Up', sname, flags=re.I)
    sname = re.sub(r'\bShaman\s+King\s+Complete$', 'Shaman King Complete Edition', sname, flags=re.I)

    return vol, sname or t_clean or raw


def is_wednesday(date_str):
    if not date_str:
        return False
    try:
        dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
        return dt.weekday() == 2
    except Exception:
        return False


def _x_in_1_label(m):
    return f'{m.group(1)}-in-1'


BIND_UP_PATTERNS = [
    ('BIND_UP', re.compile(r'\bbind[\s-]?up\b', re.IGNORECASE), 'Bind Up'),
    ('OMNIBUS', re.compile(r'\bomnibus\b', re.IGNORECASE), 'Omnibus'),
    ('X_IN_1', re.compile(r'\b([2-9])\s*(?:[-–])?\s*in\s*(?:[-–])?\s*1\b', re.IGNORECASE), _x_in_1_label),
    ('COMPLETE_EDITION', re.compile(r'\bcomplete\s+edition\b', re.IGNORECASE), 'Complete Edition'),
    ('ULTIMATE_EDITION', re.compile(r'\bultimate(?:\s+edition|\s+\d{1,3}\b|\s*$)', re.IGNORECASE), 'Ultimate Edition'),
    ('DELUXE', re.compile(r'\bdeluxe(?:\s+edition|\s+\d{1,3}\b|\s*$)', re.IGNORECASE), 'Deluxe'),
    ('TRILOGY', re.compile(r'\btrilog[yi]\b', re.IGNORECASE), 'Trilogi'),
    ('EDISI_KOLEKSI', re.compile(r'\bedisi\s+koleksi\b', re.IGNORECASE), 'Edisi Koleksi'),
]

NON_BIND_UP_REGEXES = [re.compile(pat, re.IGNORECASE) for pat in _BIND_UP_RULES['nonBindUpPatterns']]

CURATED_BIND_UPS = [
    (re.compile(item['pattern'], re.IGNORECASE), item.get('publisherId', ''), item['kind'], item['label'])
    for item in _BIND_UP_RULES['curatedBindUps']
]


def detect_bind_up(title, series_name='', publisher_id=''):
    """Return (kind, label) for bind-up/omnibus editions, else (None, None)."""
    haystack = ' '.join(p for p in [title, series_name] if p)
    for rx in NON_BIND_UP_REGEXES:
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


def is_pgi_prose_novel(title, pub_id, cat_slugs=''):
    """True when a PGI listing is one of PGI's prose novels (no LN token)."""
    if pub_id != 'pub_pgi':
        return False
    t = (title or '').strip().lower()
    if 'fiksi-sastra' in _category_segments(cat_slugs):
        return True
    if t.startswith('novel:'):
        return True
    for frag in PGI_PROSE_NOVEL_FRAGMENTS:
        if frag in t and not re.search(r'\bvol\.?\s*\d|\s\d{1,2}$', t):
            return True
    return False


def is_pgi_rezero_ln(title, pub_id):
    """True only for PGI's main Re:Zero Light Novel line (not m&c!'s manga spin-offs like Frozen Bond / Chapter)."""
    if pub_id != 'pub_pgi':
        return False
    t = (title or '').lower()
    if 're:zero' not in t and 'rezero' not in t and 're zero' not in t:
        return False
    if any(m_tok in t for m_tok in ('frozen bond', 'chapter', 'komik', 'manga', 'truth of zero', 'aisatsu')):
        return False
    return True


def determine_book_medium(b):
    title = (b.get('title') or '').strip()
    t_lower = title.lower()
    pub_id = b.get('publisherId', '')
    cat_slugs = (b.get('categorySlugs') or '').lower()
    imprint = (b.get('imprint') or '').lower()
    genres = [str(g).lower() for g in (b.get('genres') or [])]

    has_ln_token = (
        'light novel' in t_lower
        or 'light-novel' in t_lower
        or '(novel)' in t_lower
        or 'the novel' in t_lower
        or 'light-novel' in cat_slugs
    )
    if has_ln_token:
        return 'LIGHT_NOVEL'

    for frag in VERIFIED_LIGHT_NOVEL_FRAGMENTS:
        if frag in t_lower:
            return 'LIGHT_NOVEL'

    if 'movie' in t_lower or 'movie story' in t_lower:
        return 'MOVIE'

    if pub_id == 'pub_pgi':
        if is_pgi_rezero_ln(title, pub_id):
            return 'LIGHT_NOVEL'
        if is_pgi_prose_novel(title, pub_id, cat_slugs):
            return 'LIGHT_NOVEL'
        return 'MANGA'

    is_clover_novel = pub_id == 'pub_mnc' and (
        t_lower.startswith('clover')
        or 'clover' in imprint
        or 'novel-6' in cat_slugs
        or any('novel' in g for g in genres)
        or t_lower.startswith('eighty six')
    )
    if is_clover_novel:
        return 'LIGHT_NOVEL'

    if b.get('category') == 'Light Novel' and not any(k in t_lower for k in ['komik', 'manga', 'level comic', 'lc:']):
        return 'LIGHT_NOVEL'

    return 'MANGA'


def resolve_official_publisher(spec_pub, imprint='', fallback_adapter=None, adapters=None, from_global_search=False):
    """Verify publisher from spec_pub/imprint. Returns matching adapter or None if disallowed/foreign."""
    combined = f"{spec_pub or ''} {imprint or ''}".strip().lower()
    if any(dp in combined for dp in DISALLOWED_PUBLISHERS):
        return None
    if adapters:
        by_id = {a.publisher_id: a for a in adapters}
        if any(k in combined for k in ('phoenix', 'pgi', 'kadokawa')):
            return by_id.get('pub_pgi')
        if any(k in combined for k in ('m&c', 'm & c', 'akasha', 'koloni', 'clover')):
            return by_id.get('pub_mnc')
        if any(k in combined for k in ('elex', 'level comic')):
            return by_id.get('pub_elex')
    # If product came from global search and specs carry a non-empty publisher that didn't match the 3 official publishers, reject it!
    if from_global_search and combined:
        return None
    return fallback_adapter


def classify_book(title, pub_id, cat_slugs='', existing_cat=None, specs=None, authors='', stage='full'):
    """Multi-signal classification (mirrors src/lib/data/classifier.ts).

    - stage='feed': pre-spec check on vendor feed (defers NON_MANGA_LN_REGEX
      when category_slugs is empty so real manga with words like 'Teka-Teki'
      are not rejected before their comic store category is fetched).
    - stage='full': post-spec check requiring positive evidence on non-PGI feeds.
    """
    t = (title or '').strip()
    t_lower = t.lower()
    cat = (cat_slugs or '').lower()
    segs = _category_segments(cat)
    authors_lower = (authors or '').lower()
    specs = specs or {}
    imprint = (specs.get('Imprint') or specs.get('imprint') or specs.get('Penerbit') or specs.get('publisher') or '').lower()
    pub_spec = (specs.get('Penerbit') or specs.get('publisher') or '').lower()

    pgi_prose = is_pgi_prose_novel(t, pub_id, cat_slugs)

    # 1. Unconditional negative gates
    if MERCHANDISE_REGEX.search(t):
        return 'REJECT', None, 'Matched merchandise title pattern'
    if 'merchandise' in authors_lower:
        return 'REJECT', None, 'Author credit is merchandise (non-book product)'

    junk_reason = detect_junk_title(t)
    if junk_reason:
        return 'REJECT', None, f'Junk title pattern: {junk_reason}'

    if t_lower.startswith('qanza'):
        return 'REJECT', None, 'Qanza imprint (non-manga children imprint)'

    for dp in DISALLOWED_PUBLISHERS:
        if dp in pub_spec:
            return 'REJECT', None, f'Disallowed publisher: {dp}'

    for known in KNOWN_NON_MANGA_SERIES:
        if known in t_lower:
            return 'REJECT', None, f'Known non-manga/non-LN series: {known}'

    if t_lower.startswith('clover ') and CRAFT_SUPPLY_REGEX.search(t):
        return 'REJECT', None, 'Clover craft supply (non-book product)'

    has_comic_cat = _has_comic_category(cat)
    has_explicit_token = any(tok in t_lower for tok in EXPLICIT_FORMAT_TOKENS)

    if CRAFT_SUPPLY_REGEX.search(t) and cat_slugs and not has_comic_cat:
        return 'REJECT', None, 'Craft supply (non-comic store category)'

    # 2. Title negative regex: in 'feed' stage with empty cat_slugs, defer unless clearly non-book
    if not has_comic_cat and not has_explicit_token and not pgi_prose:
        if stage == 'full' or cat_slugs:
            if NON_MANGA_LN_REGEX.search(t):
                return 'REJECT', None, 'Matched non-manga/non-LN title pattern'

    # 3. Disallowed store category
    if not has_explicit_token and not has_comic_cat:
        for s in segs:
            if s in DISALLOWED_CATEGORY_SEGMENTS:
                if s == 'fiksi-sastra' and pgi_prose:
                    continue
                return 'REJECT', None, f'Matched disallowed store category: {s}'

    # 4. Medium & Positive Signal Verification
    has_ln_token = (
        'light novel' in t_lower or 'light-novel' in t_lower or '(novel)' in t_lower or 'the novel' in t_lower
        or 'light-novel' in cat
    )
    is_verified_ln = any(frag in t_lower for frag in VERIFIED_LIGHT_NOVEL_FRAGMENTS)
    is_clover = pub_id == 'pub_mnc' and (
        t_lower.startswith('clover') or 'clover' in imprint or 'novel-6' in cat or t_lower.startswith('eighty six')
    )
    has_volume_num = bool(
        re.search(r'(?:\b(?:vol\.?|volume|jilid|ep\.?|episode)|#)\s*\d+', t, re.I)
        or re.search(r'\s+\d{1,3}$', t)
    )

    if pub_id == 'pub_pgi':
        is_ln = has_ln_token or pgi_prose or is_pgi_rezero_ln(t, pub_id) or is_verified_ln
    else:
        is_ln = has_ln_token or is_clover or is_verified_ln

    # Positive evidence check in 'full' stage: prevent random non-manga Elex/m&c! books
    # with empty or generic categories (and no volume/format/imprint signal) from slipping in.
    if stage == 'full':
        has_positive = (
            has_comic_cat
            or has_explicit_token
            or is_ln
            or pgi_prose
            or any(imp in imprint for imp in ('level', 'akasha', 'koloni', 'clover', 'phoenix', 'kadokawa'))
            or (pub_id == 'pub_pgi' and has_volume_num)
            or (has_volume_num and not cat_slugs)
        )
        if not has_positive:
            return 'REJECT', None, 'Insufficient positive manga/LN signals on full spec check'

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
        if max_v >= 3 and len(set(vols)) < max_v:
            gap_series.append((sname, max_v - len(set(vols))))

    gap_series.sort(key=lambda x: x[1], reverse=True)
    print(f"  -> [GAP_DISCOVERY] Found {len(gap_series)} series with missing sequence volumes.")

    gap_products = []
    for sname, missing_count in gap_series[:15]:
        print(f"     Searching backlist/OOS for '{sname}' ({missing_count} missing volumes)...")
        try:
            prods = adapter.search_products(sname, is_available_only=False, max_pages=3)
            for p in prods:
                p['_from_global_search'] = True
            gap_products.extend(prods)
        except Exception as e:
            print(f"     [GAP_QUERY_ERROR] {sname}: {e}")

    return gap_products


def _norm_title_key(title):
    return re.sub(r'[^a-z0-9]+', ' ', (title or '').lower()).strip()


def apply_franchise_separation(all_books):
    """Step 5: Dynamic Franchise Medium Separation (Manga vs Light Novel vs Movie)."""
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
        med = determine_book_medium(b)
        canon_slug, canon_name = resolve_medium_alias(base_slug, med)
        if canon_name:
            franchise_canonical_names[canon_slug] = canon_name
        franchise_mediums[canon_slug].add(med)

    for b in all_books:
        base_slug, _, sname = base_of(b)
        med = determine_book_medium(b)
        canon_slug, canon_name = resolve_medium_alias(base_slug, med)
        base_slug = canon_slug
        base_name = canon_name or franchise_canonical_names.get(base_slug, sname)

        has_multiple = len(franchise_mediums[base_slug]) > 1

        if has_multiple:
            if med == 'LIGHT_NOVEL':
                sid = f"ser_{base_slug}-ln"
                s_display = f"{base_name} (Novel)" if not base_name.lower().endswith('(novel)') else base_name
                b['category'] = 'Light Novel'
                b['format'] = 'LIGHT_NOVEL'
            elif med == 'MOVIE':
                sid = f"ser_{base_slug}-movie"
                s_display = base_name if base_name.lower().endswith('movie') else f"{base_name} Movie"
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
                s_display = f"{s_display} Movie"
            b['category'] = 'Light Novel' if med == 'LIGHT_NOVEL' else 'Manga'
            b['format'] = 'LIGHT_NOVEL' if med == 'LIGHT_NOVEL' else 'MANGA'

        b['seriesId'] = sid
        b['seriesName'] = s_display

    return all_books


def _book_completeness(b):
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
    """Step 5b: merge duplicate vendor listings of the same product."""
    series_pub_majority = {}
    pub_counts = defaultdict(Counter)
    for b in all_books:
        if b.get('seriesId'):
            pub_counts[b['seriesId']][b.get('publisherId')] += 1
    for sid, counts in pub_counts.items():
        if counts and len(counts.most_common(1)) > 0:
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
        if not b_list:
            continue
        if len(b_list) == 1:
            merged.append(b_list[0])
            continue
        sid = key[0] if (key and len(key) > 0) else ''
        majority_pub = series_pub_majority.get(sid)

        def rank(b):
            return (
                0 if b.get('publisherId') == majority_pub else 1,
                -_book_completeness(b),
                b.get('slug') or '',
            )

        ordered = sorted(b_list, key=rank)
        if not ordered:
            continue
        keep = ordered[0]
        folded_slugs = set(keep.get('foldedVariantSlugs') or [])
        for dup in ordered[1:]:
            if dup.get('slug'):
                folded_slugs.add(dup['slug'])
            for field in ('coverImage', 'isbn13', 'synopsis', 'gramediaUrl',
                          'releaseDate', 'authors', 'genres', 'categorySlugs', 'imprint'):
                if not keep.get(field) and dup.get(field):
                    keep[field] = dup[field]
            if not keep.get('availableEditions') and dup.get('availableEditions'):
                keep['availableEditions'] = dup['availableEditions']
            if price_snapshot_map is not None and dup['id'] in price_snapshot_map:
                del price_snapshot_map[dup['id']]
            dropped_ids.add(dup['id'])
            print(f"  [dup-merge] {dup['title']} ({dup['id']}) -> {keep['id']}")
        if folded_slugs:
            keep['foldedVariantSlugs'] = sorted(folded_slugs)
        merged.append(keep)

    passthrough = [b for b in all_books
                   if not b.get('seriesId') or b.get('volume') is None]
    result = merged + passthrough
    if dropped_ids:
        print(f"  [dup-merge] merged {len(dropped_ids)} duplicate listings")
    return result, len(dropped_ids)


def _edition_base_title(title):
    stripped = EDITION_SUFFIX_REGEX.sub('', title or '').strip(' :-–—+')
    return _norm_title_key(stripped)


_EDITION_MARKER_RE = re.compile(
    r"\n\nPilihan Edisi & Set Resmi: "
    r"(?:Regular|Special Set|Birthday Set|Complete Set|Limited Edition)"
    r"(?:, (?:Regular|Special Set|Birthday Set|Complete Set|Limited Edition))*"
    r"\s*$"
)

_SPECIAL_EDITION_REGEX = re.compile(
    r'\b(?:special\s+set|birthday\s+set|limited\s+edition|complete\s+set|box\s+set|bundling(?:\s+set)?)\b',
    re.IGNORECASE
)


def _strip_edition_marker(synopsis):
    if not synopsis:
        return synopsis
    return _EDITION_MARKER_RE.sub("", synopsis)


def consolidate_editions(all_books, price_snapshot_map=None):
    """Step 5c: fold edition variants into the canonical volume's availableEditions.

    Does NOT pollute the Regular book's priceSnapshots with Special Set prices;
    instead drops folded variant snapshots cleanly and records foldedVariantSlugs.
    """
    series_vol_map = defaultdict(list)
    for b in all_books:
        series_vol_map[(b.get('seriesId'), b.get('volume'))].append(b)

    canonical_books = []
    for (sid, v), b_list in series_vol_map.items():
        title_groups = defaultdict(list)
        for b in b_list:
            b['synopsis'] = _strip_edition_marker(b.get('synopsis'))
            title_groups[_edition_base_title(b.get('title'))].append(b)

        for tkey, t_list in title_groups.items():
            if not t_list:
                continue
            if len(t_list) == 1:
                single = t_list[0]
                if len(single.get('availableEditions') or []) > 1:
                    ed_names = ', '.join(e['name'] for e in single['availableEditions'] if isinstance(e, dict) and 'name' in e)
                    single['synopsis'] = (single.get('synopsis') or '') + f"\n\nPilihan Edisi & Set Resmi: {ed_names}"
                canonical_books.append(single)
                continue

            regular = next(
                (b for b in t_list if not _SPECIAL_EDITION_REGEX.search(b.get('title') or '')),
                t_list[0] if len(t_list) > 0 else None,
            )
            if not regular:
                continue
            editions = []
            seen_ed_urls = set()
            # Preserve previously stored editions if any
            for prev_ed in (regular.get('availableEditions') or []):
                u = prev_ed.get('gramediaUrl') or prev_ed.get('name')
                if u and u not in seen_ed_urls:
                    seen_ed_urls.add(u)
                    editions.append(prev_ed)

            folded_slugs = set(regular.get('foldedVariantSlugs') or [])
            for b in t_list:
                ed_name = 'Regular'
                t_low = (b.get('title') or '').lower()
                if 'special set' in t_low:
                    ed_name = 'Special Set'
                elif 'birthday set' in t_low:
                    ed_name = 'Birthday Set'
                elif 'complete set' in t_low or 'box set' in t_low:
                    ed_name = 'Complete Set'
                elif 'limited edition' in t_low or re.search(r'[\-–—(]\s*limited\b', t_low):
                    ed_name = 'Limited Edition'

                ed_obj = {
                    'name': ed_name,
                    'price': b.get('currentPrice'),
                    'gramediaUrl': b.get('gramediaUrl'),
                }
                u = ed_obj['gramediaUrl'] or ed_obj['name']
                if u not in seen_ed_urls:
                    seen_ed_urls.add(u)
                    editions.append(ed_obj)
                else:
                    for idx, ex_ed in enumerate(editions):
                        if (ex_ed.get('gramediaUrl') or ex_ed.get('name')) == u:
                            editions[idx] = ed_obj

                if b['id'] != regular['id']:
                    if b.get('slug'):
                        folded_slugs.add(b['slug'])
                    if price_snapshot_map is not None and b['id'] in price_snapshot_map:
                        del price_snapshot_map[b['id']]

            regular['title'] = EDITION_SUFFIX_REGEX.sub(
                '', regular.get('title') or '').strip(' :-–—+')
            regular['availableEditions'] = editions
            if folded_slugs:
                regular['foldedVariantSlugs'] = sorted(folded_slugs)
            if len(editions) > 1:
                regular['synopsis'] = (regular.get('synopsis') or '') + \
                    f"\n\nPilihan Edisi & Set Resmi: {', '.join(e['name'] for e in editions)}"
            canonical_books.append(regular)

    seen_titles = set()
    deduped = []
    for b in canonical_books:
        key = (b.get('seriesId'), clean_slug(b.get('title')))
        if key in seen_titles:
            if price_snapshot_map is not None and b.get('id') in price_snapshot_map:
                del price_snapshot_map[b['id']]
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
        if not b_list:
            continue
        sample = b_list[0]
        cat = sample.get('category', 'Manga')
        pub_id = sample.get('publisherId', '')
        pub_name = sample.get('publisherName', '')

        vols = [b['volume'] for b in b_list if isinstance(b.get('volume'), int) and b['volume'] > 0]
        avail_vols = sorted(list(set(vols))) if vols else []
        latest_vol = max(avail_vols) if avail_vols else 1
        total_vols = max(len(avail_vols), latest_vol) if avail_vols else len(b_list)

        missing_vols = []
        if avail_vols and latest_vol > 1:
            avail_set = set(avail_vols)
            missing_vols = [v for v in range(1, latest_vol + 1) if v not in avail_set]

        ex = existing_series_map.get(sid)
        has_end_marker = any(
            re.search(r'(?:[\-–—:+]\s*|\(\s*)\b(?:Tamat|End)\b', b.get('title') or '', re.I)
            for b in b_list
        )
        status = 'COMPLETED' if (has_end_marker or (ex and ex.get('status') == 'COMPLETED')) else 'ONGOING'

        s_name = sample.get('seriesName') or sample.get('title')
        cover = next((b['coverImage'] for b in b_list if b.get('coverImage')), '')
        if not cover and ex:
            cover = ex.get('coverImage', '')

        author_list = sample.get('authors')
        author = author_list[0] if (isinstance(author_list, list) and len(author_list) > 0) else 'Berbagai Penulis'
        if (not author or author in ('Various Authors', 'Berbagai Penulis')) and ex:
            author = ex.get('author', author)

        first_vol = next((b for b in b_list if b.get('volume') == 1 and len(b.get('synopsis', '')) > 50), None)
        if not first_vol:
            first_vol = next((b for b in b_list if len(b.get('synopsis', '')) > 50), b_list[0] if len(b_list) > 0 else {})
        s_desc = (first_vol.get('synopsis') or f"Diterbitkan resmi oleh {pub_name}.")
        s_desc = s_desc.split('\n\nPilihan Edisi & Set Resmi:')[0]

        series_obj = {
            'id': sid,
            'slug': sid.replace('ser_', ''),
            'name': s_name,
            'originalTitle': s_name,
            'publisherId': pub_id,
            'publisherName': pub_name,
            'author': author,
            'type': 'LIGHT_NOVEL' if cat == 'Light Novel' or sid.endswith('-ln') else 'MANGA',
            'status': status,
            'totalVolumes': total_vols,
            'latestVolume': latest_vol,
            'availableVolumes': avail_vols,
            'missingVolumes': missing_vols,
            'coverImage': cover,
            'description': s_desc
        }
        new_series_list.append(series_obj)

    new_series_list.sort(key=lambda s: s['name'].lower())
    return new_series_list


def sweep_legacy_books(all_books):
    """Purge any stored book that violates unconditional negative rules or repair its parsed volume/series."""
    purged_ids = set()
    for b in all_books:
        title = (b.get('title') or '').strip()
        pub_id = b.get('publisherId') or ''
        cat_slugs = b.get('categorySlugs') or ''
        authors = ' '.join(b.get('authors') or [])
        status, _, reason = classify_book(
            title, pub_id, cat_slugs=cat_slugs,
            specs={'Imprint': b.get('imprint') or ''},
            authors=authors, stage='feed'
        )
        if status == 'REJECT':
            purged_ids.add(b.get('id'))
            print(f"     [LEGACY_SWEEP] Removed legacy non-manga item: {title} ({reason})")
            continue
        # Re-parse title smartly to repair historical '#1', 'End', 'X of Y', and '4 in 1' bugs
        vol, sname = parse_title_smart(title)
        if vol is not None:
            b['volume'] = vol
        if sname:
            b['seriesName'] = sname
        kind, label = detect_bind_up(title, sname, pub_id)
        b['isBindUp'] = kind is not None
        b['bindUpKind'] = kind
        b['bindUpLabel'] = label

    kept = [b for b in all_books if b.get('id') not in purged_ids]
    return kept, purged_ids


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
    folded_slug_to_parent = {}
    for b in catalog.get('books', []):
        for fslug in (b.get('foldedVariantSlugs') or []):
            folded_slug_to_parent[fslug] = b

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
    accepted_products = {}
    rejected_count = 0
    errors = []

    # 1. Vendor feed discovery (Stage 1: 'feed' stage classification)
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
                    stage='feed',
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
        if adapters and len(adapters) > 0:
            gap_products = discover_sequence_gaps(existing_books_map.values(), adapters[0])
            print(f"     Discovered {len(gap_products)} candidate products from gap search.")
            for item in gap_products:
                slug = item.get('slug')
                title = (item.get('title') or item.get('name') or '').strip()
                if not slug or not title or slug in accepted_products:
                    continue

                status, cat, reason = classify_book(
                    title, adapters[0].publisher_id,
                    cat_slugs=item.get('category_slugs') or '',
                    authors=item.get('author') or '',
                    stage='feed',
                )
                if status == 'REJECT':
                    rejected_count += 1
                    continue

                accepted_products[slug] = (item, adapters[0], cat)
                total_products_fetched += 1
    except Exception as e:
        print(f"     [ERROR in gap discovery]: {e}")

    if total_products_fetched == 0 and len(existing_books_map) > 0:
        print(f"[WARNING] [EMPTY_CATALOG_SAFETY] 0 products fetched from sources. Preserving last-known-good catalog.")
        return False

    print(f"  -> [CLASSIFICATION_STAGE_1] Candidates: {len(accepted_products)}, Rejected: {rejected_count}")

    # 2.5. Stale price & availability refresh
    accepted_slugs = set(accepted_products.keys())
    stale_candidates = [
        slug for slug, book in existing_books_map.items()
        if slug not in accepted_slugs and not (book.get('isArchive') and not book.get('gramediaUrl'))
    ]

    print(f"  -> [PRICE_REFRESH] Checking {len(stale_candidates)} catalog books not in vendor feed...")
    refreshed_count = 0
    refresh_snapshots = []

    def refresh_price_task(slug):
        if not adapters:
            return slug, None
        adapter = adapters[0]
        try:
            specs = adapter.fetch_product_specs(slug)
            if not specs:
                return slug, None
            final_p = specs.get('price') or 0
            slice_p = specs.get('original_price') or 0
            if not final_p:
                return slug, None
            current_price = final_p
            original_price = slice_p if slice_p > current_price else current_price
            is_oos = specs.get('is_oos', False)
            return slug, (current_price, original_price, is_oos)
        except Exception:
            return slug, None

    with ThreadPoolExecutor(max_workers=4) as executor:
        for slug, result in executor.map(refresh_price_task, stale_candidates):
            if not result:
                continue
            current_price, original_price, is_oos = result
            book = existing_books_map.get(slug)
            if not book:
                continue
            new_avail = 'OUT_OF_STOCK' if is_oos else 'AVAILABLE'
            old_price = book.get('currentPrice')
            old_orig = book.get('originalPrice')
            old_avail = book.get('availability', 'AVAILABLE')
            if old_price != current_price or old_orig != original_price or old_avail != new_avail:
                snap = {
                    'id': f"snap_{book['id']}_{int(time.time())}",
                    'bookId': book['id'],
                    'price': current_price,
                    'currentPrice': current_price,
                    'originalPrice': original_price,
                    'previousPrice': old_price,
                    'availability': new_avail,
                    'observedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                    'source': 'gramedia_api_refresh'
                }
                refresh_snapshots.append(snap)
                price_snapshot_map[book['id']].append(snap)
                book['currentPrice'] = current_price
                book['originalPrice'] = original_price
                book['availability'] = new_avail
                refreshed_count += 1

    print(f"  -> [PRICE_REFRESH] Updated {refreshed_count} stale prices/availabilities.")

    # 3. Concurrently fetch specs for new or incomplete products (skipping known folded variant slugs)
    to_fetch_specs = []
    for slug, (item, adapter, cat) in accepted_products.items():
        if slug in folded_slug_to_parent:
            continue
        ex = existing_books_map.get(slug)
        if not ex or not ex.get('isbn13') or not ex.get('releaseDate') or not ex.get('categorySlugs') or ex.get('availability') == 'OUT_OF_STOCK':
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

    # 4. Ingest and update books (Stage 2: 'full' classification with specs)
    inserted_count = 0
    updated_count = 0
    new_snapshots = []

    for slug, (item, adapter, cat) in accepted_products.items():
        if slug in folded_slug_to_parent:
            continue
        title = (item.get('title') or item.get('name') or '').strip()
        sp = fetched_specs.get(slug) or {}
        ex = existing_books_map.get(slug)

        slice_price = sp.get('original_price') or item.get('slice_price') or 0
        final_price = sp.get('price') or item.get('final_price') or slice_price or 0
        current_price = final_price
        original_price = slice_price if slice_price > current_price else current_price

        _pvalid, _pissues, _pfc, _pfo = validate_price(current_price, original_price)
        if _pfc is not None:
            current_price, original_price = _pfc, _pfo
        for _iss in _pissues:
            print(f"  [price-warn] {slug}: {_iss}")

        _junk = detect_junk_title(title)
        if _junk:
            print(f"  [junk-skip] {slug}: {_junk}")
            continue

        is_oos = sp.get('is_oos') if sp.get('is_oos') is not None else item.get('is_oos', False)
        availability = 'OUT_OF_STOCK' if is_oos else 'AVAILABLE'

        # Never stamp missing dates on old books with today's date unless it's a brand-new listing with no date anywhere
        rel_date = (
            sp.get('releaseDate')
            or (ex.get('releaseDate') if ex else None)
            or adapter.parse_indonesian_date(item.get('release_date'))
        )
        cover = (
            sp.get('coverImage')
            or sp.get('coverUrl')
            or sp.get('image')
            or (item.get('coverImage') if isinstance(item.get('coverImage'), str) else '')
            or (item.get('coverUrl') if isinstance(item.get('coverUrl'), str) else '')
            or (item.get('image') if isinstance(item.get('image'), str) else '')
            or ''
        )
        isbn = sp.get('isbn13') or ''
        synopsis = sp.get('synopsis') or ''
        cat_slugs = sp.get('category_slugs') or (ex.get('categorySlugs') if ex else '') or item.get('category_slugs') or ''
        imprint_val = sp.get('imprint') or (ex.get('imprint') if ex else '') or ''

        # Strict publisher verification (blocks foreign publishers from global search)
        from_search = bool(item.get('_from_global_search'))
        resolved_adapter = resolve_official_publisher(
            sp.get('publisher'),
            imprint=imprint_val,
            fallback_adapter=adapter,
            adapters=adapters,
            from_global_search=from_search,
        )
        if resolved_adapter is None:
            rejected_count += 1
            continue
        adapter = resolved_adapter

        audit_status, audit_cat, audit_reason = classify_book(
            title, adapter.publisher_id,
            cat_slugs=cat_slugs,
            specs=sp or {'Imprint': imprint_val},
            authors=sp.get('author') or item.get('author') or '',
            stage='full',
        )
        if audit_status == 'REJECT':
            rejected_count += 1
            if slug in existing_books_map:
                del existing_books_map[slug]
                print(f"     [AUDIT_PURGE] Removed legacy non-manga item: {title} ({audit_reason})")
            else:
                print(f"     [AUDIT_REJECT] {title} ({audit_reason})")
            continue
        cat = audit_cat or cat

        vol, sname = parse_title_smart(title)
        book_id = f"pub_{slug.replace('-', '_')}"
        bind_up_kind, bind_up_label = detect_bind_up(title, sname, adapter.publisher_id)

        if slug in existing_books_map:
            b = existing_books_map[slug]
            old_price = b.get('currentPrice')
            old_orig = b.get('originalPrice')
            old_avail = b.get('availability')

            price_changed = bool(current_price) and old_price != current_price
            orig_changed = bool(original_price) and old_orig != original_price
            avail_changed = old_avail != availability

            if price_changed or orig_changed or avail_changed:
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

            if current_price:
                b['currentPrice'] = current_price
            if original_price:
                b['originalPrice'] = original_price
            b['availability'] = availability
            if rel_date and not b.get('releaseDate'):
                b['releaseDate'] = rel_date
                b['isWednesdayRelease'] = is_wednesday(rel_date)
            if cat_slugs:
                b['categorySlugs'] = cat_slugs
            if imprint_val:
                b['imprint'] = imprint_val
            if vol is not None:
                b['volume'] = vol
            if sname:
                b['seriesName'] = sname
            if not b.get('isbn13') and isbn:
                b['isbn13'] = isbn
            if not b.get('coverImage') and cover:
                b['coverImage'] = cover
            if isbn and b.get('isbn13') and isbn != b['isbn13']:
                b['isbn13'] = isbn
                if cover:
                    b['coverImage'] = cover
            if len(synopsis) > len(b.get('synopsis', '')):
                b['synopsis'] = synopsis
            b['isBindUp'] = bind_up_kind is not None
            b['bindUpKind'] = bind_up_kind
            b['bindUpLabel'] = bind_up_label
            updated_count += 1
        else:
            author_str = sp.get('author') or item.get('author') or ''
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
                'imprint': imprint_val or None,
                'categorySlugs': cat_slugs or None,
                'coverImage': cover,
                'status': 'PREORDER' if (rel_date and rel_date > datetime.now().strftime('%Y-%m-%d')) else 'PUBLISHED',
                'availability': availability,
                'releaseDate': rel_date,
                'isWednesdayRelease': is_wednesday(rel_date),
                'currentPrice': current_price,
                'originalPrice': original_price,
                'authors': [author_str] if author_str else ['Berbagai Penulis'],
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

            init_snap = {
                'id': f"snap_{book_id}_init",
                'bookId': book_id,
                'price': current_price,
                'currentPrice': current_price,
                'originalPrice': original_price,
                'availability': availability,
                'observedAt': rel_date or datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                'source': 'gramedia_api'
            }
            new_snapshots.append(init_snap)
            price_snapshot_map[book_id].append(init_snap)

    # 5. Legacy sweep & parser repair on all stored books
    all_books, purged_ids = sweep_legacy_books(list(existing_books_map.values()))

    # 5a. Dynamic Franchise Medium Separation
    apply_franchise_separation(all_books)

    # 5b. Merge duplicate vendor listings
    all_books, dupes_merged = merge_duplicate_listings(all_books, price_snapshot_map)

    # 5c. Edition & Set Consolidation
    all_books = consolidate_editions(all_books, price_snapshot_map)

    # 6. Reconstruct Series metadata
    new_series_list = reconstruct_series(all_books, existing_series_map)

    # 7. Prune any orphan price snapshots so only active canonical bookIds remain
    surviving_book_ids = {b['id'] for b in all_books}
    clean_snapshots = [
        snap for bid, snaps in price_snapshot_map.items()
        if bid in surviving_book_ids
        for snap in snaps
    ]

    finished_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    duration_ms = int((time.time() - start_time) * 1000)

    catalog['lastUpdated'] = finished_at
    catalog['books'] = all_books
    catalog['series'] = new_series_list
    catalog['priceSnapshots'] = clean_snapshots

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

    sync_runs = catalog.get('syncRuns', [])
    sync_runs.insert(0, sync_run)
    catalog['syncRuns'] = sync_runs[:20]

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
    print(f"   - Active Price Snapshots: {len(clean_snapshots)}")

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

    run_sync(args.catalog)

    if args.daemon:
        while True:
            try:
                time.sleep(args.interval)
                run_sync(args.catalog)
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"[nuvellite:Daemon] Error in sync cycle: {e}")
                time.sleep(60)


if __name__ == '__main__':
    main()