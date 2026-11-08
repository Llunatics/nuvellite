import { describe, it, expect, vi } from 'vitest';
import { resolveCover, isValidHttpUrl } from '../src/lib/get-book-cover';

describe('Cover URL Resolution and Validation (P0)', () => {
  it('validates http and https URLs correctly', () => {
    expect(isValidHttpUrl('https://cdn.gramedia.com/uploads/items/cover.jpg')).toBe(true);
    expect(isValidHttpUrl('http://example.com/cover.png')).toBe(true);
    expect(isValidHttpUrl('')).toBe(false);
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrl('/relative/path/cover.jpg')).toBe(false);
    expect(isValidHttpUrl(null)).toBe(false);
    expect(isValidHttpUrl(undefined)).toBe(false);
  });

  it('normalizes cover fields in order of precedence: coverImage, coverUrl, cover, image', () => {
    expect(
      resolveCover({
        coverImage: 'https://cdn.gramedia.com/cover-image.jpg',
        coverUrl: 'https://cdn.gramedia.com/cover-url.jpg',
      })
    ).toBe('https://cdn.gramedia.com/cover-image.jpg');

    expect(
      resolveCover({
        coverUrl: 'https://cdn.gramedia.com/cover-url.jpg',
        image: 'https://cdn.gramedia.com/image.jpg',
      })
    ).toBe('https://cdn.gramedia.com/cover-url.jpg');

    expect(
      resolveCover({
        cover: 'https://cdn.gramedia.com/cover.jpg',
        image: 'https://cdn.gramedia.com/image.jpg',
      })
    ).toBe('https://cdn.gramedia.com/cover.jpg');

    expect(
      resolveCover({
        image: 'https://cdn.gramedia.com/image.jpg',
      })
    ).toBe('https://cdn.gramedia.com/image.jpg');
  });

  it('accepts raw string URLs directly and trims whitespace', () => {
    expect(resolveCover('  https://cdn.gramedia.com/trimmed.jpg  ')).toBe(
      'https://cdn.gramedia.com/trimmed.jpg'
    );
  });

  it('returns null and logs a warning when all cover fields are missing or invalid', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(resolveCover(null)).toBeNull();
    expect(resolveCover({})).toBeNull();
    expect(
      resolveCover({
        coverImage: '',
        coverUrl: 'invalid-url',
        image: 'ftp://unsupported.com/image.png',
      })
    ).toBeNull();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
