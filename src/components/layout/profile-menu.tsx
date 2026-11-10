'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  User,
  BookMarked,
  BookCopy,
  Moon,
  Sun,
  Check,
  LogIn,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';
import { useProfile, profileInitials } from '@/hooks/use-profile';
import { useTheme, ACCENT_THEMES } from '@/hooks/use-theme';

/**
 * Profile avatar menu (Round 3, B.1–B.3): replaces the old standalone
 * Koleksi nav entry + theme buttons. Houses the local collector profile
 * (sign in/out), the collection entry with live counts, the bind-up
 * directory, and display settings (dark/light mode + 6 accent colors).
 */
export function ProfileMenu() {
  const { ownedItems, wishlistItems, isLoaded, importJSON } = useCollection();
  const { profile, isSignedIn, signIn, signOut } = useProfile();
  const { theme, setTheme, accent, setAccent, mounted } = useTheme();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'main' | 'signin'>('main');
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Dismissal: outside pointer, Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  const close = () => {
    setOpen(false);
    setView('main');
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    if (importJSON(text)) close();
  };

  const ownedCount = isLoaded ? ownedItems.length : 0;
  const wishlistCount = isLoaded ? wishlistItems.length : 0;
  const activeAccentLabel =
    ACCENT_THEMES.find((t) => t.id === accent)?.label ?? '';

  return (
    <div ref={rootRef} className="relative">
      {/* Avatar trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu profil"
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 flex items-center justify-center transition-all ring-1 ring-white/15 hover:ring-accent/60 bg-surface-elevated active:scale-95"
      >
        {isSignedIn && profile ? (
          <span className="w-full h-full rounded-full bg-accent/20 text-accent border border-accent/40 font-editorial font-semibold text-sm flex items-center justify-center">
            {profileInitials(profile.name)}
          </span>
        ) : (
          <span className="w-full h-full rounded-full bg-gradient-to-b from-white/[0.12] to-white/[0.04] flex items-center justify-center text-editorial-muted">
            <User className="w-4 h-4" />
          </span>
        )}
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-background" />
        {ownedCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs">
            {ownedCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.625rem)] z-50 w-[calc(100vw-1.5rem)] max-w-[300px] sm:w-80 rounded-3xl liquid-glass border border-white/[0.07] shadow-2xl p-2 nuv-view-enter"
        >
          {view === 'signin' ? (
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => setView('main')}
                className="flex items-center gap-1 text-xs text-editorial-muted hover:text-editorial-title transition-colors mb-3"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Kembali
              </button>
              <h3 className="font-editorial text-lg text-editorial-title leading-tight">
                Masuk / Buat Profil Kolektor
              </h3>
              <p className="text-[11px] text-editorial-muted mt-1 leading-relaxed">
                Profil disimpan secara lokal di perangkat ini — tanpa akun,
                tanpa server.
              </p>
              <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!name.trim()) return;
                  signIn(name, tag);
                  close();
                }}
              >
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  required
                  placeholder="Nama panggilan / kolektor"
                  className="w-full rounded-full bg-surface-sunken border border-white/[0.08] px-3.5 py-2 text-xs text-editorial-title placeholder:text-editorial-faint focus:outline-none focus:border-accent/60"
                />
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  maxLength={40}
                  placeholder="Catatan / tag (opsional)"
                  className="w-full rounded-full bg-surface-sunken border border-white/[0.08] px-3.5 py-2 text-xs text-editorial-title placeholder:text-editorial-faint focus:outline-none focus:border-accent/60"
                />
                <button
                  type="submit"
                  className="w-full rounded-full bg-accent text-white py-2 px-4 text-xs font-medium transition-all active:scale-95"
                >
                  Masuk &amp; Simpan di Perangkat
                </button>
              </form>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2.5 w-full text-center text-[11px] text-editorial-muted hover:text-accent transition-colors"
              >
                Atau pulihkan dari file cadangan JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => handleImportFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <>
              {/* Identity header */}
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center gap-3">
                {isSignedIn && profile ? (
                  <>
                    <span className="w-9 h-9 shrink-0 rounded-full bg-accent/20 text-accent border border-accent/40 font-editorial font-semibold text-sm flex items-center justify-center">
                      {profileInitials(profile.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-editorial-title truncate">
                        {profile.name}
                      </p>
                      <p className="text-[11px] text-editorial-muted truncate">
                        {ownedCount} dimiliki • {wishlistCount} wishlist
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="w-9 h-9 shrink-0 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-editorial-muted">
                      <User className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-editorial-title">
                        Tamu / Kolektor Lokal
                      </p>
                      <p className="text-[11px] text-editorial-muted leading-snug">
                        Belum masuk • Koleksi tersimpan di browser
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setView('signin')}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-accent text-white text-xs font-medium transition-all active:scale-95"
                    >
                      Masuk
                    </button>
                  </>
                )}
              </div>

              {/* Navigation entries */}
              <div className="py-1.5 space-y-0.5">
                <Link
                  href="/library"
                  onClick={close}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <BookMarked className="w-4 h-4 text-accent shrink-0" />
                  <span className="flex-1 text-[13px] text-editorial-title">
                    Koleksi &amp; Rak Buku
                  </span>
                  {ownedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent font-mono text-[10px] font-semibold">
                      {ownedCount} buku
                    </span>
                  )}
                  {wishlistCount > 0 && (
                    <span className="text-[10px] font-mono text-editorial-muted">
                      {wishlistCount} wishlist
                    </span>
                  )}
                </Link>
                <Link
                  href="/bind-up"
                  onClick={close}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <BookCopy className="w-4 h-4 text-editorial-muted shrink-0" />
                  <span className="flex-1 text-[13px] text-editorial-title">
                    Edisi Bind-Up &amp; Omnibus
                  </span>
                </Link>
              </div>

              {/* Display settings */}
              <div className="pt-2 border-t border-white/[0.06] space-y-3 px-2 pb-1">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint">
                    Mode Tampilan
                  </span>
                  <div className="grid grid-cols-2 p-1 rounded-full bg-surface-sunken border border-white/[0.06] mt-1.5">
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs transition-all ${
                        mounted && theme === 'dark'
                          ? 'bg-white/[0.09] text-editorial-title font-semibold'
                          : 'text-editorial-muted hover:text-editorial-title'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" /> Gelap
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs transition-all ${
                        mounted && theme === 'light'
                          ? 'bg-white/[0.09] text-editorial-title font-semibold'
                          : 'text-editorial-muted hover:text-editorial-title'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" /> Terang
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint">
                      Warna Aksen
                    </span>
                    <span className="font-mono text-[10px] text-editorial-muted">
                      {activeAccentLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 pt-1.5">
                    {ACCENT_THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAccent(t.id)}
                        aria-label={`Warna aksen ${t.label}`}
                        className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center transition-all ${
                          accent === t.id ? 'ring-2 ring-white/80 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: t.color }}
                      >
                        {accent === t.id && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Account footer */}
              <div className="pt-2 mt-1 border-t border-white/[0.06]">
                {isSignedIn ? (
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      close();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Keluar dari Profil
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setView('signin')}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-full text-xs text-editorial-muted hover:bg-white/[0.04] hover:text-editorial-title transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Masuk ke Profil Kolektor
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
