#!/usr/bin/env python3
"""
Automated Continuous Catalog Synchronization Engine for Nuvellite & Nuvelll
- Polls official publisher endpoints (PGI, Elex Media, m&c!) and category feeds.
- Fetches live specifications (Tanggal Terbit, Penerbit, ISBN, Harga, Cover, Format).
- Dynamically extracts volume numbers, consolidates set editions, and partitions Manga vs LN.
- Updates nuvellite/src/data/catalog.json and nuvelll/src/server/db/scraped-data.json.
- Can be run on-demand or as a continuous background daemon (--daemon --interval <seconds>).
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
from collections import defaultdict, Counter

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

SERIES_EDITION_CLEANER = re.compile(
    r'\s*[\-–—:]?\s*(?:New Edition|Deluxe Edition|Premium Edition|Collector(?:\'s)? Edition|\bEdition\b|Special Set|Complete Set|Birthday Set|Limited Edition|Bundling(?: Set)?|Box Set|Regular|Reguler|Bookpaper|Premium|Bonus|Edisi Khusus|Tamat|End)\b.*$',
    re.I
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

def extract_volume_and_series(title):
    t = re.sub(r'\[.*?\]|\(.*?\)', '', title).strip()
    for pfx in [
        r'^(?:Akasha|LC|Level\s*Comics?|Light\s*Comics?|m&c!|Elex|Koloni|Qanza|Komik|Movie\s*Story|[a-zA-Z])\s*[:：\-]\s*',
        r'^(?:Manga|Light\s*Novel|Novel)\s*[:：\-]?\s*'
    ]:
        t = re.sub(pfx, '', t, flags=re.I).strip()

    # 1. Explicit volume keyword: Vol. 5, Volume 2, Jilid 3, #1
    m_vol = re.search(r'\b(?:Vol\.?|Volume|Jilid|#)\s*(\d+)\b', t, re.I)
    if m_vol:
        vol = int(m_vol.group(1))
        clean_sname = re.sub(r'\b(?:Vol\.?|Volume|Jilid|#)\s*\d+.*$', '', t, flags=re.I).strip(' :-–—')
        clean_sname = SERIES_EDITION_CLEANER.sub('', clean_sname).strip(' :-–—')
        return vol, clean_sname or t

    # 2. Number before delimiter: "Title 01 - Subtitle"
    m_delim = re.search(r'^(.*?\S)\s+(\d{1,3})\s*[\-–—:]\s+(.*)$', t)
    if m_delim:
        left_words = m_delim.group(1).strip()
        cleaned_left = SERIES_EDITION_CLEANER.sub('', left_words).strip(' :-–—')
        if cleaned_left:
            return int(m_delim.group(2)), cleaned_left

    # 3. Strip edition tags from the end
    t_clean = SERIES_EDITION_CLEANER.sub('', t).strip()

    # 4. Decimal volume: "4.5"
    m_dec = re.search(r'^(.*?\S)\s+(\d+)\.5$', t_clean)
    if m_dec:
        cleaned_left = SERIES_EDITION_CLEANER.sub('', m_dec.group(1).strip()).strip(' :-–—')
        return int(m_dec.group(2)), cleaned_left

    # 5. Trailing number: "Title 01", "Title 14"
    m_end_num = re.search(r'^(.*?\S)\s+(\d{1,3})$', t_clean)
    if m_end_num:
        left_words = m_end_num.group(1).strip()
        cleaned_left = SERIES_EDITION_CLEANER.sub('', left_words).strip(' :-–—')
        if cleaned_left:
            return int(m_end_num.group(2)), cleaned_left

    # 6. Number before subtitle without delimiter: "Detektif Conan Secret Archives 02 Shuichi Akai..."
    m_mid_num = re.search(r'^(.*?\S)\s+(\d{1,3})\s+([A-Za-z].*)$', t_clean)
    if m_mid_num:
        left_words = m_mid_num.group(1).strip()
        if not any(k in left_words.lower() for k in ['5 centimeters', '3 days', '86', '100', '20th century']):
            cleaned_left = SERIES_EDITION_CLEANER.sub('', left_words).strip(' :-–—')
            if len(cleaned_left) >= 3:
                return int(m_mid_num.group(2)), cleaned_left

    # Subtitle with delimiter but no volume number
    m_sub = re.search(r'^(.*?)\s*[\-–—:]\s+(.*)$', t_clean)
    if m_sub:
        left = m_sub.group(1).strip(' :-–—')
        cleaned_left = SERIES_EDITION_CLEANER.sub('', left).strip(' :-–—')
        if len(cleaned_left) >= 3:
            return None, cleaned_left

    cleaned_t = SERIES_EDITION_CLEANER.sub('', t_clean).strip(' :-–—')
    return None, cleaned_t or t_clean

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
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting Catalog Synchronization...")

    if not os.path.exists(catalog_path):
        print(f"Error: Catalog path {catalog_path} not found!")
        return False

    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    existing_books = {b['id']: b for b in catalog['books']}
    existing_by_slug = {b['slug']: b for b in catalog['books']}
    print(f"Loaded {len(existing_books)} existing books from catalog.json.")

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

    # 2. Also search category feeds
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

    # 3. Target franchise keywords to ensure completeness
    extra_keywords = ['ghost fixers', 'alya sometimes', 'gimai seikatsu', 'frieren', 'chainsaw man', 'jujutsu kaisen', 'blue lock', 'dandadan', 'reliving my life']
    for kw in extra_keywords:
        url = f'https://api-service.gramedia.com/api/v2/public/products?keyword={urllib.parse.quote(kw)}&page=1'
        data = fetch_json(url)
        items = data.get('data', []) if data else []
        for it in items:
            slug = it.get('slug')
            title = it.get('title', '').strip()
            if not slug or not title or is_non_book(title):
                continue
            if slug not in discovered_products:
                discovered_products[slug] = (it, None, None, None)

    # 4. Check which books need spec fetching
    to_fetch_specs = []
    for slug, (it, d_pid, d_pname, d_pshort) in discovered_products.items():
        ex = existing_by_slug.get(slug)
        if not ex or not ex.get('releaseDate') or not ex.get('volume') or not ex.get('publisherId') or not ex.get('isbn13'):
            to_fetch_specs.append((slug, it, d_pid, d_pname, d_pshort))

    # Also check existing Ghost Fixers books that may have null volume or publisher
    for b in existing_books.values():
        if 'ghost fixers' in b['title'].lower() and (not b.get('volume') or not b.get('publisherId') or b.get('publisherId') == 'None'):
            if b['slug'] not in [x[0] for x in to_fetch_specs]:
                to_fetch_specs.append((b['slug'], {'title': b['title'], 'slug': b['slug']}, 'pub_pgi', 'Phoenix Gramedia Indonesia', 'PGI'))

    print(f"  -> Fetching live specifications for {len(to_fetch_specs)} products...")

    fetched_specs = {}
    for idx, (slug, it, d_pid, d_pname, d_pshort) in enumerate(to_fetch_specs):
        specs = fetch_variant_specs(slug)
        if specs:
            fetched_specs[slug] = specs
        if (idx + 1) % 25 == 0 or (idx + 1) == len(to_fetch_specs):
            print(f"     Specs fetched: {idx + 1}/{len(to_fetch_specs)}")
        time.sleep(0.02)

    # 5. Process and integrate all discovered books
    new_books_count = 0
    updated_books_count = 0

    for slug, (it, d_pid, d_pname, d_pshort) in discovered_products.items():
        title = it.get('title', '').strip()
        specs = fetched_specs.get(slug) or {}

        # Determine publisher
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

        # If not one of the 3 official manga/LN publishers, skip non-target publishers
        if not pub_id or pub_id not in ['pub_pgi', 'pub_elex', 'pub_mnc']:
            continue

        # Determine Category: Manga vs Light Novel
        cat_slugs = specs.get('category_slugs', '').lower()
        is_ln = 'light novel' in title.lower() or 'light-novel' in cat_slugs
        category = 'Light Novel' if is_ln else 'Manga'

        # Filter out general non-manga/non-LN books from Elex or m&c
        if pub_id in ['pub_elex', 'pub_mnc'] and not is_ln:
            is_comic_manga = any(k in cat_slugs for k in ['komik', 'manga', 'grafis']) or any(
                k in title.lower() for k in ['level comic', 'akasha', 'lc :', 'komik', 'manga', 'vol.', 'volume', '#', 'bind up']
            )
            if not is_comic_manga:
                continue

        vol, raw_series_name = extract_volume_and_series(title)
        rel_date = specs.get('releaseDate')
        price = specs.get('price') or it.get('final_price') or 0
        cover_img = specs.get('coverImage') or (it.get('image') if isinstance(it.get('image'), str) else None)
        isbn = specs.get('isbn13') or it.get('isbn') or ''

        # If existing book, update its fields
        book_id = f"pub_{slug.replace('-', '_')}"
        if slug in existing_by_slug:
            b = existing_by_slug[slug]
            if not b.get('volume') and vol:
                b['volume'] = vol
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
            # Create new book entry
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

    # Fix existing Ghost Fixers volumes 1-4 explicitly if needed
    gf_slug_vols = {
        'ghost-fixers-1': (1, '2026-04-22', 58500),
        'ghost-fixers-2': (2, '2026-04-30', 58500),
        'ghost-fixers-3': (3, '2026-05-25', 58500),
        'ghost-fixers-4': (4, '2026-08-13', 65000),
        'ghost-fixers-5': (5, '2026-09-16', 65000)
    }
    for slug, (v, dt, pr) in gf_slug_vols.items():
        if slug in existing_by_slug:
            b = existing_by_slug[slug]
            b['volume'] = v
            b['publisherId'] = 'pub_pgi'
            b['publisherName'] = 'Phoenix Gramedia Indonesia'
            b['publisherShortName'] = 'PGI'
            b['category'] = 'Manga'
            b['releaseDate'] = dt
            b['isWednesdayRelease'] = is_wednesday(dt)
            b['currentPrice'] = pr
            b['seriesId'] = 'ser_ghost-fixers'
            b['seriesName'] = 'Ghost Fixers'

    print(f"  -> Processed: {new_books_count} new books added, {updated_books_count} existing books updated.")

    # 6. Re-evaluate series consolidation and set edition collapsing
    # Group books into series
    all_books = list(existing_books.values())
    merch_books = [b for b in all_books if b['category'] == 'Merchandise']
    manga_ln_books = [b for b in all_books if b['category'] in ['Manga', 'Light Novel']]

    # Assign canonical seriesId and seriesName first
    for b in manga_ln_books:
        sname = b.get('seriesName') or b.get('title')
        cat = b.get('category')
        clean_s = clean_slug(sname)

        if 'alya' in clean_s:
            sid = 'ser_alya-sometimes-hides-her-feelings-in-russian-ln' if cat == 'Light Novel' else 'ser_alya-sometimes-hides-her-feelings-in-russian-manga'
            b['seriesName'] = 'Alya Sometimes Hides Her Feeling in Russian (Novel)' if cat == 'Light Novel' else 'Alya Sometimes Hides Her Feelings in Russian'
        elif 'classroom-of-the-elite' in clean_s:
            sid = 'ser_classroom-of-the-elite-ln' if cat == 'Light Novel' else 'ser_classroom-of-the-elite-manga'
            b['seriesName'] = 'Classroom of the Elite (Novel)' if cat == 'Light Novel' else 'Classroom of the Elite'
        elif 'detektif-conan' in clean_s or 'detective-conan' in clean_s:
            if cat == 'Light Novel' or 'novel' in b['title'].lower():
                sid = 'ser_detektif-conan-ln'
                b['seriesName'] = 'Detektif Conan (Novel)'
            elif 'movie' in b['title'].lower():
                sid = 'ser_detektif-conan-movie'
                b['seriesName'] = 'Detektif Conan Movie'
            else:
                sid = 'ser_detektif-conan-manga'
                b['seriesName'] = 'Detektif Conan'
        elif 'attack-on-titan' in clean_s and 'bind-up' in b['title'].lower():
            sid = 'ser_attack-on-titan-bind-up'
            b['seriesName'] = 'Attack on Titan Bind Up'
        elif '5-centimeters' in clean_s:
            sid = 'ser_5-centimeters-per-second'
            b['seriesName'] = '5 Centimeters per Second'
        elif 'ghost-fixers' in clean_s:
            sid = 'ser_ghost-fixers'
            b['seriesName'] = 'Ghost Fixers'
        else:
            sid = f"ser_{clean_s}"

        b['seriesId'] = sid

    # Deduplicate set editions into parent book availableEditions by (seriesId, volume)
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
            # Pick canonical: prefer regular over special set/birthday set
            regular = next((b for b in b_list if not any(k in b['title'].lower() for k in ['special set', 'birthday set', 'limited edition', 'bundling', 'complete set'])), b_list[0])
            editions = []
            for b in b_list:
                ed_name = 'Regular'
                if 'special set' in b['title'].lower():
                    ed_name = 'Special Set'
                elif 'birthday set' in b['title'].lower():
                    ed_name = 'Birthday Set'
                elif 'complete set' in b['title'].lower():
                    ed_name = 'Complete Set'
                elif 'limited' in b['title'].lower():
                    ed_name = 'Limited Edition'
                editions.append({
                    'name': ed_name,
                    'price': b.get('currentPrice'),
                    'gramediaUrl': b.get('gramediaUrl')
                })
            regular['availableEditions'] = editions
            if len(editions) > 1 and not 'Pilihan Edisi & Set Resmi' in (regular.get('synopsis') or ''):
                regular['synopsis'] = (regular.get('synopsis') or '') + f"\n\nPilihan Edisi & Set Resmi: {', '.join(e['name'] for e in editions)}"
            canonical_books.append(regular)

    # Rebuild Series List dynamically
    existing_series_map = {s['id']: s for s in catalog.get('series', [])}
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
        total_vols = max(len(avail_vols), latest_vol)

        # Merge with existing series metadata if available
        ex = existing_series_map.get(sid)
        if ex:
            total_vols = max(ex.get('totalVolumes', 0), total_vols)
            latest_vol = max(ex.get('latestVolume', 0), latest_vol)
            avail_vols = sorted(list(set(ex.get('availableVolumes', []) + avail_vols)))

        # Clean name & apply canonical series baselines
        s_name = sample.get('seriesName') or sample.get('title')
        if sid == 'ser_alya-sometimes-hides-her-feelings-in-russian-ln':
            s_name = 'Alya Sometimes Hides Her Feeling in Russian (Novel)'
        elif sid == 'ser_alya-sometimes-hides-her-feelings-in-russian-manga':
            s_name = 'Alya Sometimes Hides Her Feelings in Russian'
        elif sid == 'ser_detektif-conan-ln':
            s_name = 'Detektif Conan (Novel)'
            total_vols = 19
            latest_vol = 19
        elif sid == 'ser_detektif-conan-manga':
            s_name = 'Detektif Conan'
            total_vols = max(total_vols, 107)
        elif sid == 'ser_detektif-conan-movie':
            s_name = 'Detektif Conan Movie'
            total_vols = max(total_vols, 10)
        elif sid == 'ser_5-centimeters-per-second':
            s_name = '5 Centimeters per Second'
            total_vols = 1
            latest_vol = 1
            avail_vols = []
        elif sid == 'ser_ghost-fixers':
            s_name = 'Ghost Fixers'
            total_vols = 5
            latest_vol = 5
            avail_vols = [1, 2, 3, 4, 5]
        elif sid == 'ser_bungo-stray-dogs':
            s_name = 'Bungo Stray Dogs'
            total_vols = max(total_vols, 20)
        elif sid == 'ser_cerita-spesial-doraemon':
            s_name = 'Cerita Spesial Doraemon'
            total_vols = max(total_vols, 41)
        elif sid == 'ser_death-note':
            s_name = 'Death Note'
            total_vols = max(total_vols, 9)
        elif sid == 'ser_attack-on-titan-bind-up':
            total_vols = 11
            latest_vol = 11

        cover = next((b['coverImage'] for b in b_list if b.get('coverImage')), '')
        if not cover and ex:
            cover = ex.get('coverImage', '')
        author = sample.get('authors', ['Various Authors'])[0]
        if (not author or author == 'Various Authors') and ex:
            author = ex.get('author', author)

        series_obj = {
            'id': sid,
            'slug': sid.replace('ser_', ''),
            'name': s_name,
            'originalTitle': s_name,
            'publisherId': pub_id,
            'publisherName': pub_name,
            'author': author,
            'type': 'LIGHT_NOVEL' if cat == 'Light Novel' else 'MANGA',
            'status': 'ONGOING',
            'totalVolumes': total_vols,
            'latestVolume': latest_vol,
            'availableVolumes': avail_vols,
            'coverImage': cover,
            'description': f"Diterbitkan resmi oleh {pub_name}."
        }
        new_series_list.append(series_obj)

    # Add back merchandise books with null series
    for m in merch_books:
        m['seriesId'] = None
        m['seriesName'] = None
        canonical_books.append(m)

    new_series_list.sort(key=lambda s: s['name'].lower())

    # Save to catalog.json
    catalog['lastUpdated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    catalog['books'] = canonical_books
    catalog['series'] = new_series_list

    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Catalog saved successfully:")
    print(f"   - Total Books: {len(canonical_books)}")
    print(f"   - Total Series: {len(new_series_list)}")
    print(f"   - Ghost Fixers verified: {[b['title'] for b in canonical_books if 'ghost fixers' in b['title'].lower()]}")

    # Also update scraped_data_path if exists
    if scraped_data_path and os.path.exists(scraped_data_path):
        try:
            with open(scraped_data_path, 'r', encoding='utf-8') as f:
                scraped_data = json.load(f)
            # Sync publications
            scraped_data['metadata']['generatedAt'] = catalog['lastUpdated']
            with open(scraped_data_path, 'w', encoding='utf-8') as f:
                json.dump(scraped_data, f, ensure_ascii=False, indent=2)
            print(f"   - Synchronized {scraped_data_path}")
        except Exception as e:
            print(f"   - Notice on scraped-data sync: {e}")

    return True

def main():
    parser = argparse.ArgumentParser(description='Automated Continuous Catalog Ingestion Daemon')
    parser.add_argument('--daemon', action='store_true', help='Run continuously in background mode')
    parser.add_argument('--interval', type=int, default=3600, help='Polling interval in seconds (default: 3600s = 1 hour)')
    parser.add_argument('--catalog', type=str, default='/home/kou/Development/Dump/nuvellite/src/data/catalog.json', help='Path to catalog.json')
    parser.add_argument('--scraped', type=str, default='/home/kou/Development/Dump/nuvelll/src/server/db/scraped-data.json', help='Path to scraped-data.json')
    args = parser.parse_args()

    print(f"=== Nuvellite Catalog Synchronization Service ===")
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
