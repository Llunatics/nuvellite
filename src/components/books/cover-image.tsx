'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface CoverImageProps {
  src?: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  imgClassName?: string;
  fallbackIconClassName?: string;
}

/**
 * Cover image with graceful loading states.
 *
 * The origin CDN (cdn.gramedia.com) is slow and flaky, and Vercel's image
 * optimizer quota gets exhausted (HTTP 402) — so instead of a black box
 * while waiting, we render a shimmer placeholder, fade the image in on
 * load, and fall back to a designed typographic cover when there is no
 * image at all (or it fails to load).
 *
 * The typographic fallback matters: 99% of KKI archive series have no
 * photo cover yet (MangaUpdates 429-blocks this network, publisher pages
 * die), and a bare book icon reads as "broken". Initials + title in the
 * house editorial style reads as an intentional cover, not a blank.
 */
export function CoverImage({
  src,
  alt,
  width,
  height,
  sizes,
  priority = false,
  imgClassName = 'w-full h-full object-cover',
  fallbackIconClassName = 'w-8 h-8 text-editorial-faint',
}: CoverImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const initials = alt
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-surface-elevated/60 border border-white/[0.06]">
        <span className="block h-px w-8 bg-white/25 mb-3" aria-hidden="true" />
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
      {/* Shimmer placeholder while the image loads */}
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 cover-shimmer"
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`${imgClassName} transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
