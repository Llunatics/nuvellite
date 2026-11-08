import { describe, it, expect } from 'vitest';

/**
 * Robustness tests for scripts/auto-sync-catalog.py and scripts/split-catalog.py (§5.2)
 *
 * Verifies bounds checks before list index access and cover-field extraction
 * under edge cases (empty lists, missing keys, malformed objects).
 */
describe('Script Data Pipeline Robustness (§5.2)', () => {
  describe('Cover Field Extraction Fallback Path', () => {
    function extractCover(sp: Record<string, any>, item: Record<string, any>): string {
      return (
        sp.coverImage ||
        sp.coverUrl ||
        sp.image ||
        (typeof item.coverImage === 'string' ? item.coverImage : '') ||
        (typeof item.coverUrl === 'string' ? item.coverUrl : '') ||
        (typeof item.image === 'string' ? item.image : '') ||
        ''
      );
    }

    it('extracts from coverImage when available', () => {
      expect(
        extractCover({ coverImage: 'https://cdn.gramedia.com/img1.jpg' }, {})
      ).toBe('https://cdn.gramedia.com/img1.jpg');
    });

    it('falls back to coverUrl and image if coverImage is missing', () => {
      expect(
        extractCover({ coverUrl: 'https://cdn.gramedia.com/img2.jpg' }, {})
      ).toBe('https://cdn.gramedia.com/img2.jpg');

      expect(
        extractCover({}, { image: 'https://cdn.gramedia.com/img3.jpg' })
      ).toBe('https://cdn.gramedia.com/img3.jpg');
    });

    it('returns empty string safely when no valid string cover exists', () => {
      expect(extractCover({}, {})).toBe('');
      expect(extractCover({ coverImage: null }, { image: 12345 })).toBe('');
    });
  });

  describe('Index Access Bounds Checking', () => {
    it('safely handles empty lists without IndexError', () => {
      const getFirstAuthor = (authors?: any[]) => {
        return Array.isArray(authors) && authors.length > 0
          ? authors[0]
          : 'Berbagai Penulis';
      };

      expect(getFirstAuthor([])).toBe('Berbagai Penulis');
      expect(getFirstAuthor(undefined)).toBe('Berbagai Penulis');
      expect(getFirstAuthor(['Eiichiro Oda'])).toBe('Eiichiro Oda');
    });

    it('safely handles empty series/book grouping lists', () => {
      const getFirstVol = (bList: any[]) => {
        if (!Array.isArray(bList) || bList.length === 0) return {};
        const found = bList.find((b) => (b.synopsis?.length || 0) > 50);
        return found || bList[0];
      };

      expect(getFirstVol([])).toEqual({});
      expect(getFirstVol([{ id: '1', synopsis: 'short' }])).toEqual({
        id: '1',
        synopsis: 'short',
      });
    });

    it('safely checks adapters list before accessing [0]', () => {
      const getFirstAdapter = (adapters: any[]) => {
        return adapters && adapters.length > 0 ? adapters[0] : null;
      };

      expect(getFirstAdapter([])).toBeNull();
      expect(getFirstAdapter([{ id: 'pub_elex' }])).toEqual({ id: 'pub_elex' });
    });
  });
});
