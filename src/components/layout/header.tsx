'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Search, BookMarked } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';

// Lazy-loaded so visitors who never open search never download or parse the
// search dialog (and its catalog data graph) on initial page load (Block 5).
const SearchDialog = dynamic(
  () => import('@/components/search/search-dialog').then((m) => m.SearchDialog),
  { ssr: false },
);

export function Header() {
  const pathname = usePathname();
  const { ownedItems, isLoaded } = useCollection();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll listener for integrated -> floating liquid glass transition
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    { href: '/radar', label: 'Radar', active: pathname.startsWith('/radar') },
    {
      href: '/library',
      label: 'Koleksi',
      active: pathname.startsWith('/library'),
      badge: isLoaded && ownedItems.length > 0 ? ownedItems.length : undefined,
    },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 pointer-events-none ${
          isScrolled ? 'pt-3 sm:pt-3.5 px-3 sm:px-6' : 'pt-5 sm:pt-7 px-4 sm:px-8'
        }`}
      >
        <div
          className={`max-w-6xl mx-auto h-14 sm:h-16 rounded-full px-4 sm:px-6 flex items-center justify-between gap-3 pointer-events-auto nav-surface-transition ${
            isScrolled
              ? 'liquid-glass-pill shadow-2xl'
              : 'integrated-nav'
          }`}
        >
          {/* Brand Identity */}
          <div className="flex items-center gap-7 shrink-0">
            <Link href="/" className="inline-flex items-center gap-2.5 group focus:outline-none" aria-label="Nuvellite Beranda">
              <span className="font-editorial text-[26px] sm:text-3xl font-semibold tracking-tight text-editorial-title group-hover:text-accent transition-colors leading-none">
                nuvellite
              </span>
              <span className="w-2 h-2 rounded-full shadow-xs transition-transform group-hover:scale-125 bg-accent" />
            </Link>

            {/* Desktop Center Floating Pill Navigation */}
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-surface-sunken/40 border border-white/[0.04]">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    link.active
                      ? 'text-editorial-title bg-white/[0.08] shadow-xs font-semibold'
                      : 'text-editorial-muted hover:text-editorial-title hover:bg-white/[0.03]'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge !== undefined && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-accent text-zinc-950 text-[8px] font-mono font-bold flex items-center justify-center shadow-xs">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Minimal Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full soft-glass hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] text-editorial-muted hover:text-editorial-title transition-all text-xs group active:scale-95"
              aria-label="Cari judul, ISBN, pengarang, seri"
            >
              <Search className="w-4 h-4 text-editorial-muted group-hover:text-editorial-title transition-colors" />
              <span className="hidden sm:inline-block text-xs font-normal text-editorial-muted group-hover:text-editorial-title">
                Cari judul, seri, ISBN...
              </span>
              <kbd className="hidden sm:inline-flex items-center ml-1 px-1.5 py-0.5 text-[9px] font-mono text-editorial-faint bg-white/[0.04] border border-white/[0.06] rounded-md">
                ⌘K
              </kbd>
            </button>

          </div>
        </div>
      </header>

      {/* Global Command Search Dialog (mounted only when opened) */}
      {isSearchOpen && <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
    </>
  );
}
