import { describe, it, expect } from 'vitest';

describe('Missing Volume Detector Logic', () => {
  it('should accurately detect missing volumes in a series', () => {
    // Suppose a series has volumes 1, 2, 3, 4, 5, 6
    const publishedVolumes = [1, 2, 3, 4, 5, 6];
    // User owns volumes 1, 2, 4, 6
    const ownedVolumes = new Set([1, 2, 4, 6]);

    const missing = publishedVolumes.filter((v) => !ownedVolumes.has(v));
    expect(missing).toEqual([3, 5]);

    const percentage = Math.round((ownedVolumes.size / publishedVolumes.length) * 100);
    expect(percentage).toBe(67);
  });

  it('should detect 100% completion when all volumes are owned', () => {
    const publishedVolumes = [1, 2, 3];
    const ownedVolumes = new Set([1, 2, 3]);

    const missing = publishedVolumes.filter((v) => !ownedVolumes.has(v));
    expect(missing).toHaveLength(0);

    const percentage = Math.round((ownedVolumes.size / publishedVolumes.length) * 100);
    expect(percentage).toBe(100);
  });
});
