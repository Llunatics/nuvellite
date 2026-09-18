'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Calendar, Layers, BookMarked, Compass } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';

export function MobileNav() {
  const pathname = usePathname();
  const { ownedItems, isLoaded } = useCollection();

  const tabs = [
    { href: '/', label: 'Katalog', icon: BookOpen, active: pathname === '/' },
    { href: '/calendar', label: 'Kalender', icon: Calendar, active: pathname.startsWith('/calendar') },
    { href: '/series', label: 'Seri', icon: Layers, active: pathname.startsWith('/series') },
    { href: '/publishers', label: 'Penerbit', icon: Compass, active: pathname.startsWith('/publishers') },
    {
      href: '/library',
      label: 'Koleksi',
      icon: BookMarked,
      active: pathname.startsWith('/library'),
      badge: isLoaded && ownedItems.length > 0 ? ownedItems.length : undefined,
    },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border-subtle px-3 py-1.5 pb-safe flex items-center justify-around shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all active:scale-95 ${
              tab.active
                ? 'text-accent font-semibold'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4" />
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-2.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-accent text-white text-[8px] font-mono font-bold flex items-center justify-center shadow-xs">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-1">{tab.label}</span>
            {tab.active && (
              <span className="w-1 h-1 rounded-full bg-accent mt-0.5" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
