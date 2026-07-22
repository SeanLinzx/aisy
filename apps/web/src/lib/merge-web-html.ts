import { injectAiCampRuntime, ensureDeclarativeAiBridge } from '@ai-camp/types';

/** 将 AI 返回的 html / css / js 合并为单文件 HTML（与预览、发布端逻辑一致） */
export function mergeWebHtml(data: { html?: string; css?: string; js?: string }): string {
  let out = (data.html || '').trim();
  const css = data.css?.trim();
  const js = data.js?.trim();
  const isDoc = /<!DOCTYPE/i.test(out) || /<\s*html[\s>]/i.test(out);

  if (css) {
    const block = `<style>${css}</style>`;
    if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `${block}</head>`);
    else if (isDoc) out = out.replace(/<html([^>]*)>/i, `<html$1><head><meta charset="utf-8" />${block}</head>`);
    else out = `${block}${out}`;
  }

  if (js) {
    const block = `<script>${js}<\/script>`;
    if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${block}</body>`);
    else out = `${out}${block}`;
  }

  if (!isDoc && (css || js || out)) {
    out = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" /></head><body>${out}</body></html>`;
  }

  out = injectAiCampRuntime(out);
  return ensureDeclarativeAiBridge(out, { js });
}

/** 从单文件 HTML 中拆出内联 style / script，便于写入 web-projects 的 css、js 字段（发布页会重新注入脚本）。 */
export function splitInlineWebParts(html: string): { html: string; css: string; js: string } {
  let out = html || '';
  const scripts: string[] = [];
  const styles: string[] = [];

  out = out.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs: string, body: string) => {
    if (/\bsrc\s*=/.test(attrs)) return match;
    if (/\bdata-ai-camp-runtime\b/.test(attrs)) return match;
    if (/\bdata-ai-camp-upload\b/.test(attrs)) return match;
    if (/\bdata-pm-ai-decl-bridge\b/.test(attrs)) return match;
    if (/\bdata-pm-ai-bridge\b/.test(attrs)) return match;
    const trimmed = body.trim();
    if (trimmed) scripts.push(trimmed);
    return '';
  });

  out = out.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, body: string) => {
    const trimmed = body.trim();
    if (trimmed) styles.push(trimmed);
    return '';
  });

  return {
    html: out.trim(),
    css: styles.join('\n\n'),
    js: scripts.join('\n\n'),
  };
}
