'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Calendar, Layers, BookMarked } from 'lucide-react';
import { useCollection } from '@/hooks/use-collection';

export function MobileNav() {
  const pathname = usePathname();
  const { ownedItems, isLoaded } = useCollection();

  const tabs = [
    { href: '/', label: 'Katalog', icon: BookOpen, active: pathname === '/' },
    { href: '/calendar', label: 'Radar', icon: Calendar, active: pathname.startsWith('/calendar') },
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
    <nav className="sm:hidden fixed bottom-3 left-3 right-3 z-40 floating-nav rounded-2xl px-1.5 py-1.5 pb-safe flex items-center justify-around shadow-2xl border border-border-subtle">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2.5 rounded-xl transition-all active:scale-95 ${
              tab.active
                ? 'bg-accent/10 border border-accent/25 text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title hover:bg-surface-elevated/40 border border-transparent'
            }`}
          >
            <div className="relative">
              <Icon className={`w-4 h-4 transition-transform ${tab.active ? 'text-accent scale-110' : ''}`} />
              {tab.badge !== undefined && (
                <span className="absolute -top-1 -right-2.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-accent text-white text-[8px] font-mono font-bold flex items-center justify-center shadow-xs">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-tight mt-0.5 ${tab.active ? 'text-editorial-title font-bold' : ''}`}>
              {tab.label}
            </span>
            {tab.active && (
              <span className="w-1 h-1 rounded-full bg-accent mt-0.5 shadow-xs" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
