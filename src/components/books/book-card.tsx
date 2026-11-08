'use client';

import React from 'react';
import { ReleaseCard } from './release-card';
import { Book } from '@/lib/types';

interface BookCardProps {
  book: Book;
  variant?: 'standard' | 'compact';
}

/**
 * Memoized BookCard component wrapping ReleaseCard for catalog displays.
 */
export const BookCard = React.memo(function BookCard({
  book,
  variant = 'standard',
}: BookCardProps) {
  return <ReleaseCard book={book} variant={variant} />;
});

/**
 * Lightweight skeleton placeholder for BookCard / ReleaseCard.
 */
export function ReleaseCardSkeleton({
  variant = 'standard',
}: {
  variant?: 'standard' | 'compact';
}) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-2 rounded-2xl animate-pulse bg-white/[0.02]">
        <div className="aspect-[3/4] w-11 rounded-lg bg-white/[0.06] shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-2 w-16 bg-white/[0.05] rounded" />
          <div className="h-3 w-32 bg-white/[0.08] rounded" />
          <div className="h-2.5 w-12 bg-white/[0.05] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 animate-pulse">
      {/* Cover Skeleton */}
      <div className="relative aspect-[3/4.2] w-full rounded-2xl bg-white/[0.04] overflow-hidden border border-white/[0.03]">
        <div className="absolute inset-0 cover-shimmer" />
      </div>

      {/* Typography & Price Skeleton */}
      <div className="space-y-2 px-1">
        <div className="flex justify-between">
          <div className="h-2.5 w-14 bg-white/[0.06] rounded" />
          <div className="h-2.5 w-16 bg-white/[0.04] rounded" />
        </div>
        <div className="h-3.5 w-full bg-white/[0.08] rounded" />
        <div className="h-3.5 w-3/4 bg-white/[0.05] rounded" />
        <div className="h-3 w-16 bg-white/[0.07] rounded pt-1" />
      </div>
    </div>
  );
}

export const BookCardSkeleton = ReleaseCardSkeleton;

/**
 * Grid skeleton placeholder for lists of cards.
 */
export function CatalogGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
      {Array.from({ length: count }).map((_, i) => (
        <ReleaseCardSkeleton key={i} />
      ))}
    </div>
  );
}
