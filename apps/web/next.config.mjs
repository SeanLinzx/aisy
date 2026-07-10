/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const nextConfig = {
  basePath,
  // Subpath deploy: pages use trailing slashes; skip redirect on /api/* POST to avoid 308 losing body/cookies.
  trailingSlash: Boolean(basePath),
  skipTrailingSlashRedirect: Boolean(basePath),
  reactStrictMode: true,
  images: { unoptimized: true },
  // AI 网页/交互生成经 /api 反代到 Nest，单次常超过默认 30s，需拉长代理超时。
  experimental: {
    proxyTimeout: 180_000,
  },
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN || 'http://localhost:3001';
    return [
      // Proxy API + uploads + publish endpoints to the NestJS backend so
      // browser code only ever talks to the Next.js origin.
      { source: '/api/:path*', destination: `${apiOrigin}/api/:path*` },
      { source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` },
      { source: '/p/:slug', destination: `${apiOrigin}/p/:slug` },
      { source: '/s/:slug', destination: `${apiOrigin}/s/:slug` },
      { source: '/g/:slug', destination: `${apiOrigin}/g/:slug` },
    ];
  },
};
export default nextConfig;
