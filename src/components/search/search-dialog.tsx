'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, BookOpen, ArrowRight, Layers, Building2, Sparkles, Hash } from 'lucide-react';
import { searchCatalog, getAllSeries, getPublishers } from '@/lib/catalog-service';
import { formatRupiah } from '@/lib/formatters';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const allSeries = useMemo(() => getAllSeries(), []);
  const publishers = useMemo(() => getPublishers(), []);

  // Keyboard shortcut listener for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const qTrim = query.trim().toLowerCase();

  // Dynamic quick suggestions derived directly from top series in data
  const dynamicQuickTags = useMemo(() => {
    return allSeries
      .filter((s) => (s.totalVolumes || 0) >= 2)
      .slice(0, 6)
      .map((s) => s.name);
  }, [allSeries]);

  // Search Results
  const matchedBooks = useMemo(() => {
    if (!qTrim) return [];
    return searchCatalog(qTrim, 6);
  }, [qTrim]);

  const matchedSeries = useMemo(() => {
    if (!qTrim) return [];
    return allSeries
      .filter((s) => s.name.toLowerCase().includes(qTrim) || s.originalTitle?.toLowerCase().includes(qTrim))
      .slice(0, 3);
  }, [qTrim, allSeries]);

  const matchedPublishers = useMemo(() => {
    if (!qTrim) return [];
    return publishers
      .filter((p) => p.name.toLowerCase().includes(qTrim) || p.shortName.toLowerCase().includes(qTrim))
      .slice(0, 2);
  }, [qTrim, publishers]);

  // Query Type Detection
  const isIsbn = useMemo(() => /^(?:978)?\d{9,13}$/.test(qTrim.replace(/[\-\s]/g, '')), [qTrim]);
  const isVol = useMemo(() => /\b(?:vol\.?|volume|jilid)\s*\d+/i.test(qTrim), [qTrim]);

  const handleGoToSearch = () => {
    const trimmed = query.trim();
    if (trimmed) {
      onClose();
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-16">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Command Palette Modal */}
      <div className="relative w-full max-w-2xl liquid-glass rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh] border border-white/[0.08]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
          <Search className="w-4 h-4 text-editorial-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleGoToSearch();
              }
            }}
            placeholder="Cari judul manga, light novel, ISBN, seri, pengarang..."
            className="flex-1 bg-transparent text-sm text-editorial-title placeholder:text-editorial-faint focus:outline-none font-sans"
          />

          {/* Type Detection Badges */}
          {isIsbn && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span>ISBN</span>
            </span>
          )}
          {isVol && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
              Volume
            </span>
          )}

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-editorial-faint hover:text-editorial-title transition-colors"
              aria-label="Hapus teks"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <kbd className="text-[10px] font-mono text-editorial-faint px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] hidden sm:inline-block">
            ↵ ENTER
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-4 flex-1 space-y-4">
          {qTrim === '' ? (
            <div className="py-8 px-4 space-y-4 text-center">
              <div className="space-y-1">
                <p className="font-editorial text-base font-normal text-editorial-title">
                  Pencarian Cepat Katalog Nuvellite
                </p>
                <p className="text-xs text-editorial-muted">
                  Cari berdasarkan judul, seri kanonikal, nomor ISBN-13, pengarang, atau nomor volume.
                </p>
              </div>

              {/* Dynamic Suggestion Chips */}
              {dynamicQuickTags.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block mb-2">
                    Seri Populer Terdaftar:
                  </span>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {dynamicQuickTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setQuery(tag)}
                        className="px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-editorial-muted hover:text-editorial-title text-xs font-mono transition-all border border-white/[0.06]"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : matchedBooks.length === 0 && matchedSeries.length === 0 && matchedPublishers.length === 0 ? (
            <div className="py-12 text-center text-xs text-editorial-faint space-y-2">
              <p>Tidak ditemukan hasil cepat untuk &quot;{query}&quot;</p>
              <button
                type="button"
                onClick={handleGoToSearch}
                className="text-accent underline font-semibold text-xs inline-flex items-center gap-1"
              >
                <span>Buka halaman pencarian mendalam</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group 1: Series Matches */}
              {matchedSeries.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono uppercase tracking-wider text-editorial-faint font-semibold">
                    <Layers className="w-3.5 h-3.5 text-accent" />
                    <span>Seri Kanonikal ({matchedSeries.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchedSeries.map((s) => (
                      <Link
                        key={s.id}
                        href={`/series/${s.slug}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative aspect-[3/4] w-9 rounded-lg overflow-hidden bg-surface-sunken shrink-0 cover-depth">
                            {s.coverImage ? (
                              <img src={s.coverImage} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Layers className="w-4 h-4 text-editorial-faint" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-editorial-title group-hover:text-accent transition-colors truncate block">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-editorial-muted font-mono">
                              {s.publisherName} • {s.totalVolumes} Volume • {s.type === 'LIGHT_NOVEL' ? 'Light Novel' : 'Manga'}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-editorial-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 2: Book / Volume Matches */}
              {matchedBooks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono uppercase tracking-wider text-editorial-faint font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                    <span>Volume Buku ({matchedBooks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchedBooks.map((book) => (
                      <Link
                        key={book.id}
                        href={`/books/${book.slug}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative aspect-[3/4] w-9 rounded-lg overflow-hidden bg-surface-sunken shrink-0 cover-depth">
                            {book.coverImage ? (
                              <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-editorial-faint" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-editorial-title group-hover:text-accent transition-colors truncate">
                                {book.title}
                              </span>
                              {book.volume !== null && book.volume !== undefined && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[8.5px] font-mono bg-white/[0.04] text-editorial-muted">
                                  Vol. {book.volume}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-editorial-muted mt-0.5 font-mono">
                              <span>{book.publisherShortName}</span>
                              <span>•</span>
                              <span className={book.category === 'Light Novel' ? 'text-amber-300' : 'text-sky-300'}>
                                {book.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-3">
                          <span className="text-xs font-mono font-semibold text-editorial-title">
                            {formatRupiah(book.currentPrice)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 3: Publishers */}
              {matchedPublishers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-2 text-[10px] font-mono uppercase tracking-wider text-editorial-faint font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Penerbit ({matchedPublishers.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchedPublishers.map((pub) => (
                      <Link
                        key={pub.id}
                        href={`/?publisher=${pub.id}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/[0.04] transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-editorial-title group-hover:text-accent transition-colors block">
                            {pub.name}
                          </span>
                          <span className="text-[10px] text-editorial-muted font-mono">{pub.country}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-editorial-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Action */}
        {qTrim !== '' && (
          <div className="p-3 border-t border-white/[0.06] bg-white/[0.02] shrink-0">
            <button
              type="button"
              onClick={handleGoToSearch}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-editorial-title text-xs font-medium transition-all group active:scale-95 border border-white/[0.06]"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-editorial-muted" />
                <span>Lihat semua hasil untuk &quot;{query}&quot;</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-editorial-faint hidden sm:inline">Tekan Enter</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
