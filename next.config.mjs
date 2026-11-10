/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      // /arsip was merged into the unified /series catalog (2026-10-12)
      { source: '/arsip', destination: '/series', permanent: true },
      { source: '/arsip/:slug', destination: '/series/:slug', permanent: true },
    ];
  },
  images: {
    // NOTE: Vercel's on-demand image optimizer returns HTTP 402 once the
    // Hobby-plan quota is exhausted, which blanked every cover site-wide.
    // Covers are served directly from the origin CDN instead; the
    // CoverImage component adds shimmer + error fallback for the slow
    // origin.
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [48, 96, 144, 176, 208, 280],
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'https', hostname: 'cdn.gramedia.com' },
      { protocol: 'https', hostname: 'image.gramedia.net' },
      { protocol: 'https', hostname: 'www.gramedia.com' },
      { protocol: 'https', hostname: 'media.mncgramedia.id' },
      { protocol: 'https', hostname: 'www.mncgramedia.id' },
      { protocol: 'https', hostname: 'cdn.mangaupdates.com' },
    ],
  },
};

export default nextConfig;
