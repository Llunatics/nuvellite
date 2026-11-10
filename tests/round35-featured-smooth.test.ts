import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('Round 3.6 — Upright Single-Cover Featured Showcase (Block R3.6-1)', () => {
  const cardCode = read('src/components/books/card-variants.tsx');

  it('FeaturedReleaseCard has dual-zone showcase architecture with max-w-5xl and tall media well', () => {
    expect(cardCode).toContain('data-testid="featured-release-card"');
    expect(cardCode).toContain('max-w-5xl');
    expect(cardCode).toContain('rounded-[28px] sm:rounded-[32px]');
    expect(cardCode).toContain('data-testid="featured-media-stage"');
    expect(cardCode).toContain('h-[284px] sm:h-[320px] md:h-[400px] lg:h-[428px]');
    expect(cardCode).toContain('blur-2xl');
  });

  it('renders single upright cover without fanned companion covers (zero rotation)', () => {
    expect(cardCode).toContain('data-testid="featured-upright-cover"');
    expect(cardCode).not.toContain('-rotate-6');
    expect(cardCode).not.toContain('rotate-6');
    expect(cardCode).not.toContain('hasFan');
    expect(cardCode).not.toContain('prevBook');
    expect(cardCode).not.toContain('nextBook');
    expect(cardCode).toContain('data-testid="featured-carousel-dots"');
  });

  it('renders clean single-line meta with zero bullet dots and dedicated author line', () => {
    expect(cardCode).toContain('data-testid="featured-meta-line"');
    expect(cardCode).toContain('data-testid="featured-author-line"');
    // Ensure no bullet \u2022 characters in the meta line block
    const metaBlock = cardCode.substring(
      cardCode.indexOf('data-testid="featured-meta-line"'),
      cardCode.indexOf('data-testid="featured-meta-line"') + 600
    );
    expect(metaBlock).not.toContain('\u2022');
    expect(metaBlock).not.toContain('&bull;');
  });
});

describe('Round 3.6 — Compositor Dismissal & Hero Relocation (Block R3.6-2)', () => {
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

  it('has slim masthead strip and relocated editorial identity banner', () => {
    expect(feedCode).toContain('data-testid="hero-masthead-strip"');
    expect(feedCode).toContain('data-testid="editorial-identity-banner"');
    expect(feedCode).toContain('!mt-2 sm:!mt-2.5');
    expect(feedCode).toContain('!mt-10 sm:!mt-14');
  });
});
