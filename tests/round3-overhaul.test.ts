import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Round 3 supersession pins (S-01..S-06).
 *
 * Round 3 reversed several Round 2 design decisions on the owner's
 * direction: dual mode is back, the default accent is azure with 6
 * selectable accents, Newsreader serif is restored, the catalog hero
 * regained its glass card + floating cover badges, and Koleksi moved
 * from the bottom navbar into the profile avatar menu. These tests pin
 * those decisions at the source level so a future restyle cannot
 * silently re-lock the theme or re-crowd the navbar.
 */

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('Round 3 — dual mode + accent system (S-01, S-02)', () => {
  const globals = read('src/app/globals.css');
  const useTheme = read('src/hooks/use-theme.ts');

  it('azure is the default accent token', () => {
    expect(globals).toContain('--accent-rgb: 14 165 233;');
  });

  it('a full .light token palette exists', () => {
    expect(globals).toContain('.light {');
    expect(globals).toContain('--bg-rgb: 248 249 252;');
  });

  it('all 6 accents have dark + light overrides', () => {
    for (const id of ['azure', 'vermilion', 'emerald', 'indigo', 'gold', 'rose']) {
      expect(globals).toContain(`[data-accent="${id}"]`);
      expect(globals).toContain(`.light[data-accent="${id}"]`);
    }
  });

  it('useTheme is a real store, not the Round 2 no-op', () => {
    expect(useTheme).toContain("nuvellite_theme_accent");
    expect(useTheme).toContain('useSyncExternalStore');
    expect(useTheme).not.toContain("'lime'");
    expect(useTheme).toContain("accent: 'azure'");
  });
});

describe('Round 3 — Newsreader serif restored (S-04)', () => {
  it('layout loads Newsreader as --font-editorial', () => {
    const layout = read('src/app/layout.tsx');
    expect(layout).toContain('Newsreader');
    expect(layout).toContain("'--font-editorial'");
  });

  it('tailwind maps font-editorial to the serif stack', () => {
    expect(read('tailwind.config.ts')).toContain("'Newsreader', 'Georgia', 'serif'");
  });
});

describe('Round 3 — profile menu + 4-tab navbar (S-06)', () => {
  it('local profile store exists under its own storage key', () => {
    expect(existsSync(join(root, 'src/hooks/use-profile.ts'))).toBe(true);
    expect(read('src/hooks/use-profile.ts')).toContain('nuvellite_profile_v1');
  });

  it('header mounts the ProfileMenu', () => {
    expect(read('src/components/layout/header.tsx')).toContain('<ProfileMenu />');
  });

  it('mobile nav has exactly 4 tabs and no Koleksi tab', () => {
    const nav = read('src/components/layout/mobile-nav.tsx');
    expect(nav).not.toContain("label: 'Koleksi'");
    for (const label of ['Katalog', 'Kalender', 'Seri', 'Radar']) {
      expect(nav).toContain(`label: '${label}'`);
    }
  });
});

describe('Round 3 — catalog hero restored (S-03, S-05)', () => {
  it('featured card is a glass card with ambient glow + floating badges', () => {
    const card = read('src/components/books/card-variants.tsx');
    expect(card).toContain('rounded-3xl');
    expect(card).toContain('blur-3xl');
    expect(card).toContain('SOROTAN UTAMA');
    expect(card).toContain('bg-accent text-white');
  });

  it('radar state badges use the Round 3 palette, DATED_ISBN on accent', () => {
    const service = read('src/lib/announcement-service.ts');
    expect(service).toContain('bg-accent/15 text-accent border-accent/30');
    expect(service).toContain('bg-emerald-500/15 text-emerald-500');
    expect(service).toContain('bg-amber-500/15 text-amber-500');
  });
});
