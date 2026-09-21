/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [48, 96, 144, 176, 208, 280],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.gramedia.com' },
    ],
  },
};

export default nextConfig;
