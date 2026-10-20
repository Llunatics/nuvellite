import { describe, it, expect } from 'vitest';
import { getBindUpGroupForSeriesSlug } from '../src/lib/catalog-service';

/**
 * Regression tests for the "Lihat Edisi Bind-Up" discovery button
 * (deep-6 audit, 2026-10-20).
 *
 * Background: bind-up books are sometimes shelved under a dedicated
 * "<Series> Bind Up" series (e.g. ser_naruto-bind-up, 29 books) while the
 * canonical series page is ser_naruto-manga. getBindUpGroupForSeriesSlug()
 * only matched the group's own seriesSlug, so the button NEVER appeared on
 * the canonical Naruto / Attack on Titan series pages — the exact pages
 * where a user would look for the bind-up edition.
 */
describe('bind-up discovery button (getBindUpGroupForSeriesSlug)', () => {
  it('finds the bind-up group from the canonical Naruto manga series page', () => {
    const g = getBindUpGroupForSeriesSlug('naruto-manga');
    expect(g).toBeDefined();
    expect(g!.books.length).toBeGreaterThan(0);
    expect(g!.displayName.toLowerCase()).toContain('naruto');
  });

  it('finds the Elex bind-up group from the m&c! Attack on Titan series page (cross-publisher)', () => {
    const g = getBindUpGroupForSeriesSlug('attack-on-titan');
    expect(g).toBeDefined();
    expect(g!.displayName.toLowerCase()).toContain('attack on titan');
  });

  it('still works when bind-up books live under the canonical series (Slam Dunk)', () => {
    expect(getBindUpGroupForSeriesSlug('slam-dunk')).toBeDefined();
  });

  it('does not advertise manga bind-ups on the Naruto (Novel) series page', () => {
    expect(getBindUpGroupForSeriesSlug('naruto-ln')).toBeUndefined();
  });

  it('does not match a similarly-named but different series (Dragon Ball Super)', () => {
    expect(getBindUpGroupForSeriesSlug('dragon-ball-super')).toBeUndefined();
  });

  it('returns undefined for a series with no bind-up edition (One Piece)', () => {
    expect(getBindUpGroupForSeriesSlug('one-piece-manga')).toBeUndefined();
  });
});
