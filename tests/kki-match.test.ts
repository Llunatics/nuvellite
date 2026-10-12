import { describe, it, expect } from 'vitest';
import {
  normalizeKkiTitle,
  kkiAuthorScore,
  decideKkiMatch,
  isPersonAuthor,
} from '../src/lib/data/kki-matcher';

describe('KKI title normalization', () => {
  it('lowercases, strips punctuation and collapses whitespace', () => {
    expect(normalizeKkiTitle('Detektif Conan')).toBe('detektif conan');
    expect(normalizeKkiTitle('Re:Zero -Starting Life in Another World-')).toBe(
      're zero starting life in another world',
    );
    expect(normalizeKkiTitle('  .hack//G.U.+  ')).toBe('hack g u');
  });

  it('drops publisher prefixes', () => {
    expect(normalizeKkiTitle('Level Comic: Jujutsu Kaisen 24')).toBe('jujutsu kaisen 24');
    expect(normalizeKkiTitle('Akasha: Chainsaw Man 15')).toBe('chainsaw man 15');
  });
});

describe('KKI author signal', () => {
  it('treats publisher names in the author field as unverifiable', () => {
    expect(isPersonAuthor('Elex Media Komputindo')).toBe(false);
    expect(isPersonAuthor('m&c!')).toBe(false);
    expect(isPersonAuthor('Hajime Isayama')).toBe(true);
    expect(isPersonAuthor('')).toBe(false);
  });

  it('returns -1 when either side is unverifiable', () => {
    expect(kkiAuthorScore('Elex Media Komputindo', 'Hajime Isayama')).toBe(-1);
    expect(kkiAuthorScore('', 'Hajime Isayama')).toBe(-1);
    expect(kkiAuthorScore('Hajime Isayama', '')).toBe(-1);
  });

  it('matches name order variations', () => {
    expect(kkiAuthorScore('Aoyama Gosho', 'Gosho Aoyama')).toBeGreaterThanOrEqual(85);
  });

  it('scores different people low', () => {
    expect(kkiAuthorScore('Tsukasa Hojo', 'Keiichi Arawi')).toBeLessThan(70);
  });
});

describe('KKI match decision policy', () => {
  it('auto-matches identical titles with high score', () => {
    expect(
      decideKkiMatch({
        nuvTitle: 'Attack on Titan',
        kkiTitle: 'Attack on Titan',
        titleScore: 100,
        nuvAuthor: 'Hajime Isayama',
        kkiAuthor: 'Hajime Isayama',
        crossMedium: false,
      }),
    ).toEqual({ decision: 'auto' });
  });

  it('auto-matches when Nuvellite author is a publisher name (unverifiable)', () => {
    expect(
      decideKkiMatch({
        nuvTitle: 'Naruto',
        kkiTitle: 'Naruto',
        titleScore: 100,
        nuvAuthor: 'Elex Media Komputindo',
        kkiAuthor: 'Masashi Kishimoto',
        crossMedium: false,
      }),
    ).toEqual({ decision: 'auto' });
  });

  it('auto-matches naming variants confirmed by strong author signal', () => {
    // Nuvellite calls it "Conan"; KKI calls it "Detektif Conan" — same series
    expect(
      decideKkiMatch({
        nuvTitle: 'Conan',
        kkiTitle: 'Detektif Conan',
        titleScore: 90,
        nuvAuthor: 'Aoyama Gosho',
        kkiAuthor: 'Aoyama Gosho',
        crossMedium: false,
      }),
    ).toEqual({ decision: 'auto' });
  });

  it('NEVER auto-matches similar titles by different authors (City Hunter vs City)', () => {
    const v = decideKkiMatch({
      nuvTitle: 'City Hunter',
      kkiTitle: 'City',
      titleScore: 90,
      nuvAuthor: 'Tsukasa Hojo',
      kkiAuthor: 'Keiichi Arawi',
      crossMedium: false,
    });
    expect(v.decision).toBe('review');
    expect((v as any).reason).toBe('author-mismatch');
  });

  it('NEVER auto-matches spin-offs even with the same author', () => {
    // "Cerita Spesial Doraemon" is a spin-off compilation, not "Doraemon"
    const v = decideKkiMatch({
      nuvTitle: 'Doraemon',
      kkiTitle: 'Cerita Spesial Doraemon',
      titleScore: 90,
      nuvAuthor: 'Fujiko F. Fujio',
      kkiAuthor: 'Fujiko F. Fujio',
      crossMedium: false,
    });
    expect(v.decision).toBe('review');
    expect((v as any).reason).toBe('substring-extra-words');
  });

  it('NEVER auto-matches cross-medium pairs (novel vs manga adaptation)', () => {
    const v = decideKkiMatch({
      nuvTitle: "BLEACH – Can't Fear Your Own World",
      kkiTitle: "BLEACH Can't Fear Your Own World",
      titleScore: 100,
      nuvAuthor: 'Ryohgo Narita',
      kkiAuthor: 'Tite Kubo',
      crossMedium: true,
    });
    expect(v.decision).toBe('review');
    expect((v as any).reason).toBe('cross-medium');
  });

  it('NEVER auto-matches very short titles inexactly (Anay-Nay vs "N")', () => {
    const v = decideKkiMatch({
      nuvTitle: 'Anay-Nay',
      kkiTitle: 'N',
      titleScore: 90,
      nuvAuthor: 'Olvyanda Ariesta',
      kkiAuthor: 'kurumuakumu',
      crossMedium: false,
    });
    expect(v.decision).toBe('review');
    expect((v as any).reason).toBe('short-title-inexact');
  });

  it('sends identical titles by different authors to review (Cosmos)', () => {
    const v = decideKkiMatch({
      nuvTitle: 'Cosmos',
      kkiTitle: 'Cosmos',
      titleScore: 100,
      nuvAuthor: 'Katsutoshi Murase',
      kkiAuthor: 'Ryuhei Tamura',
      crossMedium: false,
    });
    expect(v.decision).toBe('review');
    expect((v as any).reason).toBe('author-mismatch');
  });

  it('returns none below the review threshold', () => {
    expect(
      decideKkiMatch({
        nuvTitle: 'One Piece',
        kkiTitle: 'Naruto',
        titleScore: 45,
        crossMedium: false,
      }),
    ).toEqual({ decision: 'none' });
  });

  it('auto-matches edition variants (The Complete suffix)', () => {
    expect(
      decideKkiMatch({
        nuvTitle: '20th Century Boys The Complete',
        kkiTitle: '20th Century Boys',
        titleScore: 90,
        nuvAuthor: 'Naoki Urasawa',
        kkiAuthor: 'Naoki Urasawa',
        crossMedium: false,
      }),
    ).toEqual({ decision: 'auto' });
  });
});
