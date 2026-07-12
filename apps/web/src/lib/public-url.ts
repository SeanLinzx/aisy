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
  return assetPath(`/p/${slug}`);
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
