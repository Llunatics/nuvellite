'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Calendar, Layers, Radar } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();

  const tabs = [
    { href: '/', label: 'Katalog', icon: BookOpen, active: pathname === '/' },
    { href: '/calendar', label: 'Kalender', icon: Calendar, active: pathname.startsWith('/calendar') },
    { href: '/series', label: 'Seri', icon: Layers, active: pathname.startsWith('/series') || pathname.startsWith('/bind-up') },
    { href: '/radar', label: 'Radar', icon: Radar, active: pathname.startsWith('/radar') },
  ];

  return (
    <nav className="md:hidden fixed bottom-4 inset-x-4 max-w-sm mx-auto z-40 liquid-glass-pill rounded-full p-1.5 shadow-2xl border border-white/[0.08] flex items-center justify-between">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex-1 min-w-0 flex flex-col items-center justify-center py-2 px-2 rounded-full transition-all duration-150 active:scale-95 ${
              tab.active
                ? 'bg-white/[0.09] text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <Icon className="w-4 h-4 transition-transform" />
            <span className="text-[10.5px] font-sans tracking-tight mt-0.5 max-w-full truncate">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
