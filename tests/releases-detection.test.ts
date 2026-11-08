import { describe, it, expect } from 'vitest';
import { isVolumeUnreleased, isBookUnreleased } from '../src/lib/releases';
import type { Series, Book } from '../src/lib/types';

describe('Missing-Release Detection Logic (§5.3)', () => {
  const mockSeries: Series = {
    id: 'ser_sample-manga',
    slug: 'sample-manga',
    name: 'Sample Manga',
    originalTitle: 'Sample Manga',
    publisherId: 'pub_elex',
    publisherName: 'Elex Media Komputindo',
    author: 'Author',
    type: 'MANGA',
    status: 'ONGOING',
    totalVolumes: 10,
    latestVolume: 10,
    availableVolumes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    missingVolumes: [],
  };

  it('identifies unreleased volumes when volume is absent from canonical list', () => {
    // Volume 11 has not been released yet in a 10-volume series
    expect(isVolumeUnreleased(11, mockSeries)).toBe(true);
    // Volume 5 has been released and is in availableVolumes
    expect(isVolumeUnreleased(5, mockSeries)).toBe(false);
  });

  it('does NOT false-positive as unreleased when volume is present in canonical availableVolumes', () => {
    expect(isVolumeUnreleased(1, mockSeries)).toBe(false);
    expect(isVolumeUnreleased(10, mockSeries)).toBe(false);
  });

  it('correctly checks volume gaps in a series with missing intermediate volumes', () => {
    const seriesWithGaps: Series = {
      ...mockSeries,
      totalVolumes: 5,
      latestVolume: 5,
      availableVolumes: [1, 2, 4, 5],
      missingVolumes: [3],
    };

    // Volume 3 is absent from availableVolumes
    expect(isVolumeUnreleased(3, seriesWithGaps)).toBe(true);
    // Volume 4 is released
    expect(isVolumeUnreleased(4, seriesWithGaps)).toBe(false);
  });

  it('detects unreleased books using isBookUnreleased with explicit status or canonical series', () => {
    const preorderBook: Book = {
      id: 'bk_sample-11',
      slug: 'sample-manga-11',
      title: 'Sample Manga Vol. 11',
      category: 'Manga',
      format: 'MANGA',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      publisherShortName: 'Elex',
      authors: ['Author'],
      genres: ['Manga'],
      isWednesdayRelease: false,
      currentPrice: 45000,
      status: 'PREORDER',
      volume: 11,
    };

    expect(isBookUnreleased(preorderBook, mockSeries)).toBe(true);

    const releasedBook: Book = {
      ...preorderBook,
      status: 'PUBLISHED',
      volume: 5,
    };
    expect(isBookUnreleased(releasedBook, mockSeries)).toBe(false);
  });

  it('handles null/undefined volumes safely', () => {
    expect(isVolumeUnreleased(null, mockSeries)).toBe(false);
    expect(isVolumeUnreleased(undefined, mockSeries)).toBe(false);
    expect(isVolumeUnreleased(1, null)).toBe(false);
  });
});
