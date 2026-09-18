import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Newsreader, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Footer } from '@/components/layout/footer';

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const editorialFont = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-editorial',
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'nuvellite — Official Manga & Light Novel Tracker',
  description:
    'Pelacak resmi rilisan Manga dan Light Novel di Indonesia dari penerbit Elex Media Komputindo, m&c!, dan Phoenix Gramedia Indonesia.',
  keywords: [
    'manga indonesia',
    'light novel indonesia',
    'elex media komputindo',
    'm&c! comics',
    'phoenix gramedia indonesia',
    'rabu rilis',
    'komik indonesia',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${sansFont.variable} ${editorialFont.variable} ${monoFont.variable} dark`}>
      <body className="min-h-screen bg-background text-editorial-body selection:bg-gold/20 selection:text-gold flex flex-col">
        <Header />
        <main className="flex-1 pb-20 sm:pb-12">{children}</main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
