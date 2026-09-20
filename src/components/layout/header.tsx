'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Moon, Sun, BookMarked, Palette } from 'lucide-react';
import { useTheme, ACCENT_THEMES, AccentTheme } from '@/hooks/use-theme';
import { useCollection } from '@/hooks/use-collection';
import { SearchDialog } from '@/components/search/search-dialog';

export function Header() {
  const pathname = usePathname();
  const { toggleTheme, isDark, accent, setAccent, mounted } = useTheme();
  const { ownedItems, isLoaded } = useCollection();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Scroll listener for integrated -> floating transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close palette popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsPaletteOpen(false);
      }
    }
    if (isPaletteOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPaletteOpen]);

  // Primary navigation destinations (Publisher moved to filter/metadata; Koleksi integrated into primary nav)
  const navLinks = [
    { href: '/', label: 'Katalog', active: pathname === '/' },
    { href: '/calendar', label: 'Kalender', active: pathname.startsWith('/calendar') },
    { href: '/series', label: 'Seri', active: pathname.startsWith('/series') },
    {
      href: '/library',
      label: 'Koleksi',
      active: pathname.startsWith('/library'),
      badge: isLoaded && ownedItems.length > 0 ? ownedItems.length : undefined,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full pt-2 sm:pt-3 px-3 sm:px-6 lg:px-8 pointer-events-none">
        <div
          className={`max-w-7xl mx-auto h-14 rounded-2xl px-4 sm:px-6 flex items-center justify-between gap-3 pointer-events-auto nav-surface-transition ${
            isScrolled ? 'floating-nav shadow-xl' : 'integrated-nav'
          }`}
        >
          {/* Brand Logo with bookmark badge */}
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/" className="inline-flex items-center gap-2.5 focus:outline-none group">
              <span className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-editorial-title group-hover:text-accent transition-colors">
                nuvellite
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-mono font-semibold tracking-widest uppercase bg-surface-elevated text-accent border border-border-subtle shadow-xs">
                OFFICIAL TRACKER
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    link.active
                      ? 'text-editorial-title bg-surface-elevated font-semibold shadow-xs border border-border-subtle'
                      : 'text-editorial-muted hover:text-editorial-title hover:bg-surface-elevated/50'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge !== undefined && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[8px] font-mono font-bold flex items-center justify-center shadow-xs">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Search Trigger Button with Liquid Glass Material */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl soft-glass hover:bg-surface-elevated border border-border-subtle hover:border-border-medium text-editorial-muted hover:text-editorial-title transition-all text-xs group active:scale-95 shadow-xs"
              aria-label="Cari manga atau light novel"
            >
              <Search className="w-3.5 h-3.5 text-editorial-faint group-hover:text-accent transition-colors" />
              <span className="hidden sm:inline-block text-xs font-normal">Cari judul, ISBN, seri...</span>
              <kbd className="hidden sm:inline-block ml-1.5 px-1.5 py-0.5 text-[9px] font-mono text-editorial-faint bg-surface-sunken/80 border border-border-subtle rounded group-hover:border-border-medium transition-colors">
                ⌘K
              </kbd>
            </button>

            {/* Theme Accent Switcher Popover */}
            <div className="relative" ref={paletteRef}>
              <button
                type="button"
                onClick={() => setIsPaletteOpen((prev) => !prev)}
                className="p-2 rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-border-subtle text-editorial-muted hover:text-editorial-title transition-all flex items-center gap-1.5 active:scale-95"
                aria-label="Pilih Warna Tema"
                title="Pilih Tema Aksen"
              >
                <Palette className="w-4 h-4 text-editorial-muted" />
                <span
                  className="w-2 h-2 rounded-full shadow-xs"
                  style={{ backgroundColor: ACCENT_THEMES.find((t) => t.id === accent)?.color || '#E11D48' }}
                />
              </button>

              {/* Accent Palette Dropdown */}
              {isPaletteOpen && (
                <div className="absolute right-0 mt-2 p-2.5 rounded-2xl liquid-glass border border-border-subtle shadow-2xl z-50 min-w-[170px] space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block px-2 pb-1 border-b border-border-subtle">
                    Warna Aksen
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {ACCENT_THEMES.map((themeOption) => {
                      const isSelected = accent === themeOption.id;
                      return (
                        <button
                          key={themeOption.id}
                          type="button"
                          onClick={() => {
                            setAccent(themeOption.id);
                            setIsPaletteOpen(false);
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-surface-elevated border border-border-medium shadow-xs'
                              : 'hover:bg-surface-elevated/60 border border-transparent'
                          }`}
                          title={themeOption.label}
                        >
                          <span
                            className="w-4 h-4 rounded-full shadow-xs transition-transform hover:scale-110"
                            style={{ backgroundColor: themeOption.color }}
                          />
                          <span className="text-[10px] font-mono text-editorial-muted">{themeOption.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-border-subtle text-editorial-muted hover:text-editorial-title transition-all active:scale-95"
              aria-label={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              title={isDark ? 'Mode Terang' : 'Mode Gelap'}
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
