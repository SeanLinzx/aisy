import { injectAiCampRuntime } from '../../common/ai-camp-runtime';
import { ensureDeclarativeAiBridge } from '../../common/declarative-ai-bridge';

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

const FOOTER_STYLE = `
.aic-footer { position:fixed; bottom:8px; right:8px; font-size:12px; color:#666; background:rgba(255,255,255,0.85); padding:4px 8px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.08); z-index:99999; }
.aic-footer a { color:#0ea5e9; text-decoration:none; }
`;

/** 发布页增强：修复消毒后丢失的 onclick、补卡片正面缩略图、图片加载重试 */
const PUBLISHED_PAGE_ENHANCE_STYLE = `
.aic-card-preview { width:100%; max-height:180px; object-fit:cover; border-radius:12px; margin-bottom:12px; display:block; background:#f8fafc; }
.flip-card-back img, .flip-card-back video { max-width:100%; max-height:240px; object-fit:contain; border-radius:12px; }
`;

const PUBLISHED_PAGE_ENHANCE_SCRIPT = `<script>
(function () {
  document.querySelectorAll('.flip-card .btn, .flip-card button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.flip-card');
      if (card) card.classList.toggle('flipped');
      var toast = document.getElementById('toast');
      if (toast) {
        toast.style.display = 'block';
        setTimeout(function () { toast.style.display = 'none'; }, 3000);
      }
    });
  });
  document.querySelectorAll('.flip-card').forEach(function (card) {
    var front = card.querySelector('.flip-card-front');
    if (!front || front.querySelector('.aic-card-preview')) return;
    var backImg = card.querySelector('.flip-card-back img');
    var backVideo = card.querySelector('.flip-card-back video');
    if (backImg && backImg.src) {
      var preview = document.createElement('img');
      preview.className = 'aic-card-preview';
      preview.src = backImg.src;
      preview.alt = backImg.alt || '';
      preview.loading = 'lazy';
      preview.setAttribute('data-retry-src', backImg.src);
      var h3 = front.querySelector('h3');
      if (h3) front.insertBefore(preview, h3);
      else front.appendChild(preview);
    } else if (backVideo && backVideo.src) {
      var v = document.createElement('video');
      v.className = 'aic-card-preview';
      v.src = backVideo.src;
      v.muted = true;
      v.playsInline = true;
      v.preload = 'metadata';
      v.addEventListener('loadedmetadata', function () { if (v.currentTime < 0.05) v.currentTime = 0.1; });
      var h3v = front.querySelector('h3');
      if (h3v) front.insertBefore(v, h3v);
    }
  });
  var MAX_RETRIES = 10, BASE_DELAY = 1500;
  function retryImg(img) {
    var src = img.getAttribute('data-retry-src') || img.getAttribute('src') || '';
    if (!src) return;
    var count = parseInt(img.getAttribute('data-retry-count') || '0', 10);
    if (count >= MAX_RETRIES) return;
    img.setAttribute('data-retry-count', String(count + 1));
    var delay = Math.min(BASE_DELAY * Math.pow(1.4, count), 12000);
    img.style.opacity = '0.45';
    img.style.background = '#f1f5f9';
    setTimeout(function () {
      img.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + '_retry=' + count + '&_t=' + Date.now();
    }, delay);
  }
  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG') retryImg(e.target);
  }, true);
  document.addEventListener('load', function (e) {
    if (e.target && e.target.tagName === 'IMG') {
      e.target.style.opacity = '';
      e.target.style.background = '';
      e.target.removeAttribute('data-retry-count');
    }
  }, true);
  document.querySelectorAll('img[src]').forEach(function (img) {
    if (!img.getAttribute('data-retry-src')) img.setAttribute('data-retry-src', img.src);
  });
})();
<\/script>`;

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
  const footerStyle = `<style>${FOOTER_STYLE}${PUBLISHED_PAGE_ENHANCE_STYLE}</style>`;

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
    doc = doc.replace(/<\/body>/i, `${PUBLISHED_PAGE_ENHANCE_SCRIPT}${footerMarkup(owner)}</body>`);
  } else if (/<\/html>/i.test(doc)) {
    doc = doc.replace(/<\/html>/i, `${PUBLISHED_PAGE_ENHANCE_SCRIPT}${footerMarkup(owner)}</html>`);
  } else {
    doc = `${doc}${PUBLISHED_PAGE_ENHANCE_SCRIPT}${footerMarkup(owner)}`;
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
    const withFooter = injectFooterIntoDocument(merged, title, owner);
    return ensureDeclarativeAiBridge(injectAiCampRuntime(withFooter), { js: parts.js ?? undefined });
  }

  const doc = injectAiCampRuntime(`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)} · AI Camp 作品</title>
<style>${FOOTER_STYLE}${PUBLISHED_PAGE_ENHANCE_STYLE}</style>
</head>
<body>
${merged}
${PUBLISHED_PAGE_ENHANCE_SCRIPT}
${footerMarkup(owner)}
</body></html>`);
  return ensureDeclarativeAiBridge(doc, { js: parts.js ?? undefined });
}

/** @deprecated 请使用 assemblePublishedHtml */
export function wrapPublishedHtml(html: string, title: string, owner: string) {
  return assemblePublishedHtml({ html }, title, owner);
}
