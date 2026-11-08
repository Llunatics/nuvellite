import { Series, Book } from './types';

/**
 * Missing-Release Detection Logic (§5.3).
 *
 * Checks whether a volume is genuinely unreleased rather than relying
 * on free-text matches or naive `!found || found?.volume !== volume` conditions
 * that produce false "not released" states when titles vary.
 *
 * Compares against the canonical volume list (availableVolumes / volumes)
 * from the series itself.
 */
export function isVolumeUnreleased(
  volume: number | null | undefined,
  series?: (Series & { volumes?: number[] }) | { availableVolumes?: number[]; volumes?: number[]; totalVolumes?: number } | null
): boolean {
  if (volume === null || volume === undefined || typeof volume !== 'number') {
    return false;
  }

  if (!series) {
    return false;
  }

  const canonicalList: number[] =
    series.volumes || series.availableVolumes || [];

  if (canonicalList.length > 0) {
    return !canonicalList.includes(volume);
  }

  if (typeof series.totalVolumes === 'number' && series.totalVolumes > 0) {
    return volume > series.totalVolumes;
  }

  return false;
}

/**
 * Checks if a book is an unreleased / upcoming volume based on
 * canonical series metadata and explicit status.
 */
export function isBookUnreleased(
  book: Book,
  series?: Series | null
): boolean {
  if (book.status === 'PREORDER' || book.status === 'UPCOMING') {
    return true;
  }

  if (series && typeof book.volume === 'number') {
    return isVolumeUnreleased(book.volume, series);
  }

  return false;
}
