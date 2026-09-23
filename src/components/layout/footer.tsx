import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] bg-background/50 text-editorial-muted py-12 px-4 sm:px-6 lg:px-8 transition-colors mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <span className="font-editorial text-base font-semibold tracking-tight text-editorial-title">
            nuvellite
          </span>
          <span className="hidden sm:inline text-editorial-faint/60">•</span>
          <span className="text-editorial-muted text-xs">
            Arsip &amp; Pelacak Rilis Manga &amp; Light Novel Indonesia
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-editorial-muted">
          <Link href="/?publisher=pub_elex" className="hover:text-editorial-title transition-colors">
            Elex Media
          </Link>
          <Link href="/?publisher=pub_mnc" className="hover:text-editorial-title transition-colors">
            m&amp;c!
          </Link>
          <Link href="/?publisher=pub_pgi" className="hover:text-editorial-title transition-colors">
            Phoenix Gramedia
          </Link>
          <Link href="/calendar" className="hover:text-editorial-title transition-colors">
            Kalender
          </Link>
          <Link href="/series" className="hover:text-editorial-title transition-colors">
            Seri
          </Link>
          <Link href="/library" className="hover:text-editorial-title transition-colors">
            Koleksi
          </Link>
        </div>

        <div className="text-[11px] font-mono text-editorial-faint text-center md:text-right">
          Data sinkronisasi Gramedia Indonesia
        </div>
      </div>
    </footer>
  );
}
