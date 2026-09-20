'use client';

import { useState, useEffect, useCallback } from 'react';
import { CollectionItem } from '@/lib/types';

const STORAGE_KEY_V2 = 'nuvellite_collection_v2';
const STORAGE_KEY_V1 = 'nuvellite_collection_v1';
const CURRENT_SCHEMA_VERSION = 2;

export interface ExportPayload {
  version: number;
  exportedAt: string;
  items: CollectionItem[];
}

export function useCollection() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load and migrate
  useEffect(() => {
    try {
      // 1. Try loading V2
      const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        if (Array.isArray(parsed)) {
          setItems(parsed);
          setIsLoaded(true);
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
          setItems(migrated);
          localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
          setIsLoaded(true);
          return;
        }
      }
    } catch {
      // Fallback on parse failure
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const save = useCallback((newItems: CollectionItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(newItems));
    } catch {
      // Storage full or quota exceeded
    }
  }, []);

  const isOwned = useCallback(
    (bookId: string) => items.some((i) => i.bookId === bookId && i.status === 'OWNED'),
    [items]
  );

  const isWishlisted = useCallback(
    (bookId: string) => items.some((i) => i.bookId === bookId && i.status === 'WISHLIST'),
    [items]
  );

  const toggleOwned = useCallback(
    (bookId: string, seriesId?: string) => {
      setItems((prev) => {
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
          next = [...prev, { bookId, seriesId, status: 'OWNED', addedAt: new Date().toISOString() }];
        }
        try {
          localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  const toggleWishlist = useCallback(
    (bookId: string, seriesId?: string) => {
      setItems((prev) => {
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
          next = [...prev, { bookId, seriesId, status: 'WISHLIST', addedAt: new Date().toISOString() }];
        }
        try {
          localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  const getSeriesOwnedCount = useCallback(
    (seriesId: string) => {
      return items.filter((i) => i.seriesId === seriesId && i.status === 'OWNED').length;
    },
    [items]
  );

  const exportJSON = (): string => {
    const payload: ExportPayload = {
      version: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      items,
    };
    return JSON.stringify(payload, null, 2);
  };

  const importJSON = (jsonStr: string): boolean => {
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
        save(validated);
        return true;
      }
    } catch {}
    return false;
  };

  const clearAll = () => {
    save([]);
  };

  const ownedItems = items.filter((i) => i.status === 'OWNED');
  const wishlistItems = items.filter((i) => i.status === 'WISHLIST');

  return {
    items,
    ownedItems,
    wishlistItems,
    isLoaded,
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
