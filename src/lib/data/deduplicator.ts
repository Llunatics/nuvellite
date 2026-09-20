import { Book, BookEdition, Series, BookFormat } from '../types';
import { parseTitleSmart } from './volume-parser';

export function cleanSlug(text: string): string {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  // Normalize common irregular plurals
  return slug.replace(/\bfeeling\b/g, 'feelings');
}

export function cleanBaseFranchise(name: string): { slug: string; canonicalName: string } {
  let n = (name || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
  n = n.replace(/\b(?:Novel|Light\s*Novel|Manga|Komik|Movie\s*Story|Movie)\b/gi, '').trim();
  n = n.replace(/\b(?:New Edition|Deluxe Edition|Special Set|Limited Edition|Tamat|End)\b/gi, '').trim();
  n = n.replace(/^[:\-–—]+|[:\-–—]+$/g, '').trim();

  const slug = cleanSlug(n);
  return { slug, canonicalName: n || name };
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

  // 1. Identify all mediums per base franchise
  const franchiseMediums: Record<string, Set<string>> = {};
  const franchiseCanonicalNames: Record<string, string> = {};

  for (const b of books) {
    const sname = b.seriesName || b.title;
    const { slug, canonicalName } = cleanBaseFranchise(sname);
    if (!slug) continue;

    if (!franchiseMediums[slug]) {
      franchiseMediums[slug] = new Set();
      franchiseCanonicalNames[slug] = canonicalName;
    }

    const tLower = b.title.toLowerCase();
    let medium = 'MANGA';
    if (b.category === 'Light Novel' || tLower.includes('light novel') || tLower.includes('(novel)')) {
      medium = 'LIGHT_NOVEL';
    } else if (tLower.includes('movie') || tLower.includes('movie story')) {
      medium = 'MOVIE';
    }
    franchiseMediums[slug].add(medium);
  }

  // 2. Assign medium-separated series IDs and titles
  const processedBooks: Book[] = books.map((b) => {
    const sname = b.seriesName || b.title;
    const { slug: baseSlug } = cleanBaseFranchise(sname);
    const baseName = franchiseCanonicalNames[baseSlug] || sname;

    const tLower = b.title.toLowerCase();
    let medium = 'MANGA';
    if (b.category === 'Light Novel' || tLower.includes('light novel') || tLower.includes('(novel)')) {
      medium = 'LIGHT_NOVEL';
    } else if (tLower.includes('movie') || tLower.includes('movie story')) {
      medium = 'MOVIE';
    }

    const hasMultipleMediums = (franchiseMediums[baseSlug]?.size || 0) > 1;

    let sid = `ser_${baseSlug}`;
    let sDisplay = baseName;
    let category = b.category;

    if (hasMultipleMediums) {
      if (medium === 'LIGHT_NOVEL') {
        sid = `ser_${baseSlug}-ln`;
        sDisplay = `${baseName} (Novel)`;
        category = 'Light Novel';
      } else if (medium === 'MOVIE') {
        sid = `ser_${baseSlug}-movie`;
        sDisplay = `${baseName} Movie`;
        category = 'Manga';
      } else {
        sid = `ser_${baseSlug}-manga`;
        sDisplay = baseName;
        category = 'Manga';
      }
    } else {
      category = medium === 'LIGHT_NOVEL' ? 'Light Novel' : 'Manga';
    }

    return {
      ...b,
      seriesId: sid,
      seriesName: sDisplay,
      category,
      format: category === 'Light Novel' ? 'LIGHT_NOVEL' : 'MANGA',
    };
  });

  // 3. Edition & Set Consolidation (group by seriesId + volume)
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
      // Find regular edition as primary
      const regular = bList.find((b) => {
        const t = b.title.toLowerCase();
        return !['special set', 'birthday set', 'limited edition', 'bundling', 'complete set', 'bonus'].some((k) => t.includes(k));
      }) || bList[0];

      const editions: BookEdition[] = [];
      for (const b of bList) {
        let edName = 'Regular';
        let edType: BookEdition['editionType'] = 'REGULAR';
        const t = b.title.toLowerCase();

        if (t.includes('special set') || t.includes('special')) {
          edName = 'Special Set';
          edType = 'SPECIAL_SET';
        } else if (t.includes('birthday set')) {
          edName = 'Birthday Set';
          edType = 'SPECIAL_SET';
        } else if (t.includes('complete set') || t.includes('box set')) {
          edName = 'Complete Set';
          edType = 'BUNDLE';
        } else if (t.includes('limited')) {
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

  // Deduplicate books with identical title and seriesId
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

    const vols = bList.map((b) => b.volume).filter((v): v is number => v !== null && v !== undefined);
    const availVols = Array.from(new Set(vols)).sort((a, b) => a - b);
    const latestVol = availVols.length > 0 ? Math.max(...availVols) : 1;

    const ex = existingSeriesMap[sid];
    let totalVols = availVols.length > 0 ? Math.max(availVols.length, latestVol, bList.length) : bList.length;
    let finalLatest = latestVol;
    let finalAvail = availVols;

    if (ex && ex.totalVolumes) {
      totalVols = Math.max(ex.totalVolumes, latestVol);
      finalLatest = Math.max(ex.latestVolume || 0, latestVol);
      finalAvail = Array.from(new Set([...(ex.availableVolumes || []), ...availVols])).sort((a, b) => a - b);
    }

    const cover = bList.find((b) => Boolean(b.coverImage))?.coverImage || ex?.coverImage || '';
    const author = sample.authors?.[0] || ex?.author || 'Berbagai Penulis';
    const sType = cat === 'Light Novel' || sid.endsWith('-ln') ? 'LIGHT_NOVEL' : 'MANGA';

    // Find missing volumes in known sequence
    const missingVolumes: number[] = [];
    if (finalAvail.length > 0 && finalLatest > 1) {
      const availSet = new Set(finalAvail);
      for (let v = 1; v <= finalLatest; v++) {
        if (!availSet.has(v)) {
          missingVolumes.push(v);
        }
      }
    }

    const sDesc = bList.find((b) => (b.synopsis?.length || 0) > 50)?.synopsis?.split('\n\nPilihan Edisi & Set Resmi:')[0]
      || ex?.description
      || `Diterbitkan resmi oleh ${pubName}.`;

    seriesList.push({
      id: sid,
      slug: sid.replace(/^ser_/, ''),
      name: sample.seriesName || sample.title,
      originalTitle: sample.seriesName || sample.title,
      publisherId: pubId,
      publisherName: pubName,
      author,
      type: sType,
      status: 'ONGOING',
      totalVolumes: totalVols,
      latestVolume: finalLatest,
      availableVolumes: finalAvail,
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
