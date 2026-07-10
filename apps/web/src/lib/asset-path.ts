/** Resolve a /public asset path with optional Next.js basePath (e.g. /aisy in production). */
export function assetPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** Turn a site-relative path into an absolute URL (for API payloads that need full URLs). */
export function absoluteAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const relative = base && normalized.startsWith(base) ? normalized : assetPath(normalized);
  if (typeof window !== 'undefined') return `${window.location.origin}${relative}`;
  return relative;
}
