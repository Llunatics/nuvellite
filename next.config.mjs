/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
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
      { protocol: 'https', hostname: 'cdn.gramedia.com' },
    ],
  },
};

export default nextConfig;
