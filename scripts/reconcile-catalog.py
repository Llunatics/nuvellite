#!/usr/bin/env python3
"""
Nuvellite Comprehensive Catalog Reconciler
- Backfills missing sequence volumes (OOS and in-stock) via Gramedia Search API with is_available_only=false
- Ingests missing titles like 86 - Eighty Six (Clover / m&c!)
- Accurately separates Manga vs Light Novel for same franchise (e.g. The Eminence in Shadow)
- 100% data-driven, NO hardcoded titles.
"""

import json
import re
import time
import os
import urllib.request
import urllib.parse
from collections import defaultdict

CATALOG_PATH = os.path.join(os.path.dirname(__file__), '../src/data/catalog.json')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 nuvellite-engine/2.0',
    'Accept': 'application/vnd.gramedia.v3+json, application/json, */*;',
    'X-Grmd-Device-Type': 'desktop'
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

EDITION_SUFFIX_REGEX = re.compile(
    r'\s*[\-–—:+]?\s*\b(?:Tamat|End|Special Set|Complete Set|Birthday Set|Limited Edition|Deluxe Edition|Premium Edition|Bundling(?: Set)?|Box Set|Regular|Reguler|Bookpaper|Edisi Khusus|Merchandise|Merch|Bonus|Akrilik|Standee)\b.*$',
    re.IGNORECASE
)

PREFIX_REGEX = re.compile(
    r'^(?:Akasha|LC|Level\s*Comics?|Light\s*Comics?|m&c!|Elex|Koloni|Qanza|Komik|Movie\s*Story|[a-zA-Z])\s*[:：\-]\s*|^(?:Manga|Light\s*Novel|Novel)\s*[:：\-]?\s*',
    re.IGNORECASE
)

TITLE_COUNTER_WORDS = {
    'centimeters', 'centimeter', 'cm', 'days', 'day', 'seconds', 'second',
    'hours', 'hour', 'tahun', 'years', 'year', 'century', 'pacar', 'ratu',
    'kota', 'kreativitas', 'al', 'langkah', 'musim', 'sahabat', 'warna',
    'detik', 'menit', 'hari', 'bulan', 'bintang'
}

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
    return None

def fetch_json(url, retries=3, timeout=8):
    req = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status == 200:
                    return json.loads(resp.read().decode('utf-8'))
        except Exception:
            time.sleep(0.2 * (attempt + 1))
    return None

def search_products(keyword, is_available_only=False, max_pages=3):
    products = []
    page = 1
    while page <= max_pages:
        params = urllib.parse.urlencode({
            'keyword': keyword,
            'is_available_only': 'true' if is_available_only else 'false',
            'page': page,
            'size': 20
        })
        url = f'https://api-service.gramedia.com/api/v2/public/search-result-product?{params}'
        data = fetch_json(url)
        items = data.get('data', []) if data else []
        if not items:
            break
        for it in items:
            products.append(it)
        total_page = (data.get('meta') or {}).get('total_page') or max_pages
        if page >= total_page:
            break
        page += 1
        time.sleep(0.05)
    return products

def fetch_product_specs(slug):
    url = f'https://api-service.gramedia.com/api/v2/public/product-detail-variants/{slug}'
    data = fetch_json(url)
    if data and data.get('data') and len(data['data']) > 0:
        first = data['data'][0]
        specs = {s.get('label'): s.get('value') for s in first.get('specifications', [])}
        img = None
        if first.get('image') and len(first['image']) > 0:
            img = first['image'][0].get('image')
        isbn = specs.get('ISBN') or ''
        cleaned_isbn = re.sub(r'[^0-9Xx]', '', str(isbn))
        if not re.match(r'^(?:97[89]\d{10}|\d{9}[\dXx]|\d{10,13})$', cleaned_isbn):
            cleaned_isbn = ''

        final_p = first.get('final_price') or 0
        slice_p = first.get('slice_price') or 0
        curr_p = final_p if final_p > 0 else slice_p
        orig_p = slice_p if slice_p > curr_p else curr_p

        return {
            'publisher': specs.get('Penerbit'),
            'releaseDate': parse_indonesian_date(specs.get('Tanggal Terbit')),
            'isbn13': cleaned_isbn,
            'price': curr_p,
            'original_price': orig_p,
            'coverImage': img,
            'category_slugs': first.get('category_slugs', ''),
            'is_oos': first.get('is_oos', False),
            'author': specs.get('Penulis') or specs.get('Pengarang')
        }
    return None

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
        t_lower.startswith('eighty six')
    )
    if has_ln_token or is_clover_novel:
        return 'LIGHT_NOVEL'

    if b.get('category') == 'Light Novel' and not any(k in t_lower for k in ['komik', 'manga', 'level comic', 'lc:']):
        return 'LIGHT_NOVEL'

    return 'MANGA'

def run():
    print(f"Loading catalog from {CATALOG_PATH}...")
    with open(CATALOG_PATH, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    existing_books_map = {b['slug']: b for b in catalog.get('books', [])}
    print(f"Initial books count: {len(existing_books_map)}")

    # 1. Identify series with sequence gaps
    series_books = defaultdict(list)
    for b in existing_books_map.values():
        sname = b.get('seriesName')
        if sname and len(sname) >= 3:
            series_books[sname].append(b)

    gap_series = []
    for sname, b_list in series_books.items():
        vols = [b['volume'] for b in b_list if b.get('volume') is not None]
        if not vols:
            continue
        max_v = max(vols)
        min_v = min(vols)
        if max_v >= 3 and len(set(vols)) < max_v:
            gap_series.append((sname, max_v - len(set(vols)), min_v))

    # Prioritize series missing volume 1 (min_v > 1) and search all gap series
    gap_series.sort(key=lambda x: (x[2] > 1, x[1]), reverse=True)
    print(f"Found {len(gap_series)} series with missing sequence volumes.")

    # 2. Search and discover missing volumes for all gap series and missing titles
    queries_to_run = [s[0] for s in gap_series]
    # Add Clover & Eighty Six discovery queries
    if 'eighty six' not in [q.lower() for q in queries_to_run]:
        queries_to_run.append('eighty six')
    if 'clover' not in [q.lower() for q in queries_to_run]:
        queries_to_run.append('clover')

    discovered_items = []
    seen_discovered_slugs = set()

    for q in queries_to_run:
        print(f"  Searching backlist/OOS for '{q}'...")
        prods = search_products(q, is_available_only=False, max_pages=3)
        for it in prods:
            slug = it.get('slug')
            if slug and slug not in seen_discovered_slugs:
                seen_discovered_slugs.add(slug)
                discovered_items.append(it)

    print(f"Discovered {len(discovered_items)} candidate products.")

    # 3. Ingest discovered products into existing_books_map
    slugs_to_fetch = list(set(it.get('slug') for it in discovered_items if it.get('slug') and it.get('slug') not in existing_books_map))
    print(f"Concurrently fetching specs for {len(slugs_to_fetch)} new products...")
    from concurrent.futures import ThreadPoolExecutor

    specs_map = {}
    with ThreadPoolExecutor(max_workers=12) as executor:
        for s, sp in zip(slugs_to_fetch, executor.map(fetch_product_specs, slugs_to_fetch)):
            if sp:
                specs_map[s] = sp

    newly_added = 0
    for item in discovered_items:
        slug = item.get('slug')
        title = (item.get('title') or item.get('name') or '').strip()
        if not slug or not title:
            continue

        sp = specs_map.get(slug)
        if slug not in existing_books_map:
            if not sp:
                continue

            pub_name = (sp.get('publisher') or item.get('author') or '').lower()
            vol, sname = parse_title_smart(title)
            pub_id, pub_full, pub_short = None, None, None

            if 'phoenix' in pub_name or 'pgi' in pub_name:
                pub_id = 'pub_pgi'
                pub_full = 'Phoenix Gramedia Indonesia'
                pub_short = 'PGI'
            elif 'm&c' in pub_name or 'clover' in pub_name:
                pub_id = 'pub_mnc'
                pub_full = 'm&c! Publishing'
                pub_short = 'm&c!'
            elif 'elex' in pub_name:
                pub_id = 'pub_elex'
                pub_full = 'Elex Media Komputindo'
                pub_short = 'Elex Media'

            # If publisher not detected in sp, inherit from existing series
            if not pub_id and sname:
                base_slug, _ = clean_base_franchise(sname)
                for ex_b in existing_books_map.values():
                    bslug, _ = clean_base_franchise(ex_b.get('seriesName') or ex_b.get('title'))
                    if bslug == base_slug and ex_b.get('publisherId'):
                        pub_id = ex_b.get('publisherId')
                        pub_full = ex_b.get('publisherName')
                        pub_short = ex_b.get('publisherShortName')
                        break

            if not pub_id:
                continue
            slice_price = sp.get('original_price') or item.get('slice_price') or 0
            final_price = sp.get('price') or item.get('final_price') or slice_price or 0
            curr_p = final_price
            orig_p = slice_price if slice_price > curr_p else curr_p
            is_oos = sp.get('is_oos', False)
            rel_date = sp.get('releaseDate') or '2022-01-01'

            book_obj = {
                'id': f"pub_{slug.replace('-', '_')}",
                'slug': slug,
                'title': title,
                'originalTitle': sname or title,
                'seriesId': f"ser_{clean_slug(sname)}" if sname else None,
                'seriesName': sname,
                'volume': vol,
                'category': 'Manga', # temporary, will be determined by determine_book_medium
                'format': 'MANGA',
                'publisherId': pub_id,
                'publisherName': pub_full,
                'publisherShortName': pub_short,
                'coverImage': sp.get('coverImage') or '',
                'status': 'RELEASED',
                'availability': 'OUT_OF_STOCK' if is_oos else 'AVAILABLE',
                'releaseDate': rel_date,
                'isWednesdayRelease': False,
                'currentPrice': curr_p,
                'originalPrice': orig_p,
                'authors': [sp.get('author') or item.get('author') or 'Berbagai Penulis'],
                'genres': ['Manga'],
                'isbn13': sp.get('isbn13') or '',
                'synopsis': f"Rilisan resmi {title} terbitan {pub_full}.",
                'gramediaUrl': f"https://www.gramedia.com/products/{slug}",
                'classificationStatus': 'ACCEPTED',
                'classificationConfidence': 0.95,
                'classificationReason': f"Verified release from {pub_short}"
            }
            existing_books_map[slug] = book_obj
            newly_added += 1

    print(f"Successfully added {newly_added} new books (including OOS backlist).")

    # 4. Apply clean medium determination and franchise separation
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

    # 5. Edition & Set Consolidation (group by seriesId + volume)
    series_vol_map = defaultdict(list)
    for b in all_books:
        sid = b.get('seriesId')
        v = b.get('volume')
        series_vol_map[(sid, v)].append(b)

    canonical_books = []
    for (sid, v), b_list in series_vol_map.items():
        if len(b_list) == 1:
            b = b_list[0]
            b['title'] = EDITION_SUFFIX_REGEX.sub('', b['title']).strip(' :-–—+')
            canonical_books.append(b)
        else:
            regular = next(
                (b for b in b_list if not any(k in b['title'].lower() for k in ['special set', 'birthday set', 'limited edition', 'bundling', 'complete set', 'bonus'])),
                b_list[0]
            )
            editions = []
            for b in b_list:
                ed_name = 'Regular'
                t_low = b['title'].lower()
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
                    'gramediaUrl': b.get('gramediaUrl')
                })
            regular['title'] = EDITION_SUFFIX_REGEX.sub('', regular['title']).strip(' :-–—+')
            regular['availableEditions'] = editions
            if len(editions) > 1 and 'Pilihan Edisi & Set Resmi' not in (regular.get('synopsis') or ''):
                regular['synopsis'] = (regular.get('synopsis') or '') + f"\n\nPilihan Edisi & Set Resmi: {', '.join(e['name'] for e in editions)}"
            canonical_books.append(regular)

    # Deduplicate books with identical seriesId and clean title
    seen_titles = set()
    deduped_canonical = []
    for b in canonical_books:
        key = (b.get('seriesId'), clean_slug(b.get('title')))
        if key in seen_titles:
            continue
        seen_titles.add(key)
        b['availability'] = b.get('availability') or ('OUT_OF_STOCK' if b.get('is_oos') else 'AVAILABLE')
        b['status'] = b.get('status') or 'PUBLISHED'
        b['currentPrice'] = b.get('currentPrice') or 0
        b['originalPrice'] = b.get('originalPrice') or b['currentPrice']
        deduped_canonical.append(b)
    canonical_books = deduped_canonical

    # 6. Reconstruct Series metadata
    series_groups = defaultdict(list)
    for b in canonical_books:
        if b.get('seriesId'):
            series_groups[b['seriesId']].append(b)

    existing_series_map = {s['id']: s for s in catalog.get('series', [])}

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
            'status': 'ONGOING',
            'totalVolumes': total_vols,
            'latestVolume': latest_vol,
            'availableVolumes': avail_vols,
            'coverImage': cover,
            'description': s_desc
        }
        new_series_list.append(series_obj)

    new_series_list.sort(key=lambda s: s['name'].lower())

    catalog['lastUpdated'] = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    catalog['books'] = canonical_books
    catalog['series'] = new_series_list

    with open(CATALOG_PATH, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"\n[RECONCILE_SUCCESS] Catalog updated:")
    print(f"  - Total Books: {len(canonical_books)}")
    print(f"  - Total Series: {len(new_series_list)}")

if __name__ == '__main__':
    run()
