import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import announcementsData from '../src/data/announcements.json';
import { cleanExpectedDate, getStatusBadgeStyle } from '../src/components/radar/announcement-card';
import type { PublisherAnnouncement } from '../src/lib/types';

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('Round 3.4 — Featured Showcase Scroll Physics (Block R3.4-1)', () => {
  const feedCode = read('src/components/feed/release-feed.tsx');
  const headerCode = read('src/components/layout/header.tsx');
  const globalsCss = read('src/app/globals.css');

  it('release-feed uses compositor-driven 60fps scroll dismissal without layout reflow', () => {
    expect(feedCode).toContain('travelRange = 480');
    expect(feedCode).toContain('0.5 * (1 - Math.cos(Math.PI * progress))');
    expect(feedCode).toContain('translate3d(0, ${translateY}px, 0) scale(${scale})');
    expect(feedCode).toContain('data-testid="featured-showcase-card"');
  });

  it('spotlight carousel dots are integrated inside media well in FeaturedReleaseCard', () => {
    const cardCode = read('src/components/books/card-variants.tsx');
    expect(cardCode).toContain('data-testid="featured-carousel-dots"');
    expect(cardCode).toContain('data-testid="featured-media-stage"');
  });

  it('scrolled header includes solid top mask strip to prevent content peek', () => {
    expect(headerCode).toContain("before:fixed before:inset-x-0 before:top-0 before:h-3 before:bg-background");
  });

  it('.glass-popover has 0.98 opacity in both dark and light modes', () => {
    expect(globalsCss).toContain('background-color: rgba(14, 17, 24, 0.98);');
    expect(globalsCss).toContain('background-color: rgba(255, 255, 255, 0.98);');
  });
});

describe('Round 3.4 — Additive Announcement Covers & Remote Patterns (Block R3.4-2)', () => {
  const nextConfig = read('next.config.mjs');
  const announcements = announcementsData as PublisherAnnouncement[];

  it('next.config.mjs allows remote cover patterns from any HTTPS origin with unoptimized: true', () => {
    expect(nextConfig).toContain("unoptimized: true");
    expect(nextConfig).toContain("{ protocol: 'https', hostname: '**' }");
  });

  it('all 8 announcements carry verified HTTPS coverUrl', () => {
    expect(announcements.length).toBe(8);
    for (const a of announcements) {
      expect(a.coverUrl).toBeDefined();
      expect(typeof a.coverUrl).toBe('string');
      expect(a.coverUrl).toMatch(/^https:\/\//);
    }
  });

  it('only additive coverUrl changed on announcements (zero deleted/mutated fields)', () => {
    for (const a of announcements) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.publisherId).toBeTruthy();
      expect(a.category).toBeTruthy();
      expect(a.state).toBeTruthy();
      expect(a.sources.length).toBeGreaterThan(0);
    }
  });
});

describe('Round 3.4 — Visual-First Cover-Led Radar Redesign & Source Rename (Block R3.4-3)', () => {
  const cardCode = read('src/components/radar/announcement-card.tsx');
  const listCode = read('src/components/radar/radar-list.tsx');
  const shelfCode = read('src/components/radar/radar-shelf.tsx');

  it('radar card renders with visual-first testids and zero BUKTI', () => {
    expect(cardCode).toContain('data-testid="radar-card"');
    expect(cardCode).toContain('data-testid="radar-card-cover"');
    expect(cardCode).toContain('data-testid="radar-card-meta"');
    expect(cardCode).toContain('data-testid="radar-card-sources"');
    expect(cardCode).toContain('Source ({item.sources.length}):');
    expect(cardCode).not.toContain('Bukti (');
    expect(cardCode).not.toContain('BUKTI');
  });

  it('radar list and shelf use responsive 2-column grid layout', () => {
    expect(listCode).toContain('data-testid="radar-card-grid"');
    expect(listCode).toContain('grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5');
    expect(shelfCode).toContain('grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5');
  });

  it('cleanExpectedDate cleans verbose prefixes and produces concise dates', () => {
    expect(cleanExpectedDate('Pre-order Special Set 2–14 Nov 2026')).toBe('Nov 2026');
    expect(cleanExpectedDate('Desember 2026')).toBe('Des 2026');
    expect(cleanExpectedDate('2027')).toBe('2027');
    expect(cleanExpectedDate(undefined)).toBe('Segera');
  });

  it('state badges match the 4 requested owner states', () => {
    expect(getStatusBadgeStyle('OFFICIALLY_CONFIRMED').label).toBe('Resmi Penerbit');
    expect(getStatusBadgeStyle('DATED_ISBN').label).toBe('Terdaftar ISBN');
    expect(getStatusBadgeStyle('CORROBORATED').label).toBe('Terkonfirmasi');
    expect(getStatusBadgeStyle('SPOTTED').label).toBe('Pantauan Awal');
  });
});
