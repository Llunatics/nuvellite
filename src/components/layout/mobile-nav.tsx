'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Calendar, Layers, BookMarked } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';
import { useTheme, ACCENT_THEMES } from '@/hooks/use-theme';

export function MobileNav() {
  const pathname = usePathname();
  const { ownedItems, isLoaded } = useCollection();
  const { accent } = useTheme();

  const currentThemeColor = ACCENT_THEMES.find((t) => t.id === accent)?.color || '#E11D48';

  const tabs = [
    { href: '/', label: 'Katalog', icon: BookOpen, active: pathname === '/' },
    { href: '/calendar', label: 'Kalender', icon: Calendar, active: pathname.startsWith('/calendar') },
    { href: '/series', label: 'Seri', icon: Layers, active: pathname.startsWith('/series') },
    {
      href: '/library',
      label: 'Koleksi',
      icon: BookMarked,
      active: pathname.startsWith('/library'),
      badge: isLoaded && ownedItems.length > 0 ? ownedItems.length : undefined,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-4 inset-x-4 max-w-sm mx-auto z-40 liquid-glass-pill rounded-full p-1.5 shadow-2xl border border-white/[0.08] flex items-center justify-between">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-full transition-all duration-200 active:scale-95 ${
              tab.active
                ? 'bg-white/[0.08] text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4 transition-transform" />
              {tab.badge !== undefined && (
                <span
                  className="absolute -top-1 -right-2 min-w-3.5 h-3.5 px-0.5 rounded-full text-white text-[8px] font-mono font-bold flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: currentThemeColor }}
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
