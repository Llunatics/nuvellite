'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { CollectionItem } from '@/lib/types';

const STORAGE_KEY_V2 = 'nuvellite_collection_v2';
const STORAGE_KEY_V1 = 'nuvellite_collection_v1';
const CURRENT_SCHEMA_VERSION = 2;

export interface ExportPayload {
  version: number;
  exportedAt: string;
  items: CollectionItem[];
}

interface CollectionStoreState {
  items: CollectionItem[];
  ownedItems: CollectionItem[];
  wishlistItems: CollectionItem[];
  ownedIdsSet: Set<string>;
  wishlistIdsSet: Set<string>;
  isLoaded: boolean;
}

// Compute derived sets and slices together in one atomic step (§5.4)
function computeState(items: CollectionItem[], isLoaded: boolean): CollectionStoreState {
  const ownedItems: CollectionItem[] = [];
  const wishlistItems: CollectionItem[] = [];
  const ownedIdsSet = new Set<string>();
  const wishlistIdsSet = new Set<string>();

  for (const item of items) {
    if (item.status === 'OWNED') {
      ownedItems.push(item);
      ownedIdsSet.add(item.bookId);
    } else if (item.status === 'WISHLIST') {
      wishlistItems.push(item);
      wishlistIdsSet.add(item.bookId);
    }
  }

  return {
    items,
    ownedItems,
    wishlistItems,
    ownedIdsSet,
    wishlistIdsSet,
    isLoaded,
  };
}

const SERVER_SNAPSHOT: CollectionStoreState = computeState([], false);
let currentState: CollectionStoreState = computeState([], false);
const listeners = new Set<() => void>();

let initialized = false;

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function setStoreItems(newItems: CollectionItem[]) {
  currentState = computeState(newItems, true);
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(newItems));
    }
  } catch {
    // Storage full or quota exceeded
  }
  notify();
}

function initFromStorage() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  try {
    // 1. Try loading V2
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed)) {
        currentState = computeState(parsed, true);
        notify();
        return;
      }
    }

    // 2. Migration from V1 if V2 does not exist
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const parsedV1 = JSON.parse(rawV1);
      if (Array.isArray(parsedV1)) {
        const migrated: CollectionItem[] = parsedV1.map((item: any) => ({
          bookId: String(item.bookId),
          seriesId: item.seriesId ? String(item.seriesId) : undefined,
          status: item.status === 'WISHLIST' ? 'WISHLIST' : 'OWNED',
          addedAt: item.addedAt || new Date().toISOString(),
        }));
        setStoreItems(migrated);
        return;
      }
    }
  } catch {
    // Fallback on parse failure
  }

  currentState = computeState([], true);
  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  if (!initialized && typeof window !== 'undefined') {
    initFromStorage();
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_V2 && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          currentState = computeState(parsed, true);
          notify();
        }
      } catch {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

function getSnapshot(): CollectionStoreState {
  if (!initialized && typeof window !== 'undefined') {
    initFromStorage();
  }
  return currentState;
}

function getServerSnapshot(): CollectionStoreState {
  return SERVER_SNAPSHOT;
}

/**
 * Global reactive hook for user collection and wishlist (§5.4).
 * Backed by a singleton external store using `useSyncExternalStore` so
 * all components (Header, MobileNav, ReleaseCard, SeriesDetail, LibraryView)
 * stay instantaneously in sync without race conditions or stale ID sets.
 */
export function useCollection() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isOwned = useCallback(
    (bookId: string) => store.ownedIdsSet.has(bookId),
    [store.ownedIdsSet]
  );

  const isWishlisted = useCallback(
    (bookId: string) => store.wishlistIdsSet.has(bookId),
    [store.wishlistIdsSet]
  );

  const toggleOwned = useCallback((bookId: string, seriesId?: string) => {
    const prev = currentState.items;
    const existingIdx = prev.findIndex((i) => i.bookId === bookId);
    let next: CollectionItem[];
    if (existingIdx >= 0) {
      if (prev[existingIdx].status === 'OWNED') {
        next = prev.filter((_, idx) => idx !== existingIdx);
      } else {
        next = [...prev];
        next[existingIdx] = { ...next[existingIdx], status: 'OWNED' };
      }
    } else {
      next = [
        ...prev,
        { bookId, seriesId, status: 'OWNED', addedAt: new Date().toISOString() },
      ];
    }
    setStoreItems(next);
  }, []);

  const toggleWishlist = useCallback((bookId: string, seriesId?: string) => {
    const prev = currentState.items;
    const existingIdx = prev.findIndex((i) => i.bookId === bookId);
    let next: CollectionItem[];
    if (existingIdx >= 0) {
      if (prev[existingIdx].status === 'WISHLIST') {
        next = prev.filter((_, idx) => idx !== existingIdx);
      } else {
        next = [...prev];
        next[existingIdx] = { ...next[existingIdx], status: 'WISHLIST' };
      }
    } else {
      next = [
        ...prev,
        { bookId, seriesId, status: 'WISHLIST', addedAt: new Date().toISOString() },
      ];
    }
    setStoreItems(next);
  }, []);

  const getSeriesOwnedCount = useCallback(
    (seriesId: string) => {
      return store.items.filter(
        (i) => i.seriesId === seriesId && i.status === 'OWNED'
      ).length;
    },
    [store.items]
  );

  const exportJSON = useCallback((): string => {
    const payload: ExportPayload = {
      version: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      items: currentState.items,
    };
    return JSON.stringify(payload, null, 2);
  }, []);

  const importJSON = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      let candidateItems: any[] = [];
      if (Array.isArray(parsed)) {
        candidateItems = parsed;
      } else if (parsed && Array.isArray(parsed.items)) {
        candidateItems = parsed.items;
      }

      if (candidateItems.length >= 0) {
        const validated: CollectionItem[] = candidateItems
          .filter((i) => i && typeof i.bookId === 'string')
          .map((i) => ({
            bookId: String(i.bookId),
            seriesId: i.seriesId ? String(i.seriesId) : undefined,
            status: i.status === 'WISHLIST' ? 'WISHLIST' : 'OWNED',
            addedAt: i.addedAt || new Date().toISOString(),
          }));
        setStoreItems(validated);
        return true;
      }
    } catch {}
    return false;
  }, []);

  const clearAll = useCallback(() => {
    setStoreItems([]);
  }, []);

  return {
    items: store.items,
    ownedItems: store.ownedItems,
    wishlistItems: store.wishlistItems,
    ownedIdsSet: store.ownedIdsSet,
    wishlistIdsSet: store.wishlistIdsSet,
    isLoaded: store.isLoaded,
    isOwned,
    isWishlisted,
    toggleOwned,
    toggleWishlist,
    getSeriesOwnedCount,
    exportJSON,
    importJSON,
    clearAll,
  };
}
