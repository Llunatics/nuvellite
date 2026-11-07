import domainRules from '@/data/domain-rules.json';
import { Book, BookEdition, Series, BookFormat } from '../types';
import { isPgiProseNovelTitle, isPgiReZeroLn } from './classifier';
import { resolveBaseAlias, resolveMediumAlias } from '../series-consistency';

const VERIFIED_LIGHT_NOVEL_FRAGMENTS = domainRules.classification.verifiedLightNovelFragments;

export { isPgiProseNovelTitle };

export function cleanSlug(text: string): string {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.replace(/\bfeeling\b/g, 'feelings');
}

export function cleanBaseFranchise(name: string): { slug: string; canonicalName: string } {
  const raw = (name || '').trim();
  let n = raw
    .replace(/\((?:novel|light\s*novel|manga|komik|omnibus|bind[\s-]?up(?:\s+edition)?|tamat|end)\)/gi, '')
    .trim();
  const nNoBrackets = n.replace(/\(.*?\)|\[.*?\]/g, '').trim();
  if (nNoBrackets.length >= 2 && !/^\d+$/.test(nNoBrackets)) {
    n = nNoBrackets;
  } else {
    n = n.replace(/[\[\]()]/g, ' ');
  }
  n = n.replace(/\bThe\s+Movie\s+Story\b|\bThe\s+Movie\b/gi, '').trim();
  n = n.replace(/\b(?:Novel|Light\s*Novel|Manga|Komik|Movie\s*Story|Movie)\b/gi, '').trim();
  n = n.replace(/\b(?:New Edition|Deluxe Edition|Special Set|Limited Edition)\b/gi, '').trim();
  n = n.replace(/(?:[\-–—:+]\s*|\(\s*)\b(?:Tamat|End)\b\s*\)?$/gi, '').trim();
  n = n.replace(/^[:\-–—]+|[:\-–—]+$/g, '').replace(/\s+/g, ' ').trim();

  const slug = cleanSlug(n) || cleanSlug(raw);
  return { slug, canonicalName: n || raw };
}

export interface ConsolidateOptions {
  books: Book[];
  existingSeriesMap?: Record<string, Series>;
}

export interface ConsolidationResult {
  canonicalBooks: Book[];
  seriesList: Series[];
}

export function consolidateCatalog(options: ConsolidateOptions): ConsolidationResult {
  const { books, existingSeriesMap = {} } = options;

  function determineBookMedium(b: Book): 'LIGHT_NOVEL' | 'MOVIE' | 'MANGA' {
    const title = (b.title || '').trim();
    const tLower = title.toLowerCase();
    const catSlugs = ((b as any).categorySlugs || '').toLowerCase();
    const imprint = (b.imprint || '').toLowerCase();

    const hasLNToken =
      /\b(?:light[\s-]*novel|the\s+novel)\b|\(novel\)/i.test(title) ||
      catSlugs.includes('light-novel') ||
      b.genres?.some((g) => g.toLowerCase().includes('light novel') || g.toLowerCase() === 'novel');

    // Explicit LN token wins over 'movie' (e.g. "Light Novel One Piece: ... The Movie")
    if (hasLNToken) {
      return 'LIGHT_NOVEL';
    }

    if (VERIFIED_LIGHT_NOVEL_FRAGMENTS.some((f) => tLower.includes(f))) {
      return 'LIGHT_NOVEL';
    }

    if (tLower.includes('movie') || tLower.includes('movie story')) {
      return 'MOVIE';
    }

    if (b.publisherId === 'pub_pgi') {
      if (isPgiReZeroLn(title, b.publisherId)) return 'LIGHT_NOVEL';
      if (isPgiProseNovelTitle(title) || catSlugs.includes('fiksi-sastra')) return 'LIGHT_NOVEL';
      return 'MANGA';
    }

    const isCloverNovel =
      b.publisherId === 'pub_mnc' &&
      (tLower.startsWith('clover') ||
        imprint.includes('clover') ||
        catSlugs.includes('novel-6') ||
        tLower.startsWith('eighty six') ||
        b.genres?.some((g) => g.toLowerCase().includes('novel') || g.toLowerCase().includes('fiksi ilmiah')));

    if (isCloverNovel) {
      return 'LIGHT_NOVEL';
    }

    if (b.category === 'Light Novel' && !/\b(?:komik|manga|level comic|lc:)\b/i.test(tLower)) {
      return 'LIGHT_NOVEL';
    }

    return 'MANGA';
  }

  const franchiseMediums: Record<string, Set<string>> = {};
  const franchiseCanonicalNames: Record<string, string> = {};

  function baseOf(sname: string): { slug: string; name: string } {
    const { slug, canonicalName } = cleanBaseFranchise(sname);
    const [canonSlug, aliasName] = resolveBaseAlias(slug);
    return { slug: canonSlug, name: aliasName ?? canonicalName };
  }

  for (const b of books) {
    const sname = b.seriesName || b.title;
    const { slug, name } = baseOf(sname);
    if (!slug) continue;

    const medium = determineBookMedium(b);
    const [canonSlug, mediumAliasName] = resolveMediumAlias(slug, medium);

    if (!franchiseMediums[canonSlug]) {
      franchiseMediums[canonSlug] = new Set();
      franchiseCanonicalNames[canonSlug] = mediumAliasName ?? name;
    } else if (mediumAliasName) {
      franchiseCanonicalNames[canonSlug] = mediumAliasName;
    }

    franchiseMediums[canonSlug].add(medium);
  }

  const processedBooks: Book[] = books.map((b) => {
    const sname = b.seriesName || b.title;
    const { slug: rawSlug } = baseOf(sname);
    const medium = determineBookMedium(b);
    const [baseSlug, mediumAliasName] = resolveMediumAlias(rawSlug, medium);
    const baseName = mediumAliasName ?? franchiseCanonicalNames[baseSlug] ?? sname;

    const hasMultipleMediums = (franchiseMediums[baseSlug]?.size || 0) > 1;

    let sid = `ser_${baseSlug}`;
    let sDisplay = baseName;
    let category: Book['category'] = b.category;

    if (hasMultipleMediums) {
      if (medium === 'LIGHT_NOVEL') {
        sid = `ser_${baseSlug}-ln`;
        sDisplay = baseName.toLowerCase().endsWith('(novel)') ? baseName : `${baseName} (Novel)`;
        category = 'Light Novel';
      } else if (medium === 'MOVIE') {
        sid = `ser_${baseSlug}-movie`;
        sDisplay = baseName.endsWith('Movie') ? baseName : `${baseName} Movie`;
        category = 'Manga';
      } else {
        sid = `ser_${baseSlug}-manga`;
        sDisplay = baseName;
        category = 'Manga';
      }
    } else {
      if (medium === 'MOVIE' && !sDisplay.endsWith('Movie')) {
        sDisplay = `${sDisplay} Movie`;
      }
      category = medium === 'LIGHT_NOVEL' ? 'Light Novel' : 'Manga';
    }

    return {
      ...b,
      seriesId: sid,
      seriesName: sDisplay,
      category,
      format: (category === 'Light Novel' ? 'LIGHT_NOVEL' : 'MANGA') as BookFormat,
    };
  });

  // 3. Edition & Set Consolidation
  const SPECIAL_EDITION_RE =
    /\b(?:special\s+set|birthday\s+set|limited\s+edition|complete\s+set|box\s+set|bundling(?:\s+set)?)\b/i;

  const seriesVolMap = new Map<string, Book[]>();
  for (const b of processedBooks) {
    const key = `${b.seriesId || 'none'}__vol_${b.volume ?? 'novol'}`;
    if (!seriesVolMap.has(key)) {
      seriesVolMap.set(key, []);
    }
    seriesVolMap.get(key)!.push(b);
  }

  const canonicalBooks: Book[] = [];
  for (const bList of seriesVolMap.values()) {
    if (bList.length === 1) {
      canonicalBooks.push(bList[0]);
    } else {
      const regular =
        bList.find((b) => !SPECIAL_EDITION_RE.test(b.title || '')) || bList[0];

      const editions: BookEdition[] = [];
      for (const b of bList) {
        let edName = 'Regular';
        let edType: BookEdition['editionType'] = 'REGULAR';
        const t = b.title.toLowerCase();

        if (t.includes('special set')) {
          edName = 'Special Set';
          edType = 'SPECIAL_SET';
        } else if (t.includes('birthday set')) {
          edName = 'Birthday Set';
          edType = 'SPECIAL_SET';
        } else if (t.includes('complete set') || t.includes('box set')) {
          edName = 'Complete Set';
          edType = 'BUNDLE';
        } else if (t.includes('limited edition') || /[\-–—(]\s*limited\b/i.test(b.title)) {
          edName = 'Limited Edition';
          edType = 'LIMITED';
        }

        editions.push({
          name: edName,
          editionType: edType,
          price: b.currentPrice,
          gramediaUrl: b.gramediaUrl,
          isAvailable: b.availability !== 'OUT_OF_STOCK',
        });
      }

      let synopsis = regular.synopsis || '';
      if (editions.length > 1 && !synopsis.includes('Pilihan Edisi & Set Resmi')) {
        synopsis = `${synopsis}\n\nPilihan Edisi & Set Resmi: ${editions.map((e) => e.name).join(', ')}`;
      }

      canonicalBooks.push({
        ...regular,
        availableEditions: editions,
        synopsis,
      });
    }
  }

  const seenTitles = new Set<string>();
  const dedupedCanonical: Book[] = [];
  for (const b of canonicalBooks) {
    const key = `${b.seriesId}__${cleanSlug(b.title)}`;
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    dedupedCanonical.push(b);
  }

  // 4. Series Reconstruction
  const seriesGroups = new Map<string, Book[]>();
  for (const b of dedupedCanonical) {
    if (!b.seriesId) continue;
    if (!seriesGroups.has(b.seriesId)) {
      seriesGroups.set(b.seriesId, []);
    }
    seriesGroups.get(b.seriesId)!.push(b);
  }

  const seriesList: Series[] = [];
  for (const [sid, bList] of seriesGroups.entries()) {
    const sample = bList[0];
    const cat = sample.category;
    const pubId = sample.publisherId;
    const pubName = sample.publisherName;

    const vols = bList
      .map((b) => b.volume)
      .filter((v): v is number => typeof v === 'number' && v > 0);
    const availVols = Array.from(new Set(vols)).sort((a, b) => a - b);
    const latestVol = availVols.length > 0 ? Math.max(...availVols) : 1;
    const totalVols = availVols.length > 0 ? Math.max(availVols.length, latestVol) : bList.length;

    const ex = existingSeriesMap[sid];
    const hasEndMarker = bList.some((b) =>
      /(?:[\-–—:+]\s*|\(\s*)\b(?:Tamat|End)\b/i.test(b.title || '')
    );
    const status: Series['status'] =
      hasEndMarker || ex?.status === 'COMPLETED' ? 'COMPLETED' : 'ONGOING';

    const cover = bList.find((b) => Boolean(b.coverImage))?.coverImage || ex?.coverImage || '';
    const author = sample.authors?.[0] || ex?.author || 'Berbagai Penulis';
    const sType = cat === 'Light Novel' || sid.endsWith('-ln') ? 'LIGHT_NOVEL' : 'MANGA';

    const missingVolumes: number[] = [];
    if (availVols.length > 0 && latestVol > 1) {
      const availSet = new Set(availVols);
      for (let v = 1; v <= latestVol; v++) {
        if (!availSet.has(v)) {
          missingVolumes.push(v);
        }
      }
    }

    const sDesc =
      bList
        .find((b) => (b.synopsis?.length || 0) > 50)
        ?.synopsis?.split('\n\nPilihan Edisi & Set Resmi:')[0] ||
      ex?.description ||
      `Diterbitkan resmi oleh ${pubName}.`;

    seriesList.push({
      id: sid,
      slug: sid.replace(/^ser_/, ''),
      name: sample.seriesName || sample.title,
      originalTitle: sample.seriesName || sample.title,
      publisherId: pubId,
      publisherName: pubName,
      author,
      type: sType,
      status,
      totalVolumes: totalVols,
      latestVolume: latestVol,
      availableVolumes: availVols,
      missingVolumes,
      coverImage: cover,
      description: sDesc,
    });
  }

  seriesList.sort((a, b) => a.name.localeCompare(b.name));

  return {
    canonicalBooks: dedupedCanonical,
    seriesList,
  };
}