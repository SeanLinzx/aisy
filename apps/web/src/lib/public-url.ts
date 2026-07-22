import { assetPath } from '@/lib/asset-path';

/** 浏览器端公开页 URL（供 next/link 使用，勿手写 basePath） */
export function courseHomePath(slug: string) {
  return `/s/${slug}`;
}

export function growthPath(slug: string) {
  return `/g/${slug}`;
}

/** 已发布网页 /p/:slug（供原生 <a>、素材库 url、嵌入 HTML 使用，含 basePath） */
export function publishPath(slug: string) {
  const bare = extractPublishSlug(slug);
  if (!bare) return assetPath('/p/');
  return assetPath(`/p/${bare}`);
}

/**
 * 从 publishPath 结果、/p/:slug、/aisy/p/:slug 或裸 slug 提取发布标识。
 * 修复生产 basePath 下误把完整路径存进 slug 的问题。
 */
export function extractPublishSlug(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const m = new URL(raw).pathname.match(/(?:^|\/)p\/([^/?#]+)$/);
      if (m?.[1]) return decodeURIComponent(m[1]);
    } catch {
      /* ignore */
    }
  }
  const pathMatch = raw.match(/(?:^|\/)p\/([^/?#]+)$/);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
  if (!raw.includes('/')) return raw;
  return null;
}

/** 解析可跳转的发布页 href（含 basePath） */
export function resolvePublishHref(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const slug = extractPublishSlug(raw);
  if (slug) return publishPath(slug);
  if (raw.startsWith('/')) return assetPath(raw);
  return publishPath(raw);
}

export function absoluteUrl(path: string) {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function courseHomeAbsolute(slug: string) {
  return absoluteUrl(courseHomePath(slug));
}

export function growthAbsolute(slug: string) {
  return absoluteUrl(growthPath(slug));
}
