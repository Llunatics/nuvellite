/**
 * Cover URL resolution and validation.
 *
 * Validates and normalizes cover image URLs from various data fields
 * (coverImage, coverUrl, cover, image). Returns a canonical http(s) URL
 * or null if no usable cover URL exists, logging a warning when all
 * fields are missing so fallbacks are rendered deterministically.
 */

export interface CoverFields {
  coverImage?: string | null;
  coverUrl?: string | null;
  cover?: string | null;
  image?: string | null;
  [key: string]: unknown;
}

export function isValidHttpUrl(candidate?: string | null): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Resolves a canonical cover image URL from an object or string.
 * Normalizes fallback fields (coverImage, coverUrl, cover, image),
 * validates the URL scheme (http/https), and returns null with a warning
 * if no valid cover URL is found.
 */
export function resolveCover(
  input?: CoverFields | string | null
): string | null {
  if (!input) {
    console.warn('resolveCover: Missing cover input');
    return null;
  }

  if (typeof input === 'string') {
    if (isValidHttpUrl(input)) {
      return input.trim();
    }
    console.warn(`resolveCover: Invalid cover URL string: "${input}"`);
    return null;
  }

  if (typeof input === 'object') {
    const candidates = [
      input.coverImage,
      input.coverUrl,
      input.cover,
      input.image,
    ];

    for (const c of candidates) {
      if (isValidHttpUrl(c)) {
        return (c as string).trim();
      }
    }

    console.warn('resolveCover: All cover fields missing or invalid in item', {
      coverImage: input.coverImage,
      coverUrl: input.coverUrl,
      cover: input.cover,
      image: input.image,
    });
    return null;
  }

  console.warn('resolveCover: Unexpected input type', typeof input);
  return null;
}
