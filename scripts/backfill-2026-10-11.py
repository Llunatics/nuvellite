"""One-off backfill 2026-10-11 (user-requested data fixes).

1. Purge 15 verified non-manga/non-LN books (14 Elex junk + PGI 'Miaow').
2. Re-derive book medium with the fixed determine_book_medium
   (PGI LN-only franchises, Clover prefix fix) and re-run the franchise
   medium separation + series reconstruction (steps 5-6 of the sync).
3. Re-run bind-up detection.

Run from scripts/: python3 backfill-2026-10-11.py
"""
import importlib.util
import json
import os
from collections import defaultdict

spec = importlib.util.spec_from_file_location(
    'syncmod', os.path.abspath('auto-sync-catalog.py'))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

CATALOG = '../src/data/catalog.json'

PURGE_IDS = {
    'pub_capcut_from_basic_to_magic',
    'pub_capcut_next_level_dari_pemula_sampai_profesional',
    'pub_chip_war_pertarungan_untuk_teknologi_paling_krusial_di_dunia',
    'pub_excel_survival_kit_panduan_praktis_menguasai_excel_untuk_dunia_kerja',
    'pub_hack_the_human',
    'pub_kebijakan_publik_untuk_pemimpin_indonesia',
    'pub_letters_from_gaza_suara_mereka_dari_masamasa_yang_luar_biasa',
    'pub_lintas_sejarah_etnis_tionghoa_di_malang_dari_singhasari_sampai_reformasi',
    'pub_memahami_jepang_sejarah_singkat_negeri_para_samurai',
    'pub_republik_rakyat_china_dari_mao_zedong_sampai_xi_jinping',
    'pub_tip_trik_content_creator_ai',
    'pub_sebuah_kota_sebuah_umpama',
    'pub_para_perasuk_the_art_and_craft_of_filmmaking',
    'pub_samurai_jalan_kehormatan_sang_pejuang_terakhir',
    # PGI classic novel (not manga/LN)
    'pub_miaow',
}

with open(CATALOG, encoding='utf-8') as f:
    catalog = json.load(f)

books = catalog['books']
print(f'books before: {len(books)}')

# 0. Collateral check: every KNOWN_NON_MANGA_SERIES fragment must only hit
#    books we intend to purge (or nothing at all).
for frag in mod.KNOWN_NON_MANGA_SERIES:
    hits = [b['id'] for b in books if frag in (b.get('title') or '').lower()]
    bad = [h for h in hits if h not in PURGE_IDS]
    status = 'OK' if not bad else f'COLLATERAL: {bad}'
    print(f'  fragment {frag!r}: {len(hits)} hits -> {status}')

# 1. Purge (idempotent: skip ids already gone).
found = [pid for pid in PURGE_IDS if any(b['id'] == pid for b in books)]
books = [b for b in books if b['id'] not in PURGE_IDS]
print(f'purged {len(found)} (already gone: {len(PURGE_IDS) - len(found)}), books after: {len(books)}')

# 2. Re-derive medium (fixed determine_book_medium) + franchise separation.
cat_changes = []
for b in books:
    med = mod.determine_book_medium(b)
    new_cat = 'Light Novel' if med == 'LIGHT_NOVEL' else 'Manga'
    new_fmt = 'LIGHT_NOVEL' if med == 'LIGHT_NOVEL' else 'MANGA'
    if b.get('category') != new_cat:
        cat_changes.append((b.get('title'), b.get('category'), new_cat))
        b['category'] = new_cat
        b['format'] = new_fmt
        b['classificationReason'] = (
            b.get('classificationReason') or '') + ' [medium re-derived 2026-10-11]'

print(f'category changes: {len(cat_changes)}')
for t, old, new in cat_changes:
    print(f'  {old} -> {new}: {t}')

franchise_mediums = defaultdict(set)
franchise_canonical_names = {}
for b in books:
    sname = b.get('seriesName') or b.get('title')
    base_slug, base_name = mod.clean_base_franchise(sname)
    if base_slug:
        if base_slug not in franchise_canonical_names:
            franchise_canonical_names[base_slug] = base_name
        franchise_mediums[base_slug].add(mod.determine_book_medium(b))

sid_changes = []
for b in books:
    sname = b.get('seriesName') or b.get('title')
    base_slug, _ = mod.clean_base_franchise(sname)
    base_name = franchise_canonical_names.get(base_slug, sname)
    med = mod.determine_book_medium(b)
    has_multiple = len(franchise_mediums[base_slug]) > 1
    if has_multiple:
        if med == 'LIGHT_NOVEL':
            sid = f'ser_{base_slug}-ln'
            s_display = f'{base_name} (Novel)'
        elif med == 'MOVIE':
            sid = f'ser_{base_slug}-movie'
            s_display = f'{base_name} Movie'
        else:
            sid = f'ser_{base_slug}-manga'
            s_display = base_name
    else:
        sid = f'ser_{base_slug}'
        s_display = base_name
    if b.get('seriesId') != sid:
        sid_changes.append((b.get('title'), b.get('seriesId'), sid))
    b['seriesId'] = sid
    b['seriesName'] = s_display

print(f'seriesId changes: {len(sid_changes)}')
for t, old, new in sid_changes[:20]:
    print(f'  {old} -> {new}: {t}')

# 3. Series reconstruction (faithful to sync step 6).
existing_series_map = {s['id']: s for s in catalog.get('series', [])}
series_groups = defaultdict(list)
for b in books:
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
    s_desc = first_vol.get('synopsis') or f'Diterbitkan resmi oleh {pub_name}.'
    new_series_list.append({
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
        'description': s_desc,
    })
new_series_list.sort(key=lambda s: s['name'].lower())

# 4. Bind-up re-detection.
flagged = 0
for b in books:
    kind, label = mod.detect_bind_up(b.get('title') or '', b.get('seriesName') or '',
                                     b.get('publisherId') or '')
    b['isBindUp'] = kind is not None
    b['bindUpKind'] = kind
    b['bindUpLabel'] = label
    if kind:
        flagged += 1

catalog['books'] = books
catalog['series'] = new_series_list
with open(CATALOG, 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False)
print(f'saved: {len(books)} books, {len(new_series_list)} series, {flagged} bind-up flagged')
