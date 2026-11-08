'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Book } from 'lucide-react';
import { resolveCover } from '@/lib/get-book-cover';

interface CoverImageProps {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  imgClassName?: string;
  fallbackIconClassName?: string;
}

/**
 * Cover image with robust loading and fallback states.
 *
 * ROOT CAUSE DIAGNOSIS (P0 Cover Image Bug, 2026-11-09):
 * With `images: { unoptimized: true }` in `next.config.mjs`, Next.js `<Image>`
 * renders as a plain HTML `<img>`. When images are served from browser cache
 * or during SSR hydration, the browser loads the asset before React attaches
 * event listeners, so `onLoad` does NOT reliably fire. The component was gating
 * visibility strictly on `loaded ? 'opacity-100' : 'opacity-0'`, permanently locking
 * cached or fast-loading images at `opacity-0` underneath an infinite shimmer overlay.
 *
 * FIX:
 * 1. Validate and canonicalize cover URLs via `resolveCover()`.
 * 2. Use `imgRef` and check `complete && naturalWidth > 0` on mount / src change
 *    so cached / preloaded / SSR-hydrated images are marked loaded immediately.
 * 3. Remove the hard `opacity-0` lockout that depended solely on `onLoad`.
 * 4. Add a robust `onError` handler rendering a designed visual fallback
 *    (book icon + initials + title).
 * 5. Display the shimmer only while the image is genuinely pending load.
 */
export function CoverImage({
  src,
  alt,
  width,
  height,
  sizes,
  priority = false,
  imgClassName = 'w-full h-full object-cover',
  fallbackIconClassName = 'w-6 h-6 text-editorial-faint',
}: CoverImageProps) {
  const resolvedSrc = resolveCover(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if image is already completed in cache on mount or src change
  useEffect(() => {
    if (!resolvedSrc) {
      setLoaded(false);
      return;
    }
    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) {
        setLoaded(true);
        setFailed(false);
      } else {
        setFailed(true);
      }
    }
  }, [resolvedSrc]);

  if (!resolvedSrc || failed) {
    const initials = alt
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-surface-elevated/60 border border-white/[0.06] select-none">
        <Book className={`${fallbackIconClassName} mb-1.5 opacity-60`} aria-hidden="true" />
        <span className="block h-px w-8 bg-white/20 mb-2" aria-hidden="true" />
        <span className="font-editorial text-2xl text-editorial-title leading-none">
          {initials || '—'}
        </span>
        <span className="text-[10px] text-editorial-muted line-clamp-3 leading-snug mt-2 px-1">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Shimmer placeholder shown only while genuinely pending load */}
      {!loaded && !failed && (
        <div
          aria-hidden="true"
          className="absolute inset-0 cover-shimmer pointer-events-none z-10"
        />
      )}
      <img
        ref={imgRef}
        src={resolvedSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => {
          setLoaded(true);
          setFailed(false);
        }}
        onError={() => {
          setFailed(true);
          setLoaded(false);
        }}
        className={`${imgClassName} transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-90'
        }`}
      />
    </div>
  );
}
