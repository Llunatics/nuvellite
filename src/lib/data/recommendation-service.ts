import { Book, RecommendationItem } from '../types';

export function getRelatedReleases(book: Book, allBooks: Book[], limit = 6): Book[] {
  if (!book.seriesId) return [];

  const cleanSeriesId = book.seriesId.toLowerCase();
  const currentVol = book.volume ?? 0;

  return allBooks
    .filter((b) => b.id !== book.id && b.seriesId?.toLowerCase() === cleanSeriesId && b.category === book.category)
    .sort((a, b) => {
      // Prioritize closest neighboring volumes
      const distA = Math.abs((a.volume ?? 0) - currentVol);
      const distB = Math.abs((b.volume ?? 0) - currentVol);
      if (distA !== distB) return distA - distB;
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}

export function getYouMayAlsoLike(targetBook: Book, allBooks: Book[], limit = 6): RecommendationItem[] {
  const targetCategory = targetBook.category;
  const targetPublisher = targetBook.publisherId;
  const targetAuthors = new Set(
    (Array.isArray(targetBook.authors) ? targetBook.authors : [])
      .map((a) => (typeof a === 'string' ? a.toLowerCase() : ''))
      .filter(Boolean)
  );
  const targetGenres = new Set(
    (Array.isArray(targetBook.genres) ? targetBook.genres : [])
      .map((g) => g.toLowerCase())
      .filter((g) => g !== 'manga' && g !== 'light novel')
  );

  const candidates: RecommendationItem[] = [];

  for (const candidate of allBooks) {
    // Exclude same book and same series
    if (candidate.id === targetBook.id) continue;
    if (targetBook.seriesId && candidate.seriesId === targetBook.seriesId) continue;
    // Strictly isolate Manga and Light Novel
    if (candidate.category !== targetCategory) continue;

    let score = 0;
    const reasons: string[] = [];

    // 1. Author match (+50 pts)
    const candidateAuthors = (Array.isArray(candidate.authors) ? candidate.authors : []).map((a) =>
      typeof a === 'string' ? a.toLowerCase() : ''
    );
    const hasAuthorMatch = candidateAuthors.some((a) => a && targetAuthors.has(a) && a !== 'berbagai penulis');
    if (hasAuthorMatch) {
      score += 50;
      reasons.push(`Karya lain dari ${candidate.authors[0]}`);
    }

    // 2. Genre match (+15 pts per genre)
    const candidateGenres = (Array.isArray(candidate.genres) ? candidate.genres : []).map((g) => g.toLowerCase());
    const matchedGenres: string[] = [];
    for (const g of candidateGenres) {
      if (targetGenres.has(g)) {
        matchedGenres.push(g.charAt(0).toUpperCase() + g.slice(1));
        score += 15;
      }
    }
    if (matchedGenres.length > 0) {
      reasons.push(`Kesamaan genre (${matchedGenres.slice(0, 2).join(', ')})`);
    }

    // 3. Publisher & Imprint match (+10 pts)
    if (candidate.publisherId === targetPublisher) {
      score += 10;
      if (reasons.length === 0) {
        reasons.push(`Sama-sama dirilis resmi oleh ${candidate.publisherShortName}`);
      }
    }

    // 4. Volume 1 bonus (+5 pts) - recommend starting volume for new series
    if (candidate.volume === 1) {
      score += 5;
    }

    if (score > 0) {
      candidates.push({
        book: candidate,
        score,
        explanation: reasons.length > 0 ? reasons.join(' • ') : `Rekomendasi ${candidate.category} terpopuler`,
      });
    }
  }

  // Deduplicate by series so we don't recommend 4 volumes of the same series
  const seenSeries = new Set<string>();
  const diverseRecommendations: RecommendationItem[] = [];

  candidates.sort((a, b) => b.score - a.score);

  for (const item of candidates) {
    const sId = item.book.seriesId || item.book.id;
    if (seenSeries.has(sId)) continue;
    seenSeries.add(sId);
    diverseRecommendations.push(item);
    if (diverseRecommendations.length >= limit) break;
  }

  return diverseRecommendations;
}
