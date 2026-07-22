import { fetchAssetsList, invalidateAssetsCache } from '@/lib/assets-cache';
import { parseAssetMeta } from '@/lib/asset-tabs';
import { api } from '@/lib/api';
import { publishPath } from '@/lib/public-url';
import { createWebProjectAssetRecord, persistWebAsset } from '@/lib/persist-web-asset';
import { splitInlineWebParts } from '@/lib/merge-web-html';
import { loadWebProjectHead } from '@/lib/web-project-head';

export const UPLOAD_HTML_DESCRIPTION_PREFIX = '本地上传 ·';

const MAX_BYTES = 2 * 1024 * 1024;

/** 从 HTML 或文件名推断网页标题 */
export function inferHtmlTitle(html: string, filename: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const fromTitle = m?.[1]?.replace(/\s+/g, ' ').trim();
  if (fromTitle && fromTitle.length <= 80) return fromTitle;
  const base = filename.replace(/\.(html?|htm)$/i, '').trim();
  return base || '我上传的网页';
}

export function validateUploadedHtml(html: string, byteLength: number): string | null {
  const trimmed = html.trim();
  if (!trimmed) return '文件是空的';
  if (byteLength > MAX_BYTES) return 'HTML 文件不能超过 2MB';
  if (!/<\s*(html|body|div|main|section|head)\b/i.test(trimmed) && !/<!DOCTYPE/i.test(trimmed)) {
    return '这不是有效的 HTML 文件';
  }
  return null;
}

function uploadedWebMeta() {
  return { kind: 'web-page' as const, source: 'local-upload' };
}

/** 上传本地完整 HTML：创建网页项目、发布链接，并写入素材库（供作品集/教师端可见） */
export async function uploadLocalHtmlAsWebProject(
  file: File,
  title?: string,
): Promise<{ projectId: string; slug: string; url: string; title: string; assetId: string }> {
  if (file.size > MAX_BYTES) throw new Error('HTML 文件不能超过 2MB');
  const raw = await file.text();
  const err = validateUploadedHtml(raw, file.size);
  if (err) throw new Error(err);

  const parts = splitInlineWebParts(raw);
  const finalTitle = title?.trim() || inferHtmlTitle(raw, file.name);

  const result = await persistWebAsset({
    title: finalTitle,
    html: parts.html,
    css: parts.css || undefined,
    js: parts.js || undefined,
    summary: '本地上传的完整 HTML 网页',
    description: `${UPLOAD_HTML_DESCRIPTION_PREFIX} 完整 HTML 文件`,
    meta: uploadedWebMeta(),
  });

  return { ...result, title: finalTitle };
}

export function isUploadedHtmlProject(description?: string | null): boolean {
  return typeof description === 'string' && description.startsWith(UPLOAD_HTML_DESCRIPTION_PREFIX);
}

function assetCoversProject(asset: { type?: string; meta?: unknown }, projectId: string): boolean {
  if (asset.type !== 'web') return false;
  const meta = parseAssetMeta(asset.meta);
  return meta?.projectId === projectId;
}

/**
 * 将历史上「只创建了网页项目、未写入素材库」的本地上传记录补同步到素材库。
 * 返回本次新补写的条数。
 */
export async function syncLocalUploadWebProjectsToAssets(): Promise<number> {
  const [projectsRes, assets] = await Promise.all([
    api.get('/web-projects'),
    fetchAssetsList({ all: true }),
  ]);
  const projects = (projectsRes.data || []) as Array<{
    id: string;
    title: string;
    description?: string | null;
    slug?: string | null;
  }>;

  let synced = 0;
  for (const project of projects) {
    if (!isUploadedHtmlProject(project.description)) continue;
    if (assets.some((a) => assetCoversProject(a, project.id))) continue;

    const head = await loadWebProjectHead(project.id);
    if (!head?.headHtml.trim()) continue;

    const slug = head.slug || project.slug;
    if (!slug) continue;

    const parts = splitInlineWebParts(head.headHtml);
    await createWebProjectAssetRecord({
      projectId: project.id,
      title: project.title || head.title || '我上传的网页',
      html: parts.html || head.headHtml,
      css: parts.css || undefined,
      js: parts.js || undefined,
      slug,
      url: publishPath(slug),
      summary: '本地上传的完整 HTML 网页',
      description: project.description ?? undefined,
      meta: uploadedWebMeta(),
    });
    synced += 1;
  }

  if (synced > 0) invalidateAssetsCache();
  return synced;
}
