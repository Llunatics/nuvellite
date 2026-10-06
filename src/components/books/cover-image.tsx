'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';

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
 * load, and fall back to a book icon when the image fails entirely.
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
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-surface-elevated/40">
        <BookOpen className={fallbackIconClassName} />
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
