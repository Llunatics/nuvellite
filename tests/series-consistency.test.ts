import { describe, it, expect } from 'vitest';
import {
  normalizeSeriesName,
  isDuplicateSeriesName,
  validatePrice,
  detectJunkTitle,
} from '@/lib/series-consistency';

describe('normalizeSeriesName', () => {
  it('strips publisher prefixes', () => {
    expect(normalizeSeriesName('Light Novel: Re:Zero - Starting Life')).toBe(
      're zero starting life'
    );
    expect(normalizeSeriesName('Level Comic: Gokushufudo 4')).toBe('gokushufudo 4');
  });

  it('normalizes punctuation variants to the same key', () => {
    expect(normalizeSeriesName('Bungo Stray Dogs - Beast')).toBe(
      normalizeSeriesName('Bungo Stray Dogs BEAST')
    );
  });

  it('strips bind-up markers', () => {
    expect(normalizeSeriesName('Black Jack Bind Up')).toBe('black jack');
    expect(normalizeSeriesName('Naruto (Omnibus)')).toBe('naruto');
  });

  it('handles empty input', () => {
    expect(normalizeSeriesName('')).toBe('');
    expect(normalizeSeriesName(null)).toBe('');
  });
});

describe('isDuplicateSeriesName', () => {
  it('detects exact duplicates across punctuation', () => {
    expect(
      isDuplicateSeriesName('Bungo Stray Dogs - Beast', 'Bungo Stray Dogs BEAST')
    ).toBe(true);
    expect(
      isDuplicateSeriesName('Kindaichi 37', 'Kindaichi 37 Tahun')
    ).toBe(false); // different (Tahun = distinct)
  });

  it('rejects different series', () => {
    expect(isDuplicateSeriesName('Naruto', 'Boruto')).toBe(false);
  });

  it('rejects too-short names', () => {
    expect(isDuplicateSeriesName('N', 'N')).toBe(false);
  });
});

describe('validatePrice', () => {
  it('passes valid prices', () => {
    const r = validatePrice(36000, 40000);
    expect(r.valid).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('auto-fixes currentPrice > originalPrice swap', () => {
    const r = validatePrice(99000, 89100);
    expect(r.valid).toBe(false);
    expect(r.fixedCurrent).toBe(89100);
    expect(r.fixedOriginal).toBe(99000);
  });

  it('flags suspicious >90% discount', () => {
    const r = validatePrice(5000, 100000);
    expect(r.issues.some((i) => i.includes('suspicious'))).toBe(true);
    // not auto-fixed
    expect(r.fixedCurrent).toBeUndefined();
  });

  it('flags negative prices', () => {
    const r = validatePrice(-100, 50000);
    expect(r.issues.some((i) => i.includes('negative'))).toBe(true);
  });

  it('handles null prices', () => {
    const r = validatePrice(null, undefined);
    expect(r.valid).toBe(true);
  });
});

describe('detectJunkTitle', () => {
  it('detects bundling SKUs', () => {
    expect(detectJunkTitle('Bundling Komik - JBA8')).toBe('bundling SKU');
  });

  it('detects satuan placeholders', () => {
    expect(detectJunkTitle('Komik Satuan')).toBe('satuan placeholder');
    expect(detectJunkTitle('Satuan')).toBe('satuan placeholder');
  });

  it('exempts Witch Hat Atelier from hunter-hat rule', () => {
    expect(detectJunkTitle('Witch Hat Atelier 12')).toBeNull();
    expect(detectJunkTitle('Hunter Hat Press Ssst X Gerai Kompas')).toBe(
      'hunter hat junk (witch hat atelier is exempt)'
    );
  });

  it('passes legitimate titles', () => {
    expect(detectJunkTitle('One Piece 101')).toBeNull();
    expect(detectJunkTitle('Paket One Piece 31-40')).toBeNull(); // has volume range
  });
});
