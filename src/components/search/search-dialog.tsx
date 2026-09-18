'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { searchCatalog } from '@/lib/catalog-service';
import { Book } from '@/lib/types';
import { formatRupiah } from '@/lib/formatters';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          const searchBtn = document.querySelector('button[aria-label="Cari manga atau light novel"]');
          if (searchBtn instanceof HTMLButtonElement) {
            searchBtn.click();
          }
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const res = searchCatalog(query, 12);
    setResults(res);
  }, [query]);

  const handleGoToSearch = () => {
    const trimmed = query.trim();
    if (trimmed) {
      onClose();
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-20">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-surface-overlay border border-border-medium rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle bg-surface/50 shrink-0">
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
            placeholder="Ketik judul komik, light novel, merchandise, pengarang..."
            className="flex-1 bg-transparent text-sm text-editorial-title placeholder:text-editorial-faint focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-editorial-faint hover:text-editorial-title"
              aria-label="Hapus teks"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] font-mono text-editorial-faint px-1.5 py-0.5 rounded bg-surface-raised border border-border-subtle hidden sm:inline-block">
            ↵ ENTER
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 flex-1">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-editorial-faint space-y-1">
              <p className="font-medium text-editorial-muted">Cari di 2.700+ katalog Manga, Light Novel, dan Merchandise resmi</p>
              <p>Tekan Enter untuk melihat semua hasil di halaman pencarian penuh.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-editorial-faint space-y-2">
              <p>Tidak ditemukan buku instan untuk &quot;{query}&quot;</p>
              <button
                type="button"
                onClick={handleGoToSearch}
                className="text-accent underline font-medium"
              >
                Buka halaman pencarian lengkap &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((book) => (
                <Link
                  key={book.id}
                  href={`/books/${book.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-raised transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Format Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        book.category === 'Light Novel'
                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                          : book.category === 'Merchandise'
                          ? 'bg-purple-500/10 border-purple-500/25 text-purple-400'
                          : 'bg-sky-500/10 border-sky-500/25 text-sky-400'
                      }`}
                    >
                      {book.category === 'Merchandise' ? <Sparkles className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-editorial-title group-hover:text-accent transition-colors truncate">
                          {book.title}
                        </span>
                        {book.category !== 'Merchandise' && book.volume !== null && book.volume !== undefined && (
                          <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-surface border border-border-subtle text-editorial-muted">
                            Vol. {book.volume}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-editorial-muted mt-0.5">
                        <span className="font-medium">{book.publisherShortName}</span>
                        <span>•</span>
                        <span>{book.category}</span>
                        {book.authors.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="truncate">{book.authors[0]}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <span className="text-xs font-mono font-medium text-editorial-title">
                      {formatRupiah(book.currentPrice)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer Action: View Full Search Page */}
        {query.trim() !== '' && (
          <div className="p-2.5 border-t border-border-subtle bg-surface/80 shrink-0">
            <button
              type="button"
              onClick={handleGoToSearch}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent text-xs font-semibold transition-all group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Lihat semua hasil pencarian &quot;{query}&quot;</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] opacity-75 hidden sm:inline">Tekan Enter</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
