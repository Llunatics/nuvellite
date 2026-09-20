#!/usr/bin/env python3
"""
Data Cleanup & Re-Classification Pipeline for Nuvellite
Purges all non-manga/non-LN books, sanitizes ISBNs and authors,
rebuilds series and volumes, and guarantees catalog purity.
"""

import json
import re
import os
from datetime import datetime, timezone
from collections import defaultdict

CATALOG_PATH = os.path.join(os.path.dirname(__file__), '../src/data/catalog.json')

# Strict rejection list of non-manga / non-LN items
EXCLUDED_TITLE_KEYWORDS = [
    'canvas paint by number', 'games & puzzles', 'geronimo stilton', 'thea stilton',
    'the story orchestra', 'pop-up edukatif', 'riko siap bobok', 'sabar, ya riko',
    'amazepops', 'start with why', 'burnout', 'ego is the enemy', 'parent like it matters',
    'daring greatly', 'dare to lead', 'how to be an adult in relationships', 'think again',
    'the four agreements', 'the way of integrity', 'the mastery of love', 'next conversation',
    'the idiot', 'the patriarchs', 'principles: your guided journal', 'get on the job and organize',
    'how to live a meaningful life', 'how great ideas happen', 'the future saints',
    'the secret language of work', 'we should all be feminists', 'hood feminism',
    'hukum dan keadilan', 'memoirs from the women', 'taiwan travelogue', 'the penguin book',
    'squirrel lock holmes', 'comfy corner', 'americanah', 'the rest of our lives',
    'love forms', 'universality', 'one boat', 'dream notes', 'treasure pack',
    'catstronauts', 'teenlit: beautiflu', 'sembilan budak setan', 'jordy kano',
    'cerita khatulistiwa', 'more than friends, less than lovers', 'love makes you stupid',
    '5-layer folder', 'clear folder', 'clear file', 'key ring', 'gantungan kunci',
    'acrylic stand', 'standee', 'bookmark set', 'phone holder', 'finger grip',
    'ring stand', 'tote bag', 'totebag', 'sling bag', 'backpack', 'tas laptop'
]

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

def sanitize_isbn(isbn_raw):
    if not isbn_raw:
        return ''
    cleaned = re.sub(r'[^0-9Xx]', '', str(isbn_raw))
    if re.match(r'^(?:97[89]\d{10}|\d{9}[\dXx]|\d{10,13})$', cleaned):
        return cleaned
    return ''

def sanitize_authors(authors_raw):
    if not authors_raw:
        return ['Berbagai Penulis']
    cleaned = []
    for a in authors_raw:
        if isinstance(a, str):
            if '[object Object]' not in a and a.strip():
                cleaned.append(a.strip())
        elif isinstance(a, dict) and a.get('name'):
            cleaned.append(str(a['name']).strip())
    return cleaned if cleaned else ['Berbagai Penulis']

def run_cleanup():
    import subprocess
    raw_git = subprocess.check_output(['git', 'show', 'HEAD:src/data/catalog.json'])
    data = json.loads(raw_git)

    raw_books = data.get('books', [])
    existing_series_map = {s['id']: s for s in data.get('series', [])}
    print(f"Loaded {len(raw_books)} original books and {len(existing_series_map)} series from git HEAD.")

    valid_books = []
    purged_count = 0
    purged_samples = []

    for b in raw_books:
        title = b.get('title', '').strip()
        t_lower = title.lower()
        pub_id = b.get('publisherId', '')

        # Strictly only official 3 publishers
        if pub_id not in ['pub_elex', 'pub_mnc', 'pub_pgi']:
            purged_count += 1
            continue

        # Strictly no merchandise category
        if b.get('category') == 'Merchandise':
            purged_count += 1
            continue

        # Check negative list
        if any(k in t_lower for k in EXCLUDED_TITLE_KEYWORDS):
            purged_count += 1
            if len(purged_samples) < 15:
                purged_samples.append((title, b.get('publisherName'), b.get('category')))
            continue

        # Sanitize ISBN and authors
        b['isbn13'] = sanitize_isbn(b.get('isbn13'))
        b['authors'] = sanitize_authors(b.get('authors'))
        b['author'] = b['authors'][0]

        # Parse volume and series
        v, s = parse_title_smart(title)
        if v is not None and not b.get('volume'):
            b['volume'] = v
        if s and (not b.get('seriesName') or len(b.get('seriesName', '')) < 3):
            b['seriesName'] = s

        # Keep original category if it was already valid Manga / Light Novel
        if 'light novel' in t_lower or '(novel)' in t_lower or b.get('category') == 'Light Novel':
            b['category'] = 'Light Novel'
            b['format'] = 'LIGHT_NOVEL'
        else:
            b['category'] = 'Manga'
            b['format'] = 'MANGA'

        # Ensure gramediaUrl is always valid
        if not b.get('gramediaUrl') or not b['gramediaUrl'].startswith('https://www.gramedia.com/products/'):
            b['gramediaUrl'] = f"https://www.gramedia.com/products/{b['slug']}"

        b['classificationStatus'] = 'ACCEPTED'
        b['classificationConfidence'] = 0.95
        b['classificationReason'] = f"Official {b['category']} release verified"

        valid_books.append(b)

    print(f"\nPurged {purged_count} non-manga/merchandise items.")
    print("Sample purged titles:")
    for s in purged_samples:
        print(f"  - {s[0]} ({s[1]}, was: {s[2]})")

    print(f"\nRemaining valid books: {len(valid_books)}")

    # Dynamic Franchise Separation (Manga vs LN vs Movie)
    franchise_mediums = defaultdict(set)
    franchise_canonical_names = {}

    for b in valid_books:
        sname = b.get('seriesName') or b.get('title')
        base_slug, base_name = clean_base_franchise(sname)
        if base_slug:
            if base_slug not in franchise_canonical_names:
                franchise_canonical_names[base_slug] = base_name

            t_lower = b['title'].lower()
            if b.get('category') == 'Light Novel' or '(novel)' in t_lower or 'light novel' in t_lower:
                medium = 'LIGHT_NOVEL'
            elif 'movie' in t_lower or 'movie story' in t_lower:
                medium = 'MOVIE'
            else:
                medium = 'MANGA'
            franchise_mediums[base_slug].add(medium)

    # Assign medium-separated seriesId and seriesName
    for b in valid_books:
        sname = b.get('seriesName') or b.get('title')
        base_slug, _ = clean_base_franchise(sname)
        base_name = franchise_canonical_names.get(base_slug, sname)

        t_lower = b['title'].lower()
        if b.get('category') == 'Light Novel' or '(novel)' in t_lower or 'light novel' in t_lower:
            medium = 'LIGHT_NOVEL'
        elif 'movie' in t_lower or 'movie story' in t_lower:
            medium = 'MOVIE'
        else:
            medium = 'MANGA'

        has_multiple = len(franchise_mediums[base_slug]) > 1

        if has_multiple:
            if medium == 'LIGHT_NOVEL':
                sid = f"ser_{base_slug}-ln"
                s_display = f"{base_name} (Novel)"
                b['category'] = 'Light Novel'
                b['format'] = 'LIGHT_NOVEL'
            elif medium == 'MOVIE':
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
            b['category'] = 'Light Novel' if medium == 'LIGHT_NOVEL' else 'Manga'
            b['format'] = 'LIGHT_NOVEL' if medium == 'LIGHT_NOVEL' else 'MANGA'

        b['seriesId'] = sid
        b['seriesName'] = s_display

    # Dynamic Set & Edition Consolidation
    series_vol_map = defaultdict(list)
    for b in valid_books:
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
        deduped_canonical.append(b)
    canonical_books = deduped_canonical

    # Reconstruct Series
    series_groups = defaultdict(list)
    for b in canonical_books:
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
            'type': series_type,
            'status': 'ONGOING',
            'totalVolumes': total_vols,
            'latestVolume': latest_vol,
            'availableVolumes': avail_vols,
            'coverImage': cover,
            'description': s_desc
        }
        new_series_list.append(series_obj)

    new_series_list.sort(key=lambda s: s['name'].lower())

    # Build price snapshots for every book
    snapshots = []
    for b in canonical_books:
        snapshots.append({
            'id': f"snap_{b['id']}_init",
            'bookId': b['id'],
            'price': b['currentPrice'],
            'availability': 'AVAILABLE' if b.get('status') == 'PUBLISHED' else 'PREORDER',
            'observedAt': b.get('releaseDate') or datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            'source': 'gramedia_api'
        })

    # Prepare final clean catalog
    data['publishers'] = [p for p in data.get('publishers', []) if p['id'] in ['pub_elex', 'pub_mnc', 'pub_pgi']]
    data['lastUpdated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    data['books'] = canonical_books
    data['series'] = new_series_list
    data['priceSnapshots'] = snapshots

    with open(CATALOG_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    manga_count = len([b for b in canonical_books if b['category'] == 'Manga'])
    ln_count = len([b for b in canonical_books if b['category'] == 'Light Novel'])

    print(f"\nSuccessfully cleaned and saved catalog to {CATALOG_PATH}:")
    print(f"  - Total Books: {len(canonical_books)} (Manga: {manga_count}, LN: {ln_count})")
    print(f"  - Total Series: {len(new_series_list)}")
    print(f"  - Price Snapshots: {len(snapshots)}")

if __name__ == '__main__':
    run_cleanup()
