import { describe, it, expect } from 'vitest';
import { getAllSeries } from '../src/lib/catalog-service';
import fullCatalogData from '../src/data/catalog.json';
import type { Book } from '../src/lib/types';

// Full catalog (with synopsis + availableEditions); the listing strips them.
const fullBooks = (fullCatalogData as unknown as { books: Book[] }).books.filter(
  (b) =>
    (b.category === 'Manga' || b.category === 'Light Novel') &&
    ['pub_elex', 'pub_mnc', 'pub_pgi'].includes(b.publisherId) &&
    b.classificationStatus !== 'REJECTED' &&
    b.classificationStatus !== 'REVIEW_REQUIRED'
);

/**
 * Regression tests for the "Pilihan Edisi & Set Resmi" synopsis marker
 * (deep-6 audit, 2026-10-20).
 *
 * Background: the sync pipeline appends a "\n\nPilihan Edisi & Set Resmi: ..."
 * marker to a book's synopsis when edition variants are folded. Two leaks
 * were found in the real catalog:
 *
 * 1. Series descriptions inherited the raw marker (Python reconstruct_series
 *    did not strip it, unlike the TS consolidator which splits it off).
 *    Users saw "...Pilihan Edisi & Set Resmi: Regular, Regular" at the end
 *    of series descriptions (64 series).
 * 2. Books kept a stale marker after their edition variants disappeared
 *    (the pipeline appended but never removed it): 64 books carried the
 *    marker with zero availableEditions.
 */
// Strict pattern for the PIPELINE's own edition marker (mirrors
// scripts/auto-sync-catalog.py::_EDITION_MARKER_RE). Vendor marketing copy
// that merely contains the words "Pilihan Edisi & Set Resmi" is excluded.
const PIPELINE_MARKER_RE =
  /\n\nPilihan Edisi & Set Resmi: ((?:Regular|Special Set|Birthday Set|Complete Set|Limited Edition)(?:, (?:Regular|Special Set|Birthday Set|Complete Set|Limited Edition))*)\s*$/;

describe('Pilihan Edisi marker hygiene', () => {
  it('no series description leaks the raw pipeline edition marker', () => {
    // Strict: our own marker format. (One series, Blue Lock Episode Nagi,
    // carries VENDOR marketing copy with similar words — vendor content,
    // not the pipeline marker; noted in the audit log, not stripped here.)
    const bad = getAllSeries().filter((s) =>
      PIPELINE_MARKER_RE.test(s.description || '')
    );
    expect(
      bad.map((s) => s.id),
      'series descriptions must not contain the raw marker'
    ).toEqual([]);
  });

  it('no book carries the marker without multiple available editions', () => {
    // Strict: the PIPELINE's own marker format only. Vendor marketing copy
    // that merely contains the words "Pilihan Edisi & Set Resmi"
    // (e.g. "📌 **Pilihan Edisi & Set Resmi:** ...") is not ours to strip.
    const bad = fullBooks.filter(
      (b) =>
        PIPELINE_MARKER_RE.test(b.synopsis || '') &&
        (b.availableEditions || []).length <= 1
    );
    expect(
      bad.map((b) => b.slug),
      'marker without >1 availableEditions is stale'
    ).toEqual([]);
  });

  it('every surviving marker matches the actual edition names', () => {
    const mismatched: string[] = [];
    for (const b of fullBooks) {
      const m = (b.synopsis || '').match(PIPELINE_MARKER_RE);
      if (!m) continue;
      const markerNames = m[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .sort();
      const editionNames = (b.availableEditions || [])
        .map((e) => (e.name || '').trim())
        .filter(Boolean)
        .sort();
      if (JSON.stringify(markerNames) !== JSON.stringify(editionNames)) {
        mismatched.push(`${b.slug}: marker=[${markerNames}] editions=[${editionNames}]`);
      }
    }
    expect(mismatched, 'marker must mirror availableEditions').toEqual([]);
  });
});
