import React from 'react';
import Link from 'next/link';

const PUBLISHERS = [
  { href: '/?publisher=pub_elex', label: 'Elex Media' },
  { href: '/?publisher=pub_mnc', label: 'm&c!' },
  { href: '/?publisher=pub_pgi', label: 'Phoenix Gramedia' },
];

const NAV = [
  { href: '/calendar', label: 'Kalender' },
  { href: '/series', label: 'Seri' },
  { href: '/library', label: 'Koleksi' },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-background text-editorial-muted mt-auto">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-10 pb-28 sm:pb-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          {/* Brand */}
          <div className="space-y-1.5 text-center lg:text-left">
            <span className="font-editorial text-lg font-semibold tracking-tight text-editorial-title">
              nuvellite
            </span>
            <p className="text-xs leading-relaxed">
              Arsip &amp; pelacak rilis manga &amp; light novel Indonesia
            </p>
          </div>

          {/* Link groups: 2 symmetric groups, never a lone wrapped link.
              Mobile: 3 equal columns per group (no orphan row).
              Desktop: two compact columns, right-aligned. */}
          <div className="grid grid-cols-2 gap-8 sm:gap-12 lg:flex lg:gap-14">
            <nav aria-label="Penerbit" className="space-y-3">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-editorial-faint text-center sm:text-left">
                Penerbit
              </h2>
              <ul className="grid grid-cols-1 gap-2.5 text-center sm:text-left">
                {PUBLISHERS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-editorial-muted hover:text-editorial-title transition-colors whitespace-nowrap"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Navigasi" className="space-y-3">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-editorial-faint text-center sm:text-left">
                Navigasi
              </h2>
              <ul className="grid grid-cols-1 gap-2.5 text-center sm:text-left">
                {NAV.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-editorial-muted hover:text-editorial-title transition-colors whitespace-nowrap"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-5 border-t border-white/[0.04] flex flex-col items-center justify-between gap-1.5 sm:flex-row sm:items-baseline">
          <span className="text-[11px] font-mono text-editorial-faint">
            Data sinkronisasi Gramedia Indonesia
          </span>
          <span className="text-[11px] font-mono text-editorial-faint">
            © {new Date().getFullYear()} nuvellite
          </span>
        </div>
      </div>
    </footer>
  );
}
