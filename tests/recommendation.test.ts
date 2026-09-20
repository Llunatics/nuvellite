import { describe, it, expect } from 'vitest';
import { getRelatedReleases, getYouMayAlsoLike } from '../src/lib/data/recommendation-service';
import { Book } from '../src/lib/types';

describe('Recommendation & Related Releases Service', () => {
  const mockBooks: Book[] = [
    {
      id: 'frieren_10',
      slug: 'frieren-10',
      title: 'Frieren 10',
      seriesId: 'ser_frieren',
      seriesName: 'Frieren',
      volume: 10,
      category: 'Manga',
      publisherId: 'pub_mnc',
      publisherName: 'm&c!',
      publisherShortName: 'm&c!',
      authors: ['Kanehito Yamada', 'Tsukasa Abe'],
      genres: ['Manga', 'Fantasi'],
      currentPrice: 45000,
      isWednesdayRelease: true,
      status: 'PUBLISHED',
    },
    {
      id: 'frieren_9',
      slug: 'frieren-9',
      title: 'Frieren 9',
      seriesId: 'ser_frieren',
      seriesName: 'Frieren',
      volume: 9,
      category: 'Manga',
      publisherId: 'pub_mnc',
      publisherName: 'm&c!',
      publisherShortName: 'm&c!',
      authors: ['Kanehito Yamada', 'Tsukasa Abe'],
      genres: ['Manga', 'Fantasi'],
      currentPrice: 45000,
      isWednesdayRelease: true,
      status: 'PUBLISHED',
    },
    {
      id: 'frieren_11',
      slug: 'frieren-11',
      title: 'Frieren 11',
      seriesId: 'ser_frieren',
      seriesName: 'Frieren',
      volume: 11,
      category: 'Manga',
      publisherId: 'pub_mnc',
      publisherName: 'm&c!',
      publisherShortName: 'm&c!',
      authors: ['Kanehito Yamada', 'Tsukasa Abe'],
      genres: ['Manga', 'Fantasi'],
      currentPrice: 45000,
      isWednesdayRelease: true,
      status: 'PUBLISHED',
    },
    {
      id: 'dungeon_meshi_1',
      slug: 'dungeon-meshi-1',
      title: 'Dungeon Meshi 1',
      seriesId: 'ser_dungeon_meshi',
      seriesName: 'Dungeon Meshi',
      volume: 1,
      category: 'Manga',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media',
      publisherShortName: 'Elex',
      authors: ['Ryoko Kui'],
      genres: ['Manga', 'Fantasi'],
      currentPrice: 45000,
      isWednesdayRelease: true,
      status: 'PUBLISHED',
    },
    {
      id: 'overlord_ln_1',
      slug: 'overlord-ln-1',
      title: 'Light Novel Overlord 1',
      seriesId: 'ser_overlord-ln',
      seriesName: 'Overlord',
      volume: 1,
      category: 'Light Novel',
      publisherId: 'pub_pgi',
      publisherName: 'PGI',
      publisherShortName: 'PGI',
      authors: ['Kugane Maruyama'],
      genres: ['Light Novel', 'Fantasi'],
      currentPrice: 120000,
      isWednesdayRelease: true,
      status: 'PUBLISHED',
    },
  ];

  it('should return neighboring volumes for related releases', () => {
    const target = mockBooks[0]; // Frieren 10
    const related = getRelatedReleases(target, mockBooks);

    expect(related).toHaveLength(2);
    const vols = related.map((b) => b.volume);
    expect(vols).toContain(9);
    expect(vols).toContain(11);
  });

  it('should return explainable recommendations and isolate Manga from Light Novel', () => {
    const target = mockBooks[0]; // Frieren 10 (Manga, Fantasi)
    const recs = getYouMayAlsoLike(target, mockBooks);

    // Overlord is a Light Novel, so it should NOT be recommended for Frieren Manga
    const categories = recs.map((r) => r.book.category);
    expect(categories).not.toContain('Light Novel');

    // Dungeon Meshi (Manga, Fantasi) should be recommended
    const recommendedTitles = recs.map((r) => r.book.title);
    expect(recommendedTitles).toContain('Dungeon Meshi 1');

    const dMeshiRec = recs.find((r) => r.book.id === 'dungeon_meshi_1');
    expect(dMeshiRec?.explanation).toContain('Fantasi');
  });
});
