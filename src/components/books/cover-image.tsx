'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface CoverImageProps {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  compact?: boolean;
  imgClassName?: string;
  fallbackIconClassName?: string;
}

function sanitizeSrc(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return undefined;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return undefined;
}

function extractInitials(title: string): string {
  const words = (title || '')
    .replace(/^[^a-zA-Z0-9]+/, '')
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-zA-Z0-9]+/, ''))
    .filter(Boolean);
  if (words.length === 0) return 'NV';
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Cover image with hydration-race-proof loading (Round 2, Block 3).
 *
 * With `images: { unoptimized: true }`, <Image> renders a plain <img> whose
 * native load event can fire before React hydration attaches onLoad, which
 * used to trap covers at opacity-0 behind an infinite shimmer. This version:
 * 1. Resets loaded/failed whenever src changes (spotlight rotations included).
 * 2. Synchronously inspects img.complete && naturalWidth on mount/src change
 *    so cached images appear instantly.
 * 3. Falls back to a typographic initials cover on error or after a 9s hang
 *    (e.g. a CDN 403/429), with referrerPolicy="no-referrer" to reduce
 *    hotlink blocking.
 */
export function CoverImage({
  src,
  alt,
  width,
  height,
  sizes,
  priority = false,
  compact,
  imgClassName = 'w-full h-full object-cover',
}: CoverImageProps) {
  const normalizedSrc = sanitizeSrc(src);
  const isCompact = compact ?? width <= 64;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset state when src changes and synchronously inspect cached DOM image
  useEffect(() => {
    setLoaded(false);
    setFailed(false);

    const el = imgRef.current;
    if (el && el.complete) {
      if (el.naturalWidth > 0) {
        setLoaded(true);
        return;
      }
      setFailed(true);
      return;
    }

    if (!normalizedSrc) return;
    const timer = setTimeout(() => {
      setLoaded((prevLoaded) => {
        if (!prevLoaded) setFailed(true);
        return prevLoaded;
      });
    }, 9000);

    return () => clearTimeout(timer);
  }, [normalizedSrc]);

  if (!normalizedSrc || failed) {
    const initials = extractInitials(alt);
    if (isCompact) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 border border-white/[0.08] select-none">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-zinc-400">
            {initials}
          </span>
        </div>
      );
    }
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-950 border border-white/[0.08] select-none">
        <span className="block h-px w-6 bg-white/20 mb-2.5" aria-hidden="true" />
        <span className="font-mono text-lg font-semibold tracking-wider text-zinc-200 leading-none">
          {initials}
        </span>
        <span className="text-[10px] text-zinc-500 line-clamp-3 leading-snug mt-2 px-1 font-sans">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-900/60">
      {!loaded && <div aria-hidden="true" className="absolute inset-0 cover-skeleton-flat" />}
      <Image
        ref={imgRef}
        src={normalizedSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        data-loaded={loaded ? 'true' : 'false'}
        className={`${imgClassName} nuv-cover-img`}
      />
    </div>
  );
}
