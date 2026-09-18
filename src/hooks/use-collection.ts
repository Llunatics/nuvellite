'use client';

import { useState, useEffect, useCallback } from 'react';
import { CollectionItem } from '@/lib/types';

const STORAGE_KEY = 'nuvellite_collection_v1';

export function useCollection() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch {
      // Fallback
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const save = useCallback((newItems: CollectionItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

  const getSeriesProgress = useCallback(
    (seriesId: string, availableVols: number[]) => {
      const ownedVols = new Set(
        items.filter((i) => i.seriesId === seriesId && i.status === 'OWNED').map((i) => i.bookId)
      );
      const totalAvailable = availableVols.length || 1;
      const ownedCount = items.filter((i) => i.seriesId === seriesId && i.status === 'OWNED').length;
      const percentage = Math.min(100, Math.round((ownedCount / totalAvailable) * 100));

      return {
        ownedCount,
        totalAvailable,
        percentage,
      };
    },
    [items]
  );

  const exportJSON = () => {
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), items }, null, 2);
  };

  const importJSON = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.items)) {
        save(parsed.items);
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
    getSeriesProgress,
    exportJSON,
    importJSON,
    clearAll,
  };
}
