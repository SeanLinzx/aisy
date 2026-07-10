export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

const FOOTER_STYLE = `
.aic-footer { position:fixed; bottom:8px; right:8px; font-size:12px; color:#666; background:rgba(255,255,255,0.85); padding:4px 8px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.08); z-index:99999; }
.aic-footer a { color:#0ea5e9; text-decoration:none; }
`;

export function isCompleteHtmlDocument(html: string): boolean {
  return /<!DOCTYPE/i.test(html) || /<\s*html[\s>]/i.test(html);
}

/** 将分段的 html / css / js 合并为可运行的文档片段或完整 HTML */
export function mergeWebParts(html: string, css?: string | null, js?: string | null): string {
  let out = (html || '').trim();
  const cssBlock = css?.trim() ? `<style>${css.trim()}</style>` : '';
  const jsBlock = js?.trim() ? `<script>${js.trim()}<\/script>` : '';
  if (!cssBlock && !jsBlock) return out;

  if (cssBlock) {
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `${cssBlock}</head>`);
    } else if (isCompleteHtmlDocument(out)) {
      out = out.replace(/<html([^>]*)>/i, `<html$1><head><meta charset="utf-8" />${cssBlock}</head>`);
    } else {
      out = `${cssBlock}${out}`;
    }
  }

  if (jsBlock) {
    if (/<\/body>/i.test(out)) {
      out = out.replace(/<\/body>/i, `${jsBlock}</body>`);
    } else if (isCompleteHtmlDocument(out)) {
      out = `${out}${jsBlock}`;
    } else {
      out = `${out}${jsBlock}`;
    }
  }

  return out;
}

function footerMarkup(owner: string) {
  return `<div class="aic-footer">由 ${escapeHtml(owner)} 创作 · <a href="/" target="_blank">AI Camp</a></div>`;
}

function injectFooterIntoDocument(html: string, title: string, owner: string): string {
  let doc = html;
  const footerStyle = `<style>${FOOTER_STYLE}</style>`;

  if (/<\/head>/i.test(doc)) {
    doc = doc.replace(/<\/head>/i, `${footerStyle}</head>`);
  } else if (/<head[\s>]/i.test(doc)) {
    doc = doc.replace(/<head([^>]*)>/i, `<head$1>${footerStyle}`);
  } else if (/<body[\s>]/i.test(doc)) {
    doc = doc.replace(/<body([^>]*)>/i, `<head><meta charset="utf-8" />${footerStyle}</head><body$1>`);
  } else {
    doc = `${footerStyle}${doc}`;
  }

  if (/<\/body>/i.test(doc)) {
    doc = doc.replace(/<\/body>/i, `${footerMarkup(owner)}</body>`);
  } else if (/<\/html>/i.test(doc)) {
    doc = doc.replace(/<\/html>/i, `${footerMarkup(owner)}</html>`);
  } else {
    doc = `${doc}${footerMarkup(owner)}`;
  }

  if (title && !/<title[\s>]/i.test(doc) && /<\/head>/i.test(doc)) {
    doc = doc.replace(/<\/head>/i, `<title>${escapeHtml(title)} · AI Camp 作品</title></head>`);
  }

  return doc;
}

export interface PublishedVersionParts {
  html?: string | null;
  css?: string | null;
  js?: string | null;
}

/**
 * 组装发布页 HTML：合并 css/js，完整文档不再套双层 shell（避免样式失效）。
 */
export function assemblePublishedHtml(parts: PublishedVersionParts, title: string, owner: string): string {
  const merged = mergeWebParts(parts.html || '', parts.css, parts.js);

  if (isCompleteHtmlDocument(merged)) {
    return injectFooterIntoDocument(merged, title, owner);
  }

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)} · AI Camp 作品</title>
<style>${FOOTER_STYLE}</style>
</head>
<body>
${merged}
${footerMarkup(owner)}
</body></html>`;
}

/** @deprecated 请使用 assemblePublishedHtml */
export function wrapPublishedHtml(html: string, title: string, owner: string) {
  return assemblePublishedHtml({ html }, title, owner);
}
