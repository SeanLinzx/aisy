/** 浏览器端公开页 URL */
export function courseHomePath(slug: string) {
  return `/s/${slug}`;
}

export function growthPath(slug: string) {
  return `/g/${slug}`;
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
