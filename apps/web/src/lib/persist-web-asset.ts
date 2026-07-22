import { api } from '@/lib/api';
import { invalidateAssetsCache } from '@/lib/assets-cache';
import { publishPath } from '@/lib/public-url';
import { persistCourseWebProject } from '@/lib/course-web-project';
import { mergeWebHtml, splitInlineWebParts } from '@/lib/merge-web-html';

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
  parentVersionId?: string | null;
  versionNotes?: string;
}): Promise<{ projectId: string; slug: string; url: string; assetId: string; versionId?: string }> {
  const mergedHtml = mergeWebHtml({ html: opts.html, css: opts.css, js: opts.js });
  const parts = splitInlineWebParts(mergedHtml);
  const { projectId: pid, slug, url, versionId } = await persistCourseWebProject({
    title: opts.title,
    html: parts.html || mergedHtml,
    css: parts.css || opts.css,
    js: parts.js || opts.js,
    prompt: opts.prompt,
    projectId: opts.projectId,
    description: opts.description,
    setAsHomepage: opts.setAsHomepage,
    parentVersionId: opts.parentVersionId,
    notes: opts.versionNotes,
  });

  // content 字段要保存「完整可渲染」的单文件 HTML（内联好 css/js），
  // 这样任何直接读取 asset.content 做预览的地方（如各游戏的 Studio 重新打开）都不会丢样式/脚本。
  const payload = {
    type: 'web' as const,
    title: opts.title,
    summary: opts.summary,
    content: mergedHtml,
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
  invalidateAssetsCache();

  return { projectId: pid, slug, url, assetId, versionId };
}

/** 为已有网页项目补写素材库记录（不新增版本），用于本地上传等场景的历史数据同步 */
export async function createWebProjectAssetRecord(opts: {
  projectId: string;
  title: string;
  html: string;
  css?: string;
  js?: string;
  slug: string;
  url: string;
  summary?: string;
  description?: string;
  meta: Record<string, unknown> & { kind: WebAssetKind };
}): Promise<string> {
  const mergedHtml = mergeWebHtml({ html: opts.html, css: opts.css, js: opts.js });
  const ar = await api.post('/assets', {
    type: 'web' as const,
    title: opts.title,
    summary: opts.summary ?? opts.description,
    content: mergedHtml,
    url: opts.url,
    meta: {
      ...opts.meta,
      projectId: opts.projectId,
      slug: opts.slug,
      linkUrl: opts.url,
    },
  });
  invalidateAssetsCache();
  return ar.data.id as string;
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
