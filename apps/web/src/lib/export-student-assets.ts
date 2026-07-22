import JSZip from 'jszip';
import { resolveUploadPath } from '@/lib/upload-url';
import { parseAssetMeta } from '@/lib/asset-tabs';
import { isHtmlLike, plainTextPreview } from '@/lib/plain-text';

export interface ExportAssetItem {
  id: string;
  type: string;
  title?: string;
  summary?: string;
  content?: string;
  url?: string;
  meta?: unknown;
  owner?: { displayName?: string; username?: string };
  job?: { prompt?: string | null } | null;
}

export interface BatchExportOptions {
  showStudent: boolean;
  showPrompt: boolean;
}

const IMAGE_TYPES = new Set(['image', 'poster', 'mixed']);
const DOWNLOADABLE_TYPES = new Set(['image', 'poster', 'mixed', 'video']);

export function isBatchDownloadable(asset: ExportAssetItem): boolean {
  return DOWNLOADABLE_TYPES.has(asset.type) && !!asset.url;
}

function safeName(s: string): string {
  return (s || 'untitled').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
}

function idSuffix(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || id.slice(0, 8);
}

function uniqueZipName(used: Set<string>, base: string, ext: string): string {
  let name = `${base}.${ext}`;
  let n = 2;
  while (used.has(name)) {
    name = `${base}_${n}.${ext}`;
    n += 1;
  }
  used.add(name);
  return name;
}

/** 从素材 meta / 关联任务 / 摘要等字段提取展示用提示词 */
export function assetPrompt(asset: ExportAssetItem): string {
  const meta = parseAssetMeta(asset.meta);
  const candidates: unknown[] = [
    meta?.prompt,
    meta?.originalPrompt,
    meta?.caption,
    meta?.userPrompt,
    asset.job?.prompt,
    asset.summary,
    asset.content,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() && !isHtmlLike(c)) return c.trim();
  }

  const items = meta?.items;
  if (Array.isArray(items) && asset.title) {
    const pageMatch = asset.title.match(/第\s*(\d+)\s*页/);
    if (pageMatch) {
      const idx = Number(pageMatch[1]) - 1;
      const item = items[idx] as { prompt?: string } | undefined;
      if (typeof item?.prompt === 'string' && item.prompt.trim() && !isHtmlLike(item.prompt)) {
        return item.prompt.trim();
      }
    }
  }

  return '';
}

/** 展示用提示词（已过滤 HTML 源码） */
export function assetPromptPlain(asset: ExportAssetItem, maxLen = 500): string {
  return plainTextPreview(assetPrompt(asset), maxLen);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const external =
      typeof window !== 'undefined' &&
      src.startsWith('http') &&
      !src.startsWith(window.location.origin);
    if (external) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`图片加载失败: ${src}`));
    img.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function annotateImageBlob(
  imageUrl: string,
  opts: { studentName?: string; prompt?: string },
): Promise<Blob> {
  const img = await loadImage(imageUrl);
  const maxW = Math.min(img.naturalWidth || img.width, 1920);
  const scale = maxW / (img.naturalWidth || img.width || 1);
  const imgW = Math.round((img.naturalWidth || img.width) * scale);
  const imgH = Math.round((img.naturalHeight || img.height) * scale);

  const captionLines: string[] = [];
  if (opts.studentName) captionLines.push(`学生：${opts.studentName}`);
  if (opts.prompt) {
    const canvasMeasure = document.createElement('canvas');
    const mctx = canvasMeasure.getContext('2d')!;
    mctx.font = 'bold 18px system-ui, sans-serif';
    const wrapped = wrapLines(mctx, `提示词：${opts.prompt}`, imgW - 32);
    captionLines.push(...wrapped);
  }

  const lineH = 26;
  const pad = 16;
  const footerH = captionLines.length ? pad * 2 + captionLines.length * lineH : 0;

  const canvas = document.createElement('canvas');
  canvas.width = imgW;
  canvas.height = imgH + footerH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, imgW, imgH);

  if (footerH > 0) {
    ctx.fillStyle = '#fff7ed';
    ctx.fillRect(0, imgH, imgW, footerH);
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, imgH);
    ctx.lineTo(imgW, imgH);
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    let y = imgH + pad + 18;
    for (const line of captionLines) {
      ctx.fillText(line, pad, y);
      y += lineH;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出图片失败'))), 'image/png');
  });
}

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 (${res.status})`);
  return res.blob();
}

function extFromUrl(url: string, fallback: string): string {
  const m = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return m ? m[1].toLowerCase() : fallback;
}

function buildSidecarText(asset: ExportAssetItem, opts: BatchExportOptions): string {
  const lines: string[] = [`标题：${asset.title || ''}`];
  if (opts.showStudent) {
    lines.push(`学生：${asset.owner?.displayName || '未知'} (@${asset.owner?.username || ''})`);
  }
  if (opts.showPrompt) {
    const p = assetPrompt(asset);
    if (p) lines.push(`提示词：${p}`);
  }
  return lines.join('\n');
}

/** 批量打包下载学生素材（图片可叠加标注，视频附带说明文本） */
export async function batchDownloadStudentAssets(
  assets: ExportAssetItem[],
  opts: BatchExportOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('学生素材')!;
  const annotate = opts.showStudent || opts.showPrompt;
  let done = 0;
  const usedNames = new Set<string>();

  for (const asset of assets) {
    if (!isBatchDownloadable(asset)) continue;
    const base = `${safeName(asset.owner?.displayName || '学生')}_${safeName(asset.title || '素材')}_${idSuffix(asset.id)}`;
    const src = resolveUploadPath(asset.url!);
    const promptText = assetPrompt(asset);

    try {
      if (IMAGE_TYPES.has(asset.type)) {
        let blob: Blob;
        if (annotate) {
          blob = await annotateImageBlob(src, {
            studentName: opts.showStudent ? (asset.owner?.displayName || '未知') : undefined,
            prompt: opts.showPrompt ? promptText || undefined : undefined,
          });
          folder.file(uniqueZipName(usedNames, base, 'png'), blob);
        } else {
          blob = await fetchBlob(src);
          const ext = extFromUrl(src, 'png');
          folder.file(uniqueZipName(usedNames, base, ext), blob);
        }
      } else if (asset.type === 'video') {
        const blob = await fetchBlob(src);
        const ext = extFromUrl(src, 'mp4');
        folder.file(uniqueZipName(usedNames, base, ext), blob);
        if (annotate) {
          folder.file(uniqueZipName(usedNames, `${base}_说明`, 'txt'), buildSidecarText(asset, opts));
        }
      }
    } catch (e) {
      console.warn('skip asset', asset.id, e);
      folder.file(uniqueZipName(usedNames, `${base}_错误`, 'txt'), `导出失败：${(e as Error).message}`);
    }

    done++;
    onProgress?.(done, assets.length);
  }

  const out = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(out);
  a.download = `学生素材批量下载_${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}
