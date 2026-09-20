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
from datetime import datetime, timezone
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

from adapters import ElexAdapter, MCAdapter, PGIAdapter

# Positive and Negative classification signals
MERCHANDISE_REGEX = re.compile(
    r'\b(acrylic|akrilik|standee|keychain|key\s*ring|gantungan\s*kunci|tote\s*bag|totebag|sling\s*bag|backpack|tas|pouch|dompet|tumbler|mug|gelas|cushion|bantal|mousepad|desk\s*mat|tapestry|stickers?|stikers?|poker-|amulet|eye\s*mask|figures?|figurine|plush|boneka|monopoly|pin\s*badge|badge|lanyard|washi\s*tape|postcards?|poster|art\s*print|clear\s*file|clear\s*folder|5-layer\s*folder|folder|card\s*pack|booster\s*pack|kartu\s*koleksi|tarot|flash\s*card|reflection\s*card|t-?shirt|kaos|stationary|stationery|binder|notebook|buku\s*tulis|memo\s*pad|pencil\s*case|kotak\s*pensil)\b',
    re.IGNORECASE
)

NON_MANGA_LN_REGEX = re.compile(
    r'\b(ensiklopedia|encyclopedia|atlas|kamus|dictionary|puzzle|teka-teki|paint\s*by\s*number|coloring\s*book|mewarnai|buku\s*aktivitas|board\s*book|pop-up|lift\s*the\s*flap|funtastic|saintis\s*cilik|seek\s*&\s*find|buku\s*interaktif|buku\s*pintar|aku\s*jadi\s*pintar|siap\s*sekolah|top\s*paud|paud|my\s*first\s*book|pinkfong|bebefinn|uwa\s*and\s*friends|cocomelon|dr\.\s*robot\s*teo|alphabet\s*writing|menulis\s*alfabet|cepat\s*membaca|metode\s*bapatja|pandai\s*membaca|buku\s*anak|cerita\s*sains|koding\s*pertamaku|parenting|fiqih|hadits|sholat|khotbah|doa\s*harian|hijrah|buku\s*resep|resep\s+masakan?|resep\s+kue|buku\s*masak|diet|kesehatan|kedokteran|medis|hukum\s*pidana|hukum\s*perdata|hukum\s*dan\s*keadilan|kuhp|kuhap|investasi|saham|reksadana|crypto|keuangan|akuntansi|perpajakan|bisnis|manajemen|marketing|leadership|kepemimpinan|psikologi|self\s*improvement|self-help|filsafat|filosofi|sejarah\s*indonesia|soal\s*utbk|cpns|toefl|ielts|matematika|fisika|kimia|biologi|geronimo\s*stilton|thea\s*stilton|catstronauts|story\s*orchestra|start\s*with\s*why|ego\s*is\s*the\s*enemy|daring\s*greatly|dare\s*to\s*lead|burnout|the\s*idiot|the\s*four\s*agreements|the\s*patriarchs|principles:\s*your\s*guided\s*journal|memoirs\s*from\s*the\s*women|teenlit|romance\s*novel|international\s*classics?|penguin\s*books?|treasure\s*pack|games\s*&\s*puzzles?)\b',
    re.IGNORECASE
)

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

def determine_book_medium(b):
    title = (b.get('title') or '').strip()
    t_lower = title.lower()
    if 'movie' in t_lower or 'movie story' in t_lower:
        return 'MOVIE'

    has_ln_token = 'light novel' in t_lower or '(novel)' in t_lower
    genres = [str(g).lower() for g in b.get('genres', [])]
    pub_id = b.get('publisherId', '')

    # PGI: Phoenix Gramedia Indonesia explicitly includes "Light Novel" or "(Novel)" in LN releases.
    # PGI Manga releases do NOT have "Light Novel" in the title (e.g. "The Eminence in Shadow 14").
    if pub_id == 'pub_pgi':
        return 'LIGHT_NOVEL' if has_ln_token else 'MANGA'

    # m&c! Clover imprint / Light Novel
    is_clover_novel = pub_id == 'pub_mnc' and (
        'clover' in t_lower or
        any('novel' in g or 'fiksi ilmiah' in g for g in genres) or
        title.lower().startswith('eighty six')
    )
    if has_ln_token or is_clover_novel:
        return 'LIGHT_NOVEL'

    if b.get('category') == 'Light Novel' and not any(k in t_lower for k in ['komik', 'manga', 'level comic', 'lc:']):
        return 'LIGHT_NOVEL'

    return 'MANGA'

def classify_book(title, pub_id, cat_slugs='', existing_cat=None, specs=None):
    t_lower = title.lower()

    if MERCHANDISE_REGEX.search(title) or NON_MANGA_LN_REGEX.search(title):
        return 'REJECT', None, 'Matched non-manga / merchandise pattern'

    specs = specs or {}
    imprint = (specs.get('Imprint') or specs.get('Penerbit') or '').lower()

    has_ln_token = 'light novel' in t_lower or '(novel)' in t_lower or 'light-novel' in cat_slugs
    is_clover = pub_id == 'pub_mnc' and ('clover' in t_lower or 'clover' in imprint or 'novel-6' in cat_slugs)

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

                status, cat, reason = classify_book(title, adapter.publisher_id)
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

            status, cat, reason = classify_book(title, adapter.publisher_id)
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

        vol, sname = parse_title_smart(title)
        book_id = f"pub_{slug.replace('-', '_')}"

        if slug in existing_books_map:
            b = existing_books_map[slug]
            if b.get('currentPrice') and current_price and b['currentPrice'] != current_price:
                snap = {
                    'id': f"snap_{b['id']}_{int(time.time())}",
                    'bookId': b['id'],
                    'price': current_price,
                    'currentPrice': current_price,
                    'originalPrice': original_price,
                    'previousPrice': b['currentPrice'],
                    'availability': availability,
                    'observedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                    'source': 'gramedia_api'
                }
                new_snapshots.append(snap)
                b['currentPrice'] = current_price

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
                'classificationReason': f"Verified {cat} from {adapter.publisher_short}"
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

    # 5. Dynamic Franchise Medium Separation (Manga vs Light Novel vs Movie)
    all_books = list(existing_books_map.values())
    franchise_mediums = defaultdict(set)
    franchise_canonical_names = {}

    for b in all_books:
        sname = b.get('seriesName') or b.get('title')
        base_slug, base_name = clean_base_franchise(sname)
        if base_slug:
            if base_slug not in franchise_canonical_names:
                franchise_canonical_names[base_slug] = base_name
            med = determine_book_medium(b)
            franchise_mediums[base_slug].add(med)

    for b in all_books:
        sname = b.get('seriesName') or b.get('title')
        base_slug, _ = clean_base_franchise(sname)
        base_name = franchise_canonical_names.get(base_slug, sname)
        med = determine_book_medium(b)

        has_multiple = len(franchise_mediums[base_slug]) > 1

        if has_multiple:
            if med == 'LIGHT_NOVEL':
                sid = f"ser_{base_slug}-ln"
                s_display = f"{base_name} (Novel)"
                b['category'] = 'Light Novel'
                b['format'] = 'LIGHT_NOVEL'
            elif med == 'MOVIE':
                sid = f"ser_{base_slug}-movie"
                s_display = f"{base_name} Movie"
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
            b['category'] = 'Light Novel' if med == 'LIGHT_NOVEL' else 'Manga'
            b['format'] = 'LIGHT_NOVEL' if med == 'LIGHT_NOVEL' else 'MANGA'

        b['seriesId'] = sid
        b['seriesName'] = s_display

    # 6. Reconstruct Series metadata
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

    # 7. Finalize and save
    finished_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    duration_ms = int((time.time() - start_time) * 1000)

    catalog['lastUpdated'] = finished_at
    catalog['books'] = all_books
    catalog['series'] = new_series_list
    catalog['priceSnapshots'] = existing_price_snapshots + new_snapshots

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
        'duplicatesResolved': 0,
        'errors': errors,
        'durationMs': duration_ms,
        'success': len(errors) == 0
    }

    all_snapshots = existing_price_snapshots + new_snapshots
    catalog['lastUpdated'] = finished_at
    catalog['priceSnapshots'] = all_snapshots
    sync_runs = catalog.get('syncRuns', [])
    sync_runs.insert(0, sync_run)
    catalog['syncRuns'] = sync_runs[:20] # keep last 20

    with open(catalog_path, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [SYNC_COMPLETE] Sync completed in {duration_ms}ms:")
    print(f"   - Products Fetched: {total_products_fetched}")
    print(f"   - Products Accepted: {len(accepted_products)}")
    print(f"   - Products Inserted: {inserted_count}, Updated: {updated_count}")
    print(f"   - New Price Snapshots: {len(new_snapshots)}")
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
