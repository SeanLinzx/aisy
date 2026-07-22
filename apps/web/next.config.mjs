/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const nextConfig = {
  basePath,
  // Subpath deploy: pages use trailing slashes; skip redirect on /api/* POST to avoid 308 losing body/cookies.
  trailingSlash: Boolean(basePath),
  skipTrailingSlashRedirect: Boolean(basePath),
  reactStrictMode: true,
  images: { unoptimized: true },
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
  // AI 生成（含视频任务提交、网页生成）经 /api 反代到 Nest，需拉长代理超时。
  experimental: {
    proxyTimeout: 420_000,
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
