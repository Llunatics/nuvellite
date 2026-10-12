import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordPriceObservation,
  getPriceSummary,
  initializePriceSnapshots,
} from '../src/lib/data/price-service';

describe('Real Price History Service', () => {
  beforeEach(() => {
    initializePriceSnapshots([]);
  });

  it('should record an initial observation and return clean base summary without fake fluctuation', () => {
    const snap = recordPriceObservation('book_1', 45000, 'AVAILABLE');
    expect(snap).toBeDefined();
    expect(snap?.price).toBe(45000);

    const summary = getPriceSummary('book_1', 45000);
    expect(summary.currentPrice).toBe(45000);
    expect(summary.previousPrice).toBeNull();
    expect(summary.lowestObservedPrice).toBe(45000);
    expect(summary.highestObservedPrice).toBe(45000);
    expect(summary.hasHistoricalFluctuation).toBe(false);
  });

  it('should be idempotent: do not create duplicate snapshot if price and availability are unchanged', () => {
    recordPriceObservation('book_1', 45000, 'AVAILABLE');
    const duplicate = recordPriceObservation('book_1', 45000, 'AVAILABLE');
    expect(duplicate).toBeNull();
  });

  it('should accurately calculate price fluctuations when real price change occurs', () => {
    recordPriceObservation('book_1', 45000, 'AVAILABLE', 'gramedia', '2026-01-01');
    recordPriceObservation('book_1', 50000, 'AVAILABLE', 'gramedia', '2026-03-01');

    const summary = getPriceSummary('book_1', 50000);
    expect(summary.currentPrice).toBe(50000);
    expect(summary.previousPrice).toBe(45000);
    expect(summary.lowestObservedPrice).toBe(45000);
    expect(summary.highestObservedPrice).toBe(50000);
    expect(summary.priceChangeAmount).toBe(5000);
    expect(summary.priceChangePercent).toBeCloseTo(11.1, 1);
    expect(summary.hasHistoricalFluctuation).toBe(true);
    expect(summary.observationCount).toBe(2);
  });

  it('should preserve originalPrice vs currentPrice for discounted books without corrupting list price', () => {
    // A discounted book: Normal 105.000, Sale 52.500
    const snap = recordPriceObservation('book_disc', 52500, 'AVAILABLE', 'gramedia_api', '2026-09-01', 105000);
    expect(snap).toBeDefined();
    expect(snap?.price).toBe(52500);
    expect(snap?.currentPrice).toBe(52500);
    expect(snap?.originalPrice).toBe(105000);
    expect(snap?.isDiscounted).toBe(true);

    const summary = getPriceSummary('book_disc', 52500, '2026-09-01', 105000);
    expect(summary.currentPrice).toBe(52500);
    expect(summary.originalPrice).toBe(105000);
    expect(summary.isDiscounted).toBe(true);
    expect(summary.lowestObservedPrice).toBe(52500);
    expect(summary.highestObservedPrice).toBe(105000);
  });

  it('should handle non-discounted books where originalPrice === currentPrice', () => {
    const snap = recordPriceObservation('book_reg', 45000, 'AVAILABLE', 'gramedia_api', '2026-09-01', 45000);
    expect(snap).toBeDefined();
    expect(snap?.isDiscounted).toBe(false);
    expect(snap?.originalPrice).toBe(45000);
    expect(snap?.currentPrice).toBe(45000);

    const summary = getPriceSummary('book_reg', 45000, '2026-09-01', 45000);
    expect(summary.isDiscounted).toBe(false);
    expect(summary.originalPrice).toBe(45000);
    expect(summary.currentPrice).toBe(45000);
  });

  it('should load legacy snapshots (price-only schema) via initializePriceSnapshots', () => {
    // Old sync wrote snapshots with only `price`, no `currentPrice`/`originalPrice` keys
    initializePriceSnapshots([
      { id: 's1', bookId: 'book_legacy', price: 108000, availability: 'AVAILABLE', observedAt: '2024-12-12', source: 'gramedia_api' },
      { id: 's2', bookId: 'book_legacy', price: 36000, availability: 'AVAILABLE', observedAt: '2026-10-12', source: 'gramedia_api' },
    ] as any);

    const summary = getPriceSummary('book_legacy', 36000, '2024-12-12', 120000);
    expect(summary.observationCount).toBe(2);
    expect(summary.previousPrice).toBe(108000);
    expect(summary.lowestObservedPrice).toBe(36000);
    expect(summary.highestObservedPrice).toBe(120000);
    expect(summary.hasHistoricalFluctuation).toBe(true);
    expect(summary.priceChangeAmount).toBe(-72000);
    expect(summary.snapshots.length).toBe(2);
  });

  it('should record a new snapshot when availability changes even if price is same', () => {
    recordPriceObservation('book_avail', 50000, 'AVAILABLE', 'gramedia_api', '2026-01-01');
    const snap = recordPriceObservation('book_avail', 50000, 'OUT_OF_STOCK', 'gramedia_api', '2026-02-01');
    expect(snap).toBeDefined();
    expect(snap?.availability).toBe('OUT_OF_STOCK');

    const summary = getPriceSummary('book_avail', 50000);
    expect(summary.observationCount).toBe(2);
  });

  it('should reject invalid price observations', () => {
    expect(recordPriceObservation('book_bad', 0)).toBeNull();
    expect(recordPriceObservation('book_bad', -100)).toBeNull();
    expect(recordPriceObservation('book_bad', NaN)).toBeNull();
    expect(recordPriceObservation('', 50000)).toBeNull();
  });

  it('should track lowest/highest across multiple fluctuations', () => {
    recordPriceObservation('book_multi', 100000, 'AVAILABLE', 'gramedia_api', '2026-01-01');
    recordPriceObservation('book_multi', 80000, 'AVAILABLE', 'gramedia_api', '2026-02-01');
    recordPriceObservation('book_multi', 120000, 'AVAILABLE', 'gramedia_api', '2026-03-01');
    recordPriceObservation('book_multi', 90000, 'AVAILABLE', 'gramedia_api', '2026-04-01');

    const summary = getPriceSummary('book_multi', 90000);
    expect(summary.observationCount).toBe(4);
    expect(summary.lowestObservedPrice).toBe(80000);
    expect(summary.highestObservedPrice).toBe(120000);
    expect(summary.previousPrice).toBe(120000);
    expect(summary.priceChangeAmount).toBe(-30000);
    expect(summary.hasHistoricalFluctuation).toBe(true);
  });
});

