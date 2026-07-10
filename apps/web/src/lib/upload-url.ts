/** 把 API 返回的 uploads URL 转成当前站点可访问的路径（兼容 /aisy 子路径部署）。 */
export function resolveUploadPath(url: string): string {
  if (!url) return url;

  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

  function normalizePath(pathname: string): string | null {
    if (pathname.startsWith('/uploads/')) return `${basePath}${pathname}`;
    if (basePath && pathname.startsWith(`${basePath}/uploads/`)) return pathname;
    return null;
  }

  if (url.startsWith('/uploads/')) return `${basePath}${url}`;
  if (basePath && url.startsWith(`${basePath}/uploads/`)) return url;

  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const normalized = normalizePath(parsed.pathname);
    if (normalized) return `${normalized}${parsed.search}`;
    // 兼容旧域名 camp.creaite.cn 下的 uploads 路径
    const legacy = parsed.pathname.match(/\/(?:aisy\/)?uploads\/(.+)$/);
    if (legacy) return `${basePath}/uploads/${legacy[1]}${parsed.search}`;
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // ignore
  }

  return url;
}

/** 生成 HTML 嵌入用的绝对 URL（作品集 AI 提示词、发布页 img/video src）。 */
export function resolveEmbedUrl(url: string): string {
  if (!url?.trim()) return '';
  const resolved = resolveUploadPath(url.trim());
  if (/^https?:\/\//i.test(resolved)) return resolved;
  const path = resolved.startsWith('/') ? resolved : `/${resolved}`;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return path;
}
