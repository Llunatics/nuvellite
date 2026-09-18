'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Moon, Sun, BookMarked } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { useCollection } from '@/hooks/use-collection';
import { SearchDialog } from '@/components/search/search-dialog';

export function Header() {
  const pathname = usePathname();
  const { toggleTheme, isDark, mounted } = useTheme();
  const { ownedItems, isLoaded } = useCollection();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Katalog', active: pathname === '/' },
    { href: '/calendar', label: 'Kalender', active: pathname.startsWith('/calendar') },
    { href: '/series', label: 'Seri', active: pathname.startsWith('/series') },
    { href: '/publishers', label: 'Penerbit', active: pathname.startsWith('/publishers') },
    { href: '/library', label: 'Koleksi', active: pathname.startsWith('/library') },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-xl border-b border-border-subtle transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          {/* Brand Logo with micro-badge */}
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/" className="inline-flex items-center gap-1.5 focus:outline-none group">
              <span className="font-editorial text-xl font-bold tracking-tight text-editorial-title group-hover:text-gold transition-colors">
                nuvellite
              </span>
              <span className="inline-flex items-center px-1.5 py-[1px] rounded-[3px] text-[7.5px] font-mono font-semibold tracking-wider uppercase border border-gold/30 bg-gold/10 text-gold leading-none">
                MANGA & LN
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    link.active
                      ? 'text-gold bg-gold/10 font-semibold'
                      : 'text-editorial-muted hover:text-editorial-title hover:bg-surface-raised'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Search Trigger Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-border-subtle text-editorial-muted hover:text-editorial-title transition-all text-xs"
              aria-label="Cari manga atau light novel"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline-block text-xs font-normal">Cari komik / LN...</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono text-editorial-faint bg-surface-raised border border-border-subtle rounded">
                ⌘K
              </kbd>
            </button>

            {/* Collection Quick Link */}
            <Link
              href="/library"
              className="relative p-2 rounded-xl bg-surface hover:bg-surface-raised border border-border-subtle text-editorial-muted hover:text-editorial-title transition-all"
              aria-label="Koleksi Buku Saya"
            >
              <BookMarked className="w-4 h-4" />
              {isLoaded && ownedItems.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-gold text-background text-[9px] font-mono font-bold flex items-center justify-center">
                  {ownedItems.length}
                </span>
              )}
            </Link>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-surface hover:bg-surface-raised border border-border-subtle text-editorial-muted hover:text-editorial-title transition-all"
              aria-label={isDark ? 'Mode Terang' : 'Mode Gelap'}
            >
              {mounted && !isDark ? (
                <Moon className="w-4 h-4 text-editorial-title" />
              ) : (
                <Sun className="w-4 h-4 text-amber-300" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Global Search Dialog Modal */}
      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
