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
  variable: '--font-editorial',
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

// Applies the saved mode/accent before first paint (Round 3 dual-mode):
// dark is the default; a saved light mode or non-default accent must not
// flash the wrong palette on load.
const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem('nuvellite_theme');if(m==='light'){document.documentElement.classList.add('light');}var a=localStorage.getItem('nuvellite_theme_accent');if(a){document.documentElement.setAttribute('data-accent',a);}}catch(e){}})();`;

export const metadata: Metadata = {
  title: 'nuvellite — Official Manga & Light Novel Tracker',
  description:
    'Pelacak rilisan Manga dan Light Novel di Indonesia dari penerbit Elex Media Komputindo, m&c!, dan Phoenix Gramedia Indonesia.',
  keywords: [
    'manga indonesia',
    'light novel indonesia',
    'elex media komputindo',
    'm&c! comics',
    'phoenix gramedia indonesia',
    'rabu rilis',
    'komik indonesia',
  ],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${sansFont.variable} ${editorialFont.variable} ${monoFont.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background text-editorial-body selection:bg-accent/20 selection:text-accent flex flex-col">
        <Header />
        <main className="flex-1 pb-32 md:pb-20">{children}</main>
        <Footer />
        <MobileNav />
      </body>
    </html>
  );
}
