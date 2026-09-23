'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Moon, Sun, Palette, BookMarked, Sparkles } from 'lucide-react';
import { useTheme, ACCENT_THEMES } from '@/hooks/use-theme';
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

  // Scroll listener for integrated -> floating liquid glass transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
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

  // Keyboard shortcut for Cmd/Ctrl + K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const currentThemeColor = ACCENT_THEMES.find((t) => t.id === accent)?.color || '#E11D48';

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 pointer-events-none ${
          isScrolled ? 'pt-2.5 sm:pt-3 px-3 sm:px-6' : 'pt-4 sm:pt-6 px-4 sm:px-8'
        }`}
      >
        <div
          className={`max-w-6xl mx-auto h-12 sm:h-13 rounded-full px-3.5 sm:px-5 flex items-center justify-between gap-3 pointer-events-auto nav-surface-transition ${
            isScrolled
              ? 'liquid-glass-pill shadow-2xl'
              : 'integrated-nav'
          }`}
        >
          {/* Brand Identity */}
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/" className="inline-flex items-center gap-2 group focus:outline-none" aria-label="Nuvellite Beranda">
              <span className="font-editorial text-xl sm:text-[22px] font-semibold tracking-tight text-editorial-title group-hover:text-accent transition-colors">
                nuvellite
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full shadow-xs transition-transform group-hover:scale-125"
                style={{ backgroundColor: currentThemeColor }}
              />
            </Link>

            {/* Desktop Center Floating Pill Navigation */}
            <nav className="hidden md:flex items-center gap-1 p-0.5 rounded-full bg-surface-sunken/40 border border-white/[0.04]">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3.5 py-1 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    link.active
                      ? 'text-editorial-title bg-white/[0.08] shadow-xs font-semibold'
                      : 'text-editorial-muted hover:text-editorial-title hover:bg-white/[0.03]'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge !== undefined && (
                    <span
                      className="min-w-4 h-4 px-1 rounded-full text-white text-[8px] font-mono font-bold flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: currentThemeColor }}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Minimal Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full soft-glass hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] text-editorial-muted hover:text-editorial-title transition-all text-xs group active:scale-95"
              aria-label="Cari judul, ISBN, pengarang, seri"
            >
              <Search className="w-3.5 h-3.5 text-editorial-muted group-hover:text-editorial-title transition-colors" />
              <span className="hidden sm:inline-block text-xs font-normal text-editorial-muted group-hover:text-editorial-title">
                Cari judul, seri, ISBN...
              </span>
              <kbd className="hidden sm:inline-flex items-center ml-1 px-1.5 py-0.5 text-[9px] font-mono text-editorial-faint bg-white/[0.04] border border-white/[0.06] rounded-md">
                ⌘K
              </kbd>
            </button>

            {/* Accent Color Palette Popover */}
            <div className="relative" ref={paletteRef}>
              <button
                type="button"
                onClick={() => setIsPaletteOpen((prev) => !prev)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] text-editorial-muted hover:text-editorial-title transition-all active:scale-95 border border-transparent hover:border-white/[0.06]"
                aria-label="Pilih Warna Aksen"
                title="Pilih Tema Aksen"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-xs ring-2 ring-white/10"
                  style={{ backgroundColor: currentThemeColor }}
                />
              </button>

              {isPaletteOpen && (
                <div className="absolute right-0 mt-2 p-3 rounded-2xl liquid-glass border border-white/[0.08] shadow-2xl z-50 min-w-[180px] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint">
                      Aksen Tema
                    </span>
                    <Sparkles className="w-3 h-3 text-editorial-faint" />
                  </div>
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
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-white/[0.08] border border-white/[0.12] shadow-xs'
                              : 'hover:bg-white/[0.04] border border-transparent'
                          }`}
                          title={themeOption.label}
                        >
                          <span
                            className="w-4 h-4 rounded-full shadow-xs transition-transform hover:scale-110 ring-1 ring-white/10"
                            style={{ backgroundColor: themeOption.color }}
                          />
                          <span className="text-[10px] font-mono text-editorial-muted">
                            {themeOption.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/[0.06] text-editorial-muted hover:text-editorial-title transition-all active:scale-95 border border-transparent hover:border-white/[0.06]"
              aria-label={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              title={isDark ? 'Mode Terang' : 'Mode Gelap'}
            >
              {mounted && !isDark ? (
                <Moon className="w-3.5 h-3.5 text-editorial-title" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-300/80 hover:text-amber-200" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Global Command Search Dialog */}
      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
