import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('Round 3.5 — Llunevie-Form Featured Showcase (Block R3.5-1)', () => {
  const cardCode = read('src/components/books/card-variants.tsx');

  it('FeaturedReleaseCard has Llunevie cover-forward single-card architecture', () => {
    expect(cardCode).toContain('data-testid="featured-release-card"');
    expect(cardCode).toContain('max-w-3xl');
    expect(cardCode).toContain('rounded-[28px] sm:rounded-[32px]');
    expect(cardCode).toContain('data-testid="featured-media-stage"');
    expect(cardCode).toContain('h-[220px] sm:h-[256px]');
    expect(cardCode).toContain('blur-2xl');
  });

  it('renders fanned companion covers when spotlightBooks has at least 3 items', () => {
    expect(cardCode).toContain('hasFan = spotlightBooks.length >= 3');
    expect(cardCode).toContain('-rotate-6');
    expect(cardCode).toContain('rotate-6');
    expect(cardCode).toContain('data-testid="featured-carousel-dots"');
  });

  it('renders clean single-line meta with zero bullet dots', () => {
    expect(cardCode).toContain('data-testid="featured-meta-line"');
    // Ensure no bullet \u2022 characters in the meta line block
    const metaBlock = cardCode.substring(
      cardCode.indexOf('data-testid="featured-meta-line"'),
      cardCode.indexOf('data-testid="featured-meta-line"') + 600
    );
    expect(metaBlock).not.toContain('\u2022');
    expect(metaBlock).not.toContain('&bull;');
  });
});

describe('Round 3.5 — Compositor-Driven 60fps Scroll Dismissal (Block R3.5-2)', () => {
  const feedCode = read('src/components/feed/release-feed.tsx');

  it('release-feed contains zero setState on scroll and zero marginBottom reflow', () => {
    expect(feedCode).not.toContain('setDismissState');
    expect(feedCode).not.toContain('dismissState');
    expect(feedCode).not.toContain('collapsePx');
    expect(feedCode).not.toContain('marginBottom:');
  });

  it('release-feed applies transform + opacity directly via coalesced rAF loop', () => {
    expect(feedCode).toContain('featuredSectionRef.current');
    expect(feedCode).toContain('travelRange = 480');
    expect(feedCode).toContain('0.5 * (1 - Math.cos(Math.PI * progress))');
    expect(feedCode).toContain('target.style.opacity = String(opacity)');
    expect(feedCode).toContain('target.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`');
  });

  it('has tightened hero intro spacing and balanced section gaps', () => {
    expect(feedCode).toContain('space-y-3 pt-1 sm:pt-2');
    expect(feedCode).toContain('!mt-5 sm:!mt-6');
    expect(feedCode).toContain('!mt-10 sm:!mt-14');
  });
});
