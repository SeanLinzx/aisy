import { api } from '@/lib/api';
import { publishPath } from '@/lib/public-url';
import { persistCourseWebProject } from '@/lib/course-web-project';
import { mergeWebHtml } from '@/lib/merge-web-html';

export type WebAssetKind =
  | 'interaction'
  | 'ux-improvement'
  | 'voice-interaction'
  | 'creation-session'
  | 'portfolio'
  | 'decorate-room'
  | 'memory-match'
  | 'web-page';

/** 发布网页项目并同步写入/更新素材库（type: web） */
export async function persistWebAsset(opts: {
  title: string;
  html: string;
  css?: string;
  js?: string;
  summary?: string;
  prompt?: string;
  description?: string;
  projectId?: string | null;
  assetId?: string | null;
  thumbnailUrl?: string;
  meta: Record<string, unknown> & { kind: WebAssetKind };
  setAsHomepage?: boolean;
}): Promise<{ projectId: string; slug: string; url: string; assetId: string }> {
  const { projectId: pid, slug, url } = await persistCourseWebProject({
    title: opts.title,
    html: opts.html,
    css: opts.css,
    js: opts.js,
    prompt: opts.prompt,
    projectId: opts.projectId,
    description: opts.description,
    setAsHomepage: opts.setAsHomepage,
  });

  // content 字段要保存「完整可渲染」的单文件 HTML（内联好 css/js），
  // 这样任何直接读取 asset.content 做预览的地方（如各游戏的 Studio 重新打开）都不会丢样式/脚本。
  const payload = {
    type: 'web' as const,
    title: opts.title,
    summary: opts.summary,
    content: mergeWebHtml({ html: opts.html, css: opts.css, js: opts.js }),
    url,
    thumbnailUrl: opts.thumbnailUrl,
    meta: {
      ...opts.meta,
      projectId: pid,
      slug,
      linkUrl: url,
    },
  };

  let assetId = opts.assetId ?? null;
  if (assetId) {
    await api.patch(`/assets/${assetId}`, payload);
  } else {
    const ar = await api.post('/assets', payload);
    assetId = ar.data.id as string;
  }

  return { projectId: pid, slug, url, assetId };
}

/** 解析网页素材的可跳转地址 */
export function webAssetHref(asset: {
  url?: string | null;
  meta?: unknown;
}): string | null {
  if (asset.url) {
    const u = asset.url.trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/p/')) return publishPath(u.slice(3));
    return u;
  }
  const meta =
    typeof asset.meta === 'string'
      ? (() => {
          try {
            return JSON.parse(asset.meta);
          } catch {
            return null;
          }
        })()
      : asset.meta;
  if (meta && typeof meta === 'object' && typeof (meta as { slug?: string }).slug === 'string') {
    return publishPath((meta as { slug: string }).slug);
  }
  return null;
}

/** 插入到 HTML 中的网页跳转卡片片段 */
export function webLinkSnippet(title: string, href: string): string {
  const safeTitle = title.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
  const safeHref = href.replace(/"/g, '&quot;');
  return `<a href="${safeHref}" target="_blank" rel="noopener" style="display:block;margin:16px 0;padding:16px 20px;background:linear-gradient(135deg,#ede9fe,#fce7f3);border-radius:16px;text-decoration:none;color:#5b21b6;font-weight:700;box-shadow:0 8px 20px rgba(0,0,0,.06)">🔗 ${safeTitle} <span style="font-weight:500;font-size:14px;color:#7c3aed">— 点击查看</span></a>`;
}
