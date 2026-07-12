/** 把 API 返回的 uploads URL 转成当前站点可访问的路径（兼容 /aisy 子路径部署）。 */
export function resolveUploadPath(url: string): string {
  if (!url) return url;

  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

  function normalizePath(pathname: string): string | null {
    if (pathname.startsWith('/uploads/')) return `${basePath}${pathname}`;
    if (basePath && pathname.startsWith(`${basePath}/uploads/`)) return pathname;
    return null;
  }

  /** 任意域名下的 /uploads/… 都转为当前站点同源路径，避免 Windows/局域网把 localhost:3001 写进素材库后无法播放 */
  function extractUploadsPath(raw: string): string | null {
    const m = raw.match(/\/(?:aisy\/)?uploads\/[^\s?#]+/);
    if (!m) return null;
    return normalizePath(m[0].replace(/^\/aisy/, ''));
  }

  if (url.startsWith('/uploads/')) return `${basePath}${url}`;
  if (basePath && url.startsWith(`${basePath}/uploads/`)) return url;

  const extracted = extractUploadsPath(url);
  if (extracted) return extracted;

  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const normalized = normalizePath(parsed.pathname);
    if (normalized) return `${normalized}${parsed.search}`;
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

/** 视频播放专用：优先同源 /uploads/ 路径，减少 Windows 浏览器跨端口/跨域导致的无法预览 */
export function resolveVideoPlaybackUrl(url: string): string {
  const resolved = resolveUploadPath(url);
  if (/^https?:\/\//i.test(resolved)) return resolved;
  return resolveEmbedUrl(resolved);
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
