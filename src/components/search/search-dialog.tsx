'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Calendar,
  Layers,
  Radar,
  BookCopy,
  Library,
  Building2,
  Trash2,
} from 'lucide-react';
import { CommandPalette, CommandItem } from '@/components/arc/command-palette/command-palette';
import { getAllBooks, getPublishers } from '@/lib/catalog-service';
import { getUnifiedSeries } from '@/lib/kki-service';
import { formatRupiah } from '@/lib/formatters';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem extends CommandItem {
  href?: string;
  action?: () => void;
  destructive?: boolean;
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const router = useRouter();

  const allSeries = useMemo(() => getUnifiedSeries(), []);
  const allBooks = useMemo(() => getAllBooks(), []);
  const publishers = useMemo(() => getPublishers(), []);

  const items: PaletteItem[] = useMemo(() => {
    const navItems: PaletteItem[] = [
      {
        id: 'nav-katalog',
        label: 'Katalog Rilisan',
        description: 'Daftar semua rilis manga dan novel grafis',
        group: 'Navigasi',
        shortcut: 'G K',
        icon: <BookOpen className="w-4 h-4 text-editorial-muted" />,
        href: '/',
      },
      {
        id: 'nav-kalender',
        label: 'Kalender Terbit',
        description: 'Jadwal rilis mingguan Rabu',
        group: 'Navigasi',
        shortcut: 'G R',
        icon: <Calendar className="w-4 h-4 text-editorial-muted" />,
        href: '/calendar',
      },
      {
        id: 'nav-seri',
        label: 'Direktori Seri',
        description: 'Telusuri koleksi berdasarkan judul seri',
        group: 'Navigasi',
        shortcut: 'G S',
        icon: <Layers className="w-4 h-4 text-editorial-muted" />,
        href: '/series',
      },
      {
        id: 'nav-radar',
        label: 'Radar Pengumuman',
        description: 'Pantau sinyal dan izin terbit komik',
        group: 'Navigasi',
        shortcut: 'G D',
        icon: <Radar className="w-4 h-4 text-editorial-muted" />,
        href: '/radar',
      },
      {
        id: 'nav-bindup',
        label: 'Edisi Bind-Up & Omnibus',
        description: 'Kompilasi volume multi-in-1',
        group: 'Navigasi',
        shortcut: 'G B',
        icon: <BookCopy className="w-4 h-4 text-editorial-muted" />,
        href: '/bind-up',
      },
      {
        id: 'nav-library',
        label: 'Koleksi Saya',
        description: 'Daftar buku dimiliki dan wishlist',
        group: 'Navigasi',
        shortcut: 'G L',
        icon: <Library className="w-4 h-4 text-editorial-muted" />,
        href: '/library',
      },
    ];

    const seriesItems: PaletteItem[] = allSeries.slice(0, 30).map((s) => ({
      id: `series-${s.slug}`,
      label: s.name,
      description: `${s.totalVolumes || 0} volume • ${s.publisherName || 'Komik'}`,
      group: 'Seri Populer',
      href: `/series/${s.slug}`,
      keywords: [s.originalTitle, s.author].filter(Boolean) as string[],
    }));

    const bookItems: PaletteItem[] = allBooks.slice(0, 35).map((b) => ({
      id: `book-${b.slug}`,
      label: b.title,
      description: `${b.publisherShortName || 'Penerbit'} • ${formatRupiah(b.currentPrice)}`,
      group: 'Buku Rilis',
      href: `/books/${b.slug}`,
      keywords: [b.isbn13, b.category, b.seriesName].filter(Boolean) as string[],
    }));

    const pubItems: PaletteItem[] = publishers.map((p) => ({
      id: `pub-${p.slug}`,
      label: p.name,
      description: `${p.shortName} • Penerbit resmi`,
      group: 'Penerbit',
      icon: <Building2 className="w-4 h-4 text-editorial-muted" />,
      href: `/publishers/${p.slug}`,
      keywords: [p.shortName],
    }));

    const actionItems: PaletteItem[] = [
      {
        id: 'action-clear-cache',
        label: 'Reset Filter & Cache Lokal',
        description: 'Bersihkan pengaturan tampilan tersimpan di peramban',
        group: 'Pengaturan',
        destructive: true,
        icon: <Trash2 className="w-4 h-4 text-rose-400" />,
        action: () => {
          if (typeof window !== 'undefined') {
            const confirmed = window.confirm(
              'Reset filter dan cache tampilan? Pengaturan akan kembali ke bawaan.',
            );
            if (confirmed) {
              window.localStorage.removeItem('nuvellite_feed_state');
              window.location.reload();
            }
          }
        },
      },
    ];

    return [...navItems, ...seriesItems, ...bookItems, ...pubItems, ...actionItems];
  }, [allSeries, allBooks, publishers]);

  if (!isOpen) return null;

  const handleSelect = (item: CommandItem) => {
    // Core rule: close the menu first, then act!
    onClose();

    const selected = item as PaletteItem;
    if (selected.destructive && selected.action) {
      setTimeout(() => {
        selected.action?.();
      }, 50);
    } else if (selected.action) {
      selected.action();
    } else if (selected.href) {
      router.push(selected.href);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-16">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl z-10 animate-in zoom-in-95 duration-150">
        <CommandPalette
          items={items}
          placeholder="Cari judul komik, seri, penerbit, atau perintah..."
          onSelect={handleSelect}
          onClose={onClose}
          autoFocus
          label="Pencarian Global Nuvellite"
        />
      </div>
    </div>
  );
}
