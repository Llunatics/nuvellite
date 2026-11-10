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

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.active));

  return (
    <>
      <div
        aria-hidden="true"
        className="md:hidden pointer-events-none fixed inset-x-0 bottom-0 z-30 h-20 bg-gradient-to-t from-background via-background/70 to-transparent"
      />
      <nav
        aria-label="Navigasi Bawah"
        className="md:hidden fixed bottom-4 inset-x-5 max-w-[344px] mx-auto z-40 h-[56px] rounded-full p-1 liquid-glass-dock"
      >
        <div className="relative grid grid-cols-4 h-full w-full items-center">
          <span
            aria-hidden="true"
            data-testid="mobile-nav-active-pill"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/4 rounded-full bg-white/[0.07] transition-transform duration-250 ease-out"
            style={{
              transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
            }}
          />
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative z-10 flex flex-col items-center justify-center h-full rounded-full select-none transition-colors duration-200 active:scale-95"
              >
                <Icon
                  className={`w-4 h-4 transition-colors duration-200 ${
                    tab.active ? 'text-accent' : 'text-editorial-muted'
                  }`}
                />
                <span
                  className={`text-[10px] tracking-tight mt-0.5 leading-none ${
                    tab.active ? 'text-editorial-title font-medium' : 'text-editorial-muted font-normal'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
