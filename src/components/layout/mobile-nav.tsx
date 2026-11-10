'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Calendar, Layers, Radar, BookMarked } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';

export function MobileNav() {
  const pathname = usePathname();
  const { ownedItems, isLoaded } = useCollection();

  const tabs = [
    { href: '/', label: 'Katalog', icon: BookOpen, active: pathname === '/' },
    { href: '/calendar', label: 'Kalender', icon: Calendar, active: pathname.startsWith('/calendar') },
    { href: '/series', label: 'Seri', icon: Layers, active: pathname.startsWith('/series') },
    { href: '/radar', label: 'Radar', icon: Radar, active: pathname.startsWith('/radar') },
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
            className={`relative flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-1 rounded-full transition-all duration-200 active:scale-95 ${
              tab.active
                ? 'bg-white/[0.08] text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4 transition-transform" />
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-2 min-w-3.5 h-3.5 px-0.5 rounded-full bg-accent text-zinc-950 text-[8px] font-mono font-bold flex items-center justify-center shadow-xs">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[9.5px] tracking-tight mt-0.5 max-w-full truncate">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
