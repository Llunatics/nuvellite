import { PriceSnapshot, AvailabilityStatus } from '../types';

export interface PriceSummary {
  currentPrice: number;
  originalPrice?: number;
  isDiscounted: boolean;
  previousPrice: number | null;
  lowestObservedPrice: number;
  highestObservedPrice: number;
  priceChangeAmount: number;
  priceChangePercent: number;
  hasHistoricalFluctuation: boolean;
  observationCount: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  snapshots: PriceSnapshot[];
}

// In-memory or persisted snapshot registry
let priceSnapshotRegistry: Map<string, PriceSnapshot[]> = new Map();

export function initializePriceSnapshots(snapshots: PriceSnapshot[]) {
  priceSnapshotRegistry.clear();
  for (const snap of snapshots) {
    if (!priceSnapshotRegistry.has(snap.bookId)) {
      priceSnapshotRegistry.set(snap.bookId, []);
    }
    priceSnapshotRegistry.get(snap.bookId)!.push(snap);
  }
}

export function recordPriceObservation(
  bookId: string,
  price: number,
  availability: AvailabilityStatus = 'AVAILABLE',
  source = 'gramedia_api',
  observedAt = new Date().toISOString(),
  originalPrice?: number
): PriceSnapshot | null {
  if (!bookId || typeof price !== 'number' || isNaN(price) || price <= 0) {
    return null;
  }

  const origPrice = originalPrice && originalPrice > price ? originalPrice : price;
  const isDiscounted = origPrice > price;

  const existing = priceSnapshotRegistry.get(bookId) || [];
  const lastSnapshot = existing[existing.length - 1];

  // Only record if price, originalPrice, or availability changed, or if this is the very first observation
  if (lastSnapshot) {
    const lastPrice = lastSnapshot.currentPrice ?? lastSnapshot.price;
    const lastOrig = lastSnapshot.originalPrice ?? lastPrice;
    if (
      lastPrice === price &&
      lastOrig === origPrice &&
      lastSnapshot.availability === availability
    ) {
      return null; // Idempotent: no change, do not pollute history
    }
  }

  const snapshot: PriceSnapshot = {
    id: `snap_${bookId}_${Date.now()}`,
    bookId,
    price,
    currentPrice: price,
    originalPrice: origPrice,
    isDiscounted,
    previousPrice: lastSnapshot ? (lastSnapshot.currentPrice ?? lastSnapshot.price) : undefined,
    availability,
    observedAt,
    source,
  };

  existing.push(snapshot);
  priceSnapshotRegistry.set(bookId, existing);
  return snapshot;
}

export function getPriceSnapshots(bookId: string): PriceSnapshot[] {
  return priceSnapshotRegistry.get(bookId) || [];
}

export function getPriceSummary(
  bookId: string,
  currentPrice: number,
  releaseDate?: string,
  bookOriginalPrice?: number
): PriceSummary {
  const snapshots = getPriceSnapshots(bookId);
  const origPrice = bookOriginalPrice && bookOriginalPrice > currentPrice ? bookOriginalPrice : currentPrice;
  const isDiscounted = origPrice > currentPrice;

  // If no snapshots yet, create an initial base observation using releaseDate or now
  if (snapshots.length === 0) {
    const baseDate = releaseDate || new Date().toISOString();
    return {
      currentPrice,
      originalPrice: origPrice,
      isDiscounted,
      previousPrice: null,
      lowestObservedPrice: currentPrice,
      highestObservedPrice: origPrice,
      priceChangeAmount: 0,
      priceChangePercent: 0,
      hasHistoricalFluctuation: false,
      observationCount: 1,
      firstObservedAt: baseDate,
      lastObservedAt: baseDate,
      snapshots: [
        {
          id: `snap_${bookId}_init`,
          bookId,
          price: currentPrice,
          currentPrice,
          originalPrice: origPrice,
          isDiscounted,
          availability: 'AVAILABLE',
          observedAt: baseDate,
          source: 'official_catalog',
        },
      ],
    };
  }

  const prices = snapshots.map((s) => s.currentPrice ?? s.price);
  const lowest = Math.min(...prices, currentPrice);
  const highest = Math.max(...prices, origPrice);
  const prevPrice = snapshots.length > 1
    ? (snapshots[snapshots.length - 2].currentPrice ?? snapshots[snapshots.length - 2].price)
    : null;
  const changeAmount = prevPrice !== null ? currentPrice - prevPrice : 0;
  const changePercent = prevPrice !== null && prevPrice > 0 ? (changeAmount / prevPrice) * 100 : 0;

  const hasHistoricalFluctuation = snapshots.length >= 2 && prices.some((p) => p !== prices[0]);

  return {
    currentPrice,
    originalPrice: origPrice,
    isDiscounted,
    previousPrice: prevPrice,
    lowestObservedPrice: lowest,
    highestObservedPrice: highest,
    priceChangeAmount: changeAmount,
    priceChangePercent: Math.round(changePercent * 10) / 10,
    hasHistoricalFluctuation,
    observationCount: snapshots.length,
    firstObservedAt: snapshots[0]?.observedAt || null,
    lastObservedAt: snapshots[snapshots.length - 1]?.observedAt || null,
    snapshots,
  };
}
