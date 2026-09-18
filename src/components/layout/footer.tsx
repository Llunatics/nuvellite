import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface-sunken/60 text-editorial-muted py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-editorial text-sm font-bold text-editorial-title">nuvellite</span>
          <span className="text-editorial-faint">•</span>
          <span>Pelacak Resmi Manga &amp; Light Novel Indonesia</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-editorial-faint">
          <Link href="/publishers/elex" className="hover:text-editorial-title transition-colors">
            Elex Media
          </Link>
          <Link href="/publishers/mnc" className="hover:text-editorial-title transition-colors">
            m&amp;c!
          </Link>
          <Link href="/publishers/pgi" className="hover:text-editorial-title transition-colors">
            Phoenix Gramedia
          </Link>
          <Link href="/calendar" className="hover:text-editorial-title transition-colors">
            Kalender Rilis
          </Link>
          <Link href="/series" className="hover:text-editorial-title transition-colors">
            Daftar Seri
          </Link>
        </div>

        <div className="text-[11px] font-mono text-editorial-faint">
          Data resmi terkurasi • Elex Media, m&amp;c!, Phoenix Gramedia Indonesia
        </div>
      </div>
    </footer>
  );
}
