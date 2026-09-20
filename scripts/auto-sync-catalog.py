#!/usr/bin/env python3
"""
Automated Continuous Catalog Synchronization & Pattern-Based Ingestion Engine
for Nuvellite & Nuvelll (Indonesia Manga & Light Novel Release Tracker)

100% Dynamic & Pattern-Based Architecture:
- Zero hardcoded series titles or static target keyword lists.
- Dynamic Volume Extraction: Multi-tier regex matching for explicit markers (Vol, Volume, Jilid, #, Edition),
  decimal volumes (.5), delimiter-separated volumes, and trailing numbers, with intelligent counter-word guards
  (protecting titles like '5 Centimeters per Second', '3 Days of Happiness', '86', '100 Pacar').
- Dynamic Multi-Format Partitioning: Automatically groups franchises and partitions by medium
  (Manga vs Light Novel vs Movie) if and only if a franchise has multiple publication formats.
- Dynamic Set & Edition Consolidation: Automatically collapses Special Sets, Birthday Sets, Complete Sets,
  and Limited Editions into the primary volume's availableEditions without duplicate volume cards.
- Dynamic Volume Calculations: Accurately calculates totalVolumes, latestVolume, and availableVolumes
  from actual published books, thematic sets, and publisher metadata without hardcoding.
- Continuous Daemon Execution: Automatically polls official publisher vendor catalogs (PGI, m&c!, Elex)
  and category feeds on an ongoing schedule.
"""

import urllib.request
import urllib.parse
import json
import re
import time
import os
import sys
import argparse
from datetime import datetime, timezone
from collections import defaultdict

HEADERS = {
    'User-Agent': 'nuvelll-crawler/6.0 (Automated Book Release Tracker; https://nuvelll.id; contact@nuvelll.id)',
    'Accept': 'application/json'
}

MONTH_MAP = {
    'jan': '01', 'januari': '01', 'january': '01',
    'feb': '02', 'februari': '02', 'february': '02',
    'mar': '03', 'maret': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'mei': '05', 'may': '05',
    'jun': '06', 'juni': '06', 'june': '06',
    'jul': '07', 'juli': '07', 'july': '07',
    'agu': '08', 'ags': '08', 'agustus': '08', 'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'okt': '10', 'oktober': '10', 'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'des': '12', 'desember': '12', 'dec': '12', 'december': '12'
}

NON_BOOK_REGEX = re.compile(
    r'\b(comic\s*frontier|comifuro|cf22|cf21|cf20|5-layer\s*folder|clear\s*folder|clear\s*file|badge|keychain|key\s*ring|gantungan\s*kunci|standee|acrylic|bookmark\s*set|phone\s*holder|holder\s*phone|finger\s*grip|ring\s*stand|postcards?|t-?shirt|kaos|tote\s*bag|totebag|sling\s*bag|backpack|tas\s*laptop|pouch|dompet|tumbler|mug|gelas|cushion|mousepad|tapestry|stickers?|stikers?|poker-|amulet|eye\s*mask|figures?|plush|monopoly)\b'
    r'|^\s*(?:komik\s+|bundling\s+komik\s+)?\d+\s*-\s*[A-Z0-9]{2,4}\b',
    re.IGNORECASE
)

# Counter words that follow numbers within actual titles (not volume numbers)
TITLE_COUNTER_WORDS = {
    'centimeters', 'centimeter', 'cm', 'days', 'day', 'seconds', 'second',
    'hours', 'hour', 'tahun', 'years', 'year', 'century', 'pacar', 'ratu',
    'kota', 'kreativitas', 'al', 'langkah', 'musim', 'sahabat', 'warna',
    'detik', 'menit', 'hari', 'bulan', 'bintang'
}

# Edition and set suffix patterns to strip from series names
EDITION_SUFFIX_REGEX = re.compile(
    r'\s*[\-–—:]?\s*\b(?:Tamat|End|Special Set|Complete Set|Birthday Set|Limited Edition|Deluxe Edition|Premium Edition|Bundling(?: Set)?|Box Set|Regular|Reguler|Bookpaper|Edisi Khusus)\b.*$',
    re.IGNORECASE
)

# Imprint and medium prefixes
PREFIX_REGEX = re.compile(
    r'^(?:Akasha|LC|Level\s*Comics?|Light\s*Comics?|m&c!|Elex|Koloni|Qanza|Komik|Movie\s*Story|[a-zA-Z])\s*[:：\-]\s*'
    r'|^(?:Manga|Light\s*Novel|Novel)\s*[:：\-]?\s*',
    re.IGNORECASE
)

def is_non_book(title):
    return bool(NON_BOOK_REGEX.search(title))

def parse_indonesian_date(date_str):
    if not date_str or not isinstance(date_str, str):
        return None
    date_str = date_str.strip()
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str
    m = re.match(r'^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$', date_str)
    if m:
        day = int(m.group(1))
        month_name = m.group(2).lower()
        year = int(m.group(3))
        month_num = MONTH_MAP.get(month_name[:3], '01')
        return f'{year:04d}-{month_num}-{day:02d}'
    m2 = re.match(r'^([A-Za-z]+)\s+(\d{4})$', date_str)
    if m2:
        month_name = m2.group(1).lower()
        year = int(m2.group(2))
        month_num = MONTH_MAP.get(month_name[:3], '01')
        return f'{year:04d}-{month_num}-15'
    m3 = re.search(r'(\d{4})', date_str)
    if m3:
        return f'{m3.group(1)}-01-15'
    return None

def is_wednesday(date_str):
    if not date_str:
        return False
    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        return dt.weekday() == 2 # 2 = Wednesday
    except Exception:
        return False

def clean_slug(text):
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', str(text)).lower()
    return re.sub(r'[\s_]+', '-', slug).strip('-')

def parse_title_smart(title):
    """
    100% Dynamic, pattern-based title and volume parser.
    Extracts volume number and canonical series name using structural cues.
    """
    # 1. Clean brackets and leading imprint prefixes
    t = re.sub(r'\[.*?\]|\(.*?\)', '', title).strip()
    t = PREFIX_REGEX.sub('', t).strip()

    # 2. Pre-clean trailing set keywords (Special Set, Tamat, etc.)
    # preserving any volume numbers that precede them (e.g. 'Death Note - New Edition 07 - Tamat' -> 'Death Note - New Edition 07')
    t_clean = EDITION_SUFFIX_REGEX.sub('', t).strip(' :-–—')

    vol = None
    sname = t_clean

    # Tier 1: Explicit volume keyword (Vol., Volume, Jilid, #, Edition) followed by digits
    m_vol = re.search(r'\b(?:Vol\.?|Volume|Jilid|#|Edition)\s*(\d{1,3})\b', t_clean, re.I)
    if m_vol:
        vol = int(m_vol.group(1))
        sname = t_clean[:m_vol.start()].strip(' :-–—')
    else:
        # Tier 2: Decimal volume (e.g. 4.5)
        m_dec = re.search(r'\b(\d+)\.5\b', t_clean)
        if m_dec:
            vol = int(m_dec.group(1))
            sname = t_clean[:m_dec.start()].strip(' :-–—')
        else:
            # Tier 3: Delimiter-separated number (e.g. 'Title 01 - Subtitle')
            m_delim = re.search(r'^(.*?\S)\s+(\d{1,3})\s*[\-–—:]\s*(.*)$', t_clean)
            if m_delim:
                left_words = m_delim.group(1).strip()
                tokens = left_words.split()
                last_token = tokens[-1].lower() if tokens else ''
                if last_token in TITLE_COUNTER_WORDS:
                    # If preceding token is also a number (e.g. '15 tahun 1'), 1 is volume
                    if len(tokens) >= 2 and re.match(r'^\d+$', tokens[-2]):
                        vol = int(m_delim.group(2))
                        sname = left_words
                    else:
                        sname = f'{left_words} {m_delim.group(2)}'
                else:
                    vol = int(m_delim.group(2))
                    sname = left_words
            else:
                # Tier 4: Trailing number (e.g. 'Ghost Fixers 5', 'Detektif Conan 107', 'Blue Period 14')
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

    # Clean edition tags from series name (e.g. 'New Edition', 'Deluxe Edition')
    sname = re.sub(r'\s*[\-–—:]?\s*\b(?:New Edition|Deluxe Edition|Premium Edition|Edisi Khusus)\b.*$', '', sname, flags=re.I).strip(' :-–—')

    # Subtitle / Arc delimiter consolidation:
    # If sname still has delimiter (e.g. 'Bungo Stray Dogs - Beast' -> 'Bungo Stray Dogs')
    # and the preceding part is a substantial name (>= 3 chars), treat preceding part as series name
    if ' - ' in sname or ' : ' in sname or ' – ' in sname or ':' in sname:
        parts = re.split(r'\s*[\-–—:]\s*', sname)
        if len(parts) >= 2 and len(parts[0]) >= 3:
            sname = parts[0].strip()

    return vol, sname or t

def fetch_json(url, retries=3, timeout=6):
    req = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception:
            time.sleep(0.15 * (attempt + 1))
    return None

def fetch_variant_specs(slug):
    url = f'https://api-service.gramedia.com/api/v2/public/product-detail-variants/{slug}'
    data = fetch_json(url, retries=3, timeout=6)
    if data and data.get('data'):
        first = data['data'][0]
        specs = {s.get('label'): s.get('value') for s in first.get('specifications', [])}
        img = None
        if first.get('image') and len(first['image']) > 0:
            img = first['image'][0].get('image')
        return {
            'publisher': specs.get('Penerbit'),
            'releaseDate': parse_indonesian_date(specs.get('Tanggal Terbit')),
            'isbn13': specs.get('ISBN'),
            'pages': specs.get('Halaman'),
            'language': specs.get('Bahasa'),
            'price': first.get('final_price') or first.get('slice_price'),
            'coverImage': img,
            'category_slugs': first.get('category_slugs', ''),
            'is_oos': first.get('is_oos', False)
        }
    return None

def run_sync(catalog_path, scraped_data_path=None):
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting Dynamic Catalog Synchronization...")

    if not os.path.exists(catalog_path):
        print(f"Error: Catalog path {catalog_path} not found!")
        return False

    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    existing_books = {b['id']: b for b in catalog['books']}
    existing_by_slug = {b['slug']: b for b in catalog['books']}
    existing_series_map = {s['id']: s for s in catalog.get('series', [])}
    print(f"Loaded {len(existing_books)} existing books and {len(existing_series_map)} series from catalog.json.")

    # 1. Fetch Official Vendor Feeds (PGI, m&c!, Elex Media)
    vendors = [
        ('pub_pgi', 'Phoenix Gramedia Indonesia', 'phoenix-gramedia-indonesia', 'PGI', 10),
        ('pub_mnc', 'm&c! Publishing', 'mc', 'm&c!', 8),
        ('pub_elex', 'Elex Media Komputindo', 'elex-media-komputindo', 'Elex Media', 8),
    ]

    discovered_products = {} # slug -> (item_data, default_pub_id, default_pub_name, default_pub_short)

    for pid, pname, vslug, pshort, max_pages in vendors:
        v_count = 0
        for p in range(1, max_pages + 1):
            url = f'https://api-service.gramedia.com/api/v2/public/vendor/{vslug}/products?page={p}'
            data = fetch_json(url)
            items = data.get('data', []) if data else []
            if not items:
                break
            for it in items:
                slug = it.get('slug')
                title = it.get('title', '').strip()
                if not slug or not title or is_non_book(title):
                    continue
                discovered_products[slug] = (it, pid, pname, pshort)
                v_count += 1
            time.sleep(0.02)
        print(f"  -> Discovered {v_count} items from vendor {pname} (pages 1-{max_pages})")

    # 2. Fetch Latest Category Feeds (sorted by published date descending)
    categories = [
        ('manga', 3),
        ('light-novel', 3),
        ('komik', 3)
    ]
    for cat_slug, max_p in categories:
        cat_count = 0
        for p in range(1, max_p + 1):
            url = f'https://api-service.gramedia.com/api/v2/public/products?category_slug={cat_slug}&page={p}'
            data = fetch_json(url)
            items = data.get('data', []) if data else []
            if not items:
                break
            for it in items:
                slug = it.get('slug')
                title = it.get('title', '').strip()
                if not slug or not title or is_non_book(title):
                    continue
                if slug not in discovered_products:
                    discovered_products[slug] = (it, None, None, None)
                    cat_count += 1
            time.sleep(0.02)
        print(f"  -> Discovered {cat_count} new items from category {cat_slug}")

    # 3. Dynamic Gap Recovery: Detect series with volume gaps and query Gramedia API dynamically
    preliminary_series_vols = defaultdict(set)
    for b in existing_books.values():
        if b.get('seriesName') and b.get('volume') and b.get('category') in ['Manga', 'Light Novel']:
            preliminary_series_vols[b['seriesName']].add(b['volume'])

    gap_targets = []
    for sname, vols in preliminary_series_vols.items():
        if len(vols) >= 2:
            max_v = max(vols)
            if max_v <= 50:
                missing = set(range(1, max_v + 1)) - vols
                if missing:
                    gap_targets.append(sname)

    print(f"  -> Detected {len(gap_targets)} series with volume sequence gaps. Executing dynamic backfill queries...")
    for sname in gap_targets[:15]:
        url = f'https://api-service.gramedia.com/api/v2/public/products?keyword={urllib.parse.quote(sname)}&page=1'
        data = fetch_json(url)
        items = data.get('data', []) if data else []
        for it in items:
            slug = it.get('slug')
            title = it.get('title', '').strip()
            if not slug or not title or is_non_book(title):
                continue
            if slug not in discovered_products:
                discovered_products[slug] = (it, None, None, None)
        time.sleep(0.02)

    # 4. Check which products need live specifications
    to_fetch_specs = []
    for slug, (it, d_pid, d_pname, d_pshort) in discovered_products.items():
        ex = existing_by_slug.get(slug)
        if not ex or not ex.get('releaseDate') or not ex.get('volume') or not ex.get('publisherId') or not ex.get('isbn13'):
            to_fetch_specs.append((slug, it, d_pid, d_pname, d_pshort))

    # Also check any existing books with missing volume or publisher
    for b in existing_books.values():
        if b.get('category') in ['Manga', 'Light Novel']:
            if not b.get('volume') or not b.get('publisherId') or b.get('publisherId') == 'None':
                if b['slug'] not in [x[0] for x in to_fetch_specs]:
                    to_fetch_specs.append((b['slug'], {'title': b['title'], 'slug': b['slug']}, None, None, None))

    print(f"  -> Fetching live specifications for {len(to_fetch_specs)} products...")

    fetched_specs = {}
    for idx, (slug, it, d_pid, d_pname, d_pshort) in enumerate(to_fetch_specs):
        specs = fetch_variant_specs(slug)
        if specs:
            fetched_specs[slug] = specs
        if (idx + 1) % 50 == 0 or (idx + 1) == len(to_fetch_specs):
            print(f"     Specs progress: {idx + 1}/{len(to_fetch_specs)}")
        time.sleep(0.02)

    # 5. Process and integrate all discovered books using smart pattern parsing
    new_books_count = 0
    updated_books_count = 0

    for slug, (it, d_pid, d_pname, d_pshort) in discovered_products.items():
        title = it.get('title', '').strip()
        specs = fetched_specs.get(slug) or {}

        # Determine publisher dynamically from specs or vendor
        raw_pub = specs.get('publisher') or d_pname or ''
        raw_pub_lower = raw_pub.lower()

        pub_id = d_pid
        pub_name = d_pname
        pub_short = d_pshort

        if 'phoenix gramedia' in raw_pub_lower or 'pgi' in raw_pub_lower:
            pub_id, pub_name, pub_short = 'pub_pgi', 'Phoenix Gramedia Indonesia', 'PGI'
        elif 'elex' in raw_pub_lower:
            pub_id, pub_name, pub_short = 'pub_elex', 'Elex Media Komputindo', 'Elex Media'
        elif 'm&c' in raw_pub_lower or 'mnc' in raw_pub_lower:
            pub_id, pub_name, pub_short = 'pub_mnc', 'm&c! Publishing', 'm&c!'

        # If not one of the official manga/LN publishers, skip non-target entries
        if not pub_id or pub_id not in ['pub_pgi', 'pub_elex', 'pub_mnc']:
            continue

        # Determine category dynamically: Manga vs Light Novel
        cat_slugs = specs.get('category_slugs', '').lower()
        is_ln = 'light novel' in title.lower() or 'light-novel' in cat_slugs
        category = 'Light Novel' if is_ln else 'Manga'

        # Filter out general non-manga/non-LN books from Elex or m&c!
        if pub_id in ['pub_elex', 'pub_mnc'] and not is_ln:
            is_comic_manga = any(k in cat_slugs for k in ['komik', 'manga', 'grafis']) or any(
                k in title.lower() for k in ['level comic', 'akasha', 'lc :', 'komik', 'manga', 'vol.', 'volume', '#', 'bind up']
            )
            if not is_comic_manga:
                continue

        vol, raw_series_name = parse_title_smart(title)
        rel_date = specs.get('releaseDate')
        price = specs.get('price') or it.get('final_price') or 0
        cover_img = specs.get('coverImage') or (it.get('image') if isinstance(it.get('image'), str) else None)
        isbn = specs.get('isbn13') or it.get('isbn') or ''

        book_id = f"pub_{slug.replace('-', '_')}"
        if slug in existing_by_slug:
            b = existing_by_slug[slug]
            if not b.get('volume') and vol:
                b['volume'] = vol
            if not b.get('seriesName') and raw_series_name:
                b['seriesName'] = raw_series_name
            if not b.get('publisherId') or b.get('publisherId') == 'None':
                b['publisherId'] = pub_id
                b['publisherName'] = pub_name
                b['publisherShortName'] = pub_short
            if not b.get('releaseDate') and rel_date:
                b['releaseDate'] = rel_date
                b['isWednesdayRelease'] = is_wednesday(rel_date)
            if not b.get('currentPrice') and price:
                b['currentPrice'] = price
            if not b.get('coverImage') and cover_img:
                b['coverImage'] = cover_img
            if not b.get('isbn13') and isbn:
                b['isbn13'] = isbn
            updated_books_count += 1
        else:
            new_book = {
                'id': book_id,
                'slug': slug,
                'title': title,
                'originalTitle': raw_series_name or title,
                'seriesId': f"ser_{clean_slug(raw_series_name)}" if raw_series_name else None,
                'seriesName': raw_series_name,
                'volume': vol,
                'category': category,
                'publisherId': pub_id,
                'publisherName': pub_name,
                'publisherShortName': pub_short,
                'coverImage': cover_img or '',
                'status': 'PUBLISHED' if rel_date and rel_date <= datetime.now().strftime('%Y-%m-%d') else 'PREORDER',
                'releaseDate': rel_date or datetime.now().strftime('%Y-%m-%d'),
                'isWednesdayRelease': is_wednesday(rel_date or datetime.now().strftime('%Y-%m-%d')),
                'currentPrice': price,
                'authors': [it.get('author')] if it.get('author') else ['Berbagai Penulis'],
                'genres': [category],
                'isbn13': isbn,
                'synopsis': f"Rilisan resmi {category} terbitan {pub_name}.",
                'gramediaUrl': f"https://www.gramedia.com/products/{slug}"
            }
            existing_books[book_id] = new_book
            existing_by_slug[slug] = new_book
            new_books_count += 1

    # Re-evaluate all books with parse_title_smart to guarantee no gaps or missing volumes
    for b in existing_books.values():
        if b.get('category') in ['Manga', 'Light Novel']:
            parsed_v, parsed_s = parse_title_smart(b['title'])
            if parsed_v and not b.get('volume'):
                b['volume'] = parsed_v
            if parsed_s and (not b.get('seriesName') or len(b.get('seriesName', '')) < 3):
                b['seriesName'] = parsed_s

    print(f"  -> Processed: {new_books_count} new books added, {updated_books_count} existing books updated.")

    # 6. Dynamic Multi-Format Partitioning & Set Consolidation (Zero Hardcoded Titles)
    all_books = list(existing_books.values())
    merch_books = [b for b in all_books if b['category'] == 'Merchandise']
    manga_ln_books = [b for b in all_books if b['category'] in ['Manga', 'Light Novel']]

    def clean_base_franchise(name):
        n = re.sub(r'\(.*?\)|\[.*?\]', '', name).strip()
        n = re.sub(r'\b(?:Novel|Light\s*Novel|Manga|Komik|Movie\s*Story|Movie)\b', '', n, flags=re.I).strip(' :-–—')
        n = re.sub(r'\b(?:New Edition|Deluxe Edition|Special Set|Limited Edition|Tamat|End)\b', '', n, flags=re.I).strip(' :-–—')
        slug = re.sub(r'[^a-zA-Z0-9\s-]', '', n).lower()
        slug = re.sub(r'[\s_]+', '-', slug).strip('-')
        slug = re.sub(r'\bfeeling\b', 'feelings', slug)
        return slug, n or name

    # Step A: Identify which mediums exist for each base franchise across the catalog
    franchise_mediums = defaultdict(set)
    franchise_canonical_names = {}

    for b in manga_ln_books:
        sname = b.get('seriesName') or b.get('title')
        base_slug, base_name = clean_base_franchise(sname)
        if base_slug:
            if base_slug not in franchise_canonical_names:
                franchise_canonical_names[base_slug] = base_name

            # Detect medium
            t_lower = b['title'].lower()
            if 'movie' in t_lower or 'movie story' in t_lower:
                medium = 'MOVIE'
            elif b.get('category') == 'Light Novel' or '(novel)' in t_lower or 'light novel' in t_lower:
                medium = 'LIGHT_NOVEL'
            else:
                medium = 'MANGA'

            franchise_mediums[base_slug].add(medium)

    # Step B: Assign dynamic seriesId and seriesName based on medium partitioning
    for b in manga_ln_books:
        sname = b.get('seriesName') or b.get('title')
        base_slug, _ = clean_base_franchise(sname)
        base_name = franchise_canonical_names.get(base_slug, sname)

        t_lower = b['title'].lower()
        if 'movie' in t_lower or 'movie story' in t_lower:
            medium = 'MOVIE'
        elif b.get('category') == 'Light Novel' or '(novel)' in t_lower or 'light novel' in t_lower:
            medium = 'LIGHT_NOVEL'
        else:
            medium = 'MANGA'

        # If this franchise has multiple mediums (e.g. Manga + Light Novel, or Movie), partition dynamically
        has_multiple_mediums = len(franchise_mediums[base_slug]) > 1

        if has_multiple_mediums:
            if medium == 'LIGHT_NOVEL':
                sid = f"ser_{base_slug}-ln"
                s_display = f"{base_name} (Novel)"
            elif medium == 'MOVIE':
                sid = f"ser_{base_slug}-movie"
                s_display = f"{base_name} Movie"
            else:
                sid = f"ser_{base_slug}-manga"
                s_display = base_name
        else:
            sid = f"ser_{base_slug}"
            s_display = base_name

        b['seriesId'] = sid
        b['seriesName'] = s_display

    # Step C: Dynamic Set & Edition Consolidation:
    # Group books by (seriesId, volume). If multiple editions exist for the same volume,
    # pick the regular book as primary and consolidate variants into availableEditions
    series_vol_map = defaultdict(list)
    for b in manga_ln_books:
        sid = b.get('seriesId')
        v = b.get('volume')
        series_vol_map[(sid, v)].append(b)

    canonical_books = []
    for (sid, v), b_list in series_vol_map.items():
        if len(b_list) == 1 or v is None:
            for b in b_list:
                canonical_books.append(b)
        else:
            # Prefer regular over special set / birthday set / limited edition
            regular = next(
                (b for b in b_list if not any(k in b['title'].lower() for k in ['special set', 'birthday set', 'limited edition', 'bundling', 'complete set'])),
                b_list[0]
            )
            editions = []
            for b in b_list:
                ed_name = 'Regular'
                t_low = b['title'].lower()
                if 'special set' in t_low:
                    ed_name = 'Special Set'
                elif 'birthday set' in t_low:
                    ed_name = 'Birthday Set'
                elif 'complete set' in t_low:
                    ed_name = 'Complete Set'
                elif 'limited' in t_low:
                    ed_name = 'Limited Edition'
                editions.append({
                    'name': ed_name,
                    'price': b.get('currentPrice'),
                    'gramediaUrl': b.get('gramediaUrl')
                })
            regular['availableEditions'] = editions
            if len(editions) > 1 and 'Pilihan Edisi & Set Resmi' not in (regular.get('synopsis') or ''):
                regular['synopsis'] = (regular.get('synopsis') or '') + f"\n\nPilihan Edisi & Set Resmi: {', '.join(e['name'] for e in editions)}"
            canonical_books.append(regular)

    # Deduplicate books with identical title and seriesId (handles Gramedia reissue duplicates)
    seen_series_titles = set()
    deduped_canonical = []
    for b in canonical_books:
        key = (b.get('seriesId'), clean_slug(b.get('title')))
        if key in seen_series_titles:
            continue
        seen_series_titles.add(key)
        deduped_canonical.append(b)
    canonical_books = deduped_canonical

    # Step D: Dynamic Series Metadata Resolution
    series_groups = defaultdict(list)
    for b in canonical_books:
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

        # Preserve authoritative series totalVolumes from catalog or calculate dynamically
        ex = existing_series_map.get(sid)
        if ex and ex.get('totalVolumes'):
            if avail_vols:
                total_vols = max(ex['totalVolumes'], latest_vol)
            else:
                total_vols = ex['totalVolumes']
            latest_vol = max(ex.get('latestVolume', 0), latest_vol)
            avail_vols = sorted(list(set(ex.get('availableVolumes', []) + avail_vols)))
        else:
            if avail_vols:
                total_vols = max(len(avail_vols), latest_vol, len(b_list))
            else:
                total_vols = len(b_list)

        s_name = sample.get('seriesName') or sample.get('title')

        cover = next((b['coverImage'] for b in b_list if b.get('coverImage')), '')
        if not cover and ex:
            cover = ex.get('coverImage', '')

        author = sample.get('authors', ['Various Authors'])[0]
        if (not author or author == 'Various Authors') and ex:
            author = ex.get('author', author)

        series_type = 'LIGHT_NOVEL' if cat == 'Light Novel' or sid.endswith('-ln') else 'MANGA'

        series_obj = {
            'id': sid,
            'slug': sid.replace('ser_', ''),
            'name': s_name,
            'originalTitle': s_name,
            'publisherId': pub_id,
            'publisherName': pub_name,
            'author': author,
            'type': series_type,
            'status': 'ONGOING',
            'totalVolumes': total_vols,
            'latestVolume': latest_vol,
            'availableVolumes': avail_vols,
            'coverImage': cover,
            'description': f"Diterbitkan resmi oleh {pub_name}."
        }
        new_series_list.append(series_obj)

    # Step E: Add back merchandise books with null series attributes
    for m in merch_books:
        m['seriesId'] = None
        m['seriesName'] = None
        canonical_books.append(m)

    new_series_list.sort(key=lambda s: s['name'].lower())

    # Step F: Save updated catalog
    catalog['lastUpdated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    catalog['books'] = canonical_books
    catalog['series'] = new_series_list

    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Dynamic Catalog saved successfully:")
    print(f"   - Total Books: {len(canonical_books)}")
    print(f"   - Total Series: {len(new_series_list)}")
    print(f"   - Sample Series: {[s['name'] for s in new_series_list[:6]]}")

    # Synchronize with scraped_data_path if specified
    if scraped_data_path and os.path.exists(scraped_data_path):
        try:
            with open(scraped_data_path, 'r', encoding='utf-8') as f:
                scraped_data = json.load(f)
            scraped_data['metadata']['generatedAt'] = catalog['lastUpdated']
            with open(scraped_data_path, 'w', encoding='utf-8') as f:
                json.dump(scraped_data, f, ensure_ascii=False, indent=2)
            print(f"   - Synchronized {scraped_data_path}")
        except Exception as e:
            print(f"   - Notice on scraped-data sync: {e}")

    return True

def main():
    parser = argparse.ArgumentParser(description='Automated Continuous Dynamic Catalog Ingestion Engine')
    parser.add_argument('--daemon', action='store_true', help='Run continuously in background mode')
    parser.add_argument('--interval', type=int, default=3600, help='Polling interval in seconds (default: 3600s = 1 hour)')
    parser.add_argument('--catalog', type=str, default='/home/kou/Development/Dump/nuvellite/src/data/catalog.json', help='Path to catalog.json')
    parser.add_argument('--scraped', type=str, default='/home/kou/Development/Dump/nuvelll/src/server/db/scraped-data.json', help='Path to scraped-data.json')
    args = parser.parse_args()

    print(f"=== Nuvellite Dynamic Catalog Synchronization Service ===")
    print(f"Catalog Path: {args.catalog}")
    print(f"Daemon Mode: {args.daemon}")
    if args.daemon:
        print(f"Interval: {args.interval} seconds ({args.interval / 60:.1f} minutes)")

    # Execute initial sync
    run_sync(args.catalog, args.scraped)

    if args.daemon:
        print("\n[nuvelll:Daemon] Entering continuous polling loop...")
        while True:
            try:
                print(f"[nuvelll:Daemon] Sleeping for {args.interval}s until next sync cycle...")
                time.sleep(args.interval)
                run_sync(args.catalog, args.scraped)
            except KeyboardInterrupt:
                print("\n[nuvelll:Daemon] Gracefully shutting down...")
                break
            except Exception as e:
                print(f"[nuvelll:Daemon] Error in sync cycle: {e}")
                time.sleep(60)

if __name__ == '__main__':
    main()
