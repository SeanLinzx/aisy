'use strict';

/** @typedef {{ id: string; type: string; title: string; url?: string; thumbnailUrl?: string; content?: string; summary?: string; meta?: unknown }} PortfolioAsset */

/** @typedef {{ resolveEmbedUrl: (url: string) => string; resolveWebAssetUrl: (url: string) => string }} PortfolioUrlContext */

const PORTFOLIO_TYPE_SECTIONS = [
  { key: 'image', types: ['image', 'poster'], title: 'AI 创意绘画', emoji: '🎨' },
  { key: 'text', types: ['text', 'ppt', 'mixed'], title: '文字与图文作品', emoji: '📝' },
  { key: 'video', types: ['video'], title: 'AI 视频作品', emoji: '🎬' },
  { key: 'audio', types: ['audio'], title: '音乐与声音作品', emoji: '🎵' },
  { key: 'web', types: ['web', 'code'], title: '互动网页与小游戏', emoji: '🌐' },
];

const TYPE_LAYOUT_OPTION = '按作品类型（图片/文字/视频/音频/网页）分类';

const COVER_NAV_KEYWORDS = [
  { key: 'image', patterns: ['创意绘画', '绘画', '图片', 'image', 'poster'] },
  { key: 'text', patterns: ['文字作品', '文字与图文', '图文', '文字', 'ppt'] },
  { key: 'video', patterns: ['视频作品', '视频', 'video'] },
  { key: 'audio', patterns: ['音乐', '声音', '音频', 'audio'] },
  { key: 'web', patterns: ['互动游戏', '互动网页', '小游戏', '网页', 'web', 'code'] },
];

const HOME_KEYWORDS = ['回首页', '返回首页', '回到首页', '首页', 'back to home', 'home'];

const INJECTED_PORTFOLIO_CSS = `
#portfolio-works-root,.ai-camp-pf-works{
  margin:28px auto;max-width:1100px;padding:0 16px 32px;
  font-family:system-ui,-apple-system,"PingFang SC","Segoe UI",sans-serif;
  overflow:visible!important;min-height:0!important;max-height:none!important;
  transform:none!important;pointer-events:auto;
}
#portfolio-works-root .ai-camp-pf-section,#portfolio-works-root .ai-camp-pf-grid{
  overflow:visible!important;transform:none!important;
}
#portfolio-works-root .flip-card,#portfolio-works-root .flip-card-front,#portfolio-works-root .flip-card-back{
  transform:none!important;perspective:none!important;
}
#portfolio-works-root h2,.ai-camp-pf-works h2{font-size:1.35rem;margin:28px 0 14px;color:#1e293b;scroll-margin-top:72px}
#portfolio-works-root h2:first-of-type,.ai-camp-pf-works h2:first-of-type{margin-top:0}
.ai-camp-pf-nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px;padding:0;list-style:none}
.ai-camp-pf-nav a{
  display:inline-block;padding:6px 12px;border-radius:999px;
  background:#f1f5f9;color:#334155;text-decoration:none;font-size:.85rem;font-weight:600;
  border:1px solid #e2e8f0;transition:background .15s ease;
}
.ai-camp-pf-nav a:hover{background:#e0f2fe;color:#0369a1}
.ai-camp-pf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
.ai-camp-pf-card[data-pf-card="1"]{
  background:#fff;border-radius:18px;padding:12px;
  box-shadow:0 8px 24px rgba(15,23,42,.08);border:2px solid #e2e8f0;overflow:hidden;
  transition:transform .18s ease,box-shadow .18s ease;
  transform:none;
}
.ai-camp-pf-card[data-pf-card="1"]:hover{
  transform:translateY(-3px) scale(1.02)!important;
  box-shadow:0 14px 32px rgba(15,23,42,.12);
}
.ai-camp-pf-card img,.ai-camp-pf-card video{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;display:block;background:#f1f5f9}
.ai-camp-pf-card h3{margin:10px 0 4px;font-size:1rem;color:#0f172a}
.ai-camp-pf-card p{margin:0;font-size:.85rem;color:#64748b;line-height:1.4}
.ai-camp-pf-card audio{width:100%;margin-top:8px}
.ai-camp-pf-placeholder{height:140px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;background:linear-gradient(135deg,#ecfdf5,#e0f2fe)}
.ai-camp-pf-web a{text-decoration:none;color:inherit;display:block}
.ai-camp-pf-meta{font-size:.85rem;color:#64748b;margin:0 0 12px}
#portfolio-top{scroll-margin-top:0}
`;

function parseMeta(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function escapeHtmlText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isTypeClassificationLayout(cardLayout) {
  const t = String(cardLayout || '').trim();
  if (!t) return false;
  if (t.includes('按作品类型') || t.includes('按类型')) return true;
  if (/classif(y|ied).*type/i.test(t) || /by\s*type/i.test(t)) return true;
  return false;
}

function groupPortfolioAssetsByType(chosen) {
  return PORTFOLIO_TYPE_SECTIONS.map((section) => ({
    ...section,
    items: chosen.filter((a) => section.types.includes(a.type)),
  })).filter((s) => s.items.length > 0);
}

/** @param {string} [basePath] e.g. /aisy */
function createDefaultUrlContext(basePath) {
  const bp = (basePath || process.env.WEB_BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const origin = (process.env.WEB_ORIGIN || process.env.PUBLIC_UPLOAD_BASE || '').replace(/\/uploads.*$/, '').replace(/\/$/, '');

  function resolveUploadPath(url) {
    if (!url) return url;
    const raw = url.trim();
    const m = raw.match(/\/(?:aisy\/)?uploads\/[^\s?#]+/);
    if (m) return `${bp}${m[0].replace(/^\/aisy/, '')}`;
    if (raw.startsWith('/uploads/')) return `${bp}${raw}`;
    if (bp && raw.startsWith(`${bp}/uploads/`)) return raw;
    return raw;
  }

  function resolveEmbedUrl(url) {
    if (!url?.trim()) return '';
    const resolved = resolveUploadPath(url.trim());
    if (/^https?:\/\//i.test(resolved)) return resolved;
    const path = resolved.startsWith('/') ? resolved : `/${resolved}`;
    if (origin && !path.startsWith('http')) return `${origin}${path.startsWith(bp) ? path : bp + path}`;
    return path;
  }

  function resolveWebAssetUrl(url) {
    if (!url?.trim()) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return resolveEmbedUrl(url.startsWith('/') ? url : `/${url}`);
  }

  return { resolveEmbedUrl, resolveWebAssetUrl, basePath: bp };
}

function pickMediaUrl(asset, ctx) {
  const meta = parseMeta(asset.meta);
  const candidates = [
    asset.url,
    asset.thumbnailUrl,
    ...(Array.isArray(meta.allUrls) ? meta.allUrls : []),
    ...(Array.isArray(meta.sourceUrls) ? meta.sourceUrls : []),
  ].filter((u) => typeof u === 'string' && u.trim().length > 0);
  return candidates[0] ? ctx.resolveEmbedUrl(candidates[0]) : '';
}

function pickReferenceImage(asset, ctx) {
  const meta = parseMeta(asset.meta);
  const refs = meta.references;
  const refUrl = Array.isArray(refs) ? refs.find((r) => r && r.type === 'image' && r.url)?.url : undefined;
  return refUrl ? ctx.resolveEmbedUrl(refUrl) : '';
}

function buildInjectedCardHtml(a, ctx) {
  const title = escapeHtmlText(a.title || '未命名作品');
  const summary = escapeHtmlText((a.summary || '').trim().slice(0, 120));
  const mediaUrl = pickMediaUrl(a, ctx);
  const idAttr = escapeHtmlText(a.id);

  if (a.type === 'image' || a.type === 'poster') {
    const src = escapeHtmlText(mediaUrl || '');
    return `<article class="ai-camp-pf-card" data-pf-card="1" data-asset-id="${idAttr}" data-asset-type="${a.type}">
  ${src ? `<img src="${src}" alt="${title}" loading="lazy" />` : `<div class="ai-camp-pf-placeholder">🖼️</div>`}
  <h3>${title}</h3>
  ${summary ? `<p>${summary}</p>` : ''}
</article>`;
  }
  if (a.type === 'video') {
    const src = escapeHtmlText(mediaUrl || '');
    return `<article class="ai-camp-pf-card" data-pf-card="1" data-asset-id="${idAttr}" data-asset-type="video">
  ${src ? `<video controls playsinline src="${src}"></video>` : `<div class="ai-camp-pf-placeholder">🎬</div>`}
  <h3>${title}</h3>
</article>`;
  }
  if (a.type === 'audio') {
    const src = escapeHtmlText(mediaUrl || '');
    return `<article class="ai-camp-pf-card" data-pf-card="1" data-asset-id="${idAttr}" data-asset-type="audio">
  <div class="ai-camp-pf-placeholder">🎵</div>
  <h3>${title}</h3>
  ${src ? `<audio controls src="${src}"></audio>` : ''}
</article>`;
  }
  if (a.type === 'web' || a.type === 'code') {
    const href = escapeHtmlText(a.url ? ctx.resolveWebAssetUrl(a.url) : '#');
    return `<article class="ai-camp-pf-card ai-camp-pf-web" data-pf-card="1" data-asset-id="${idAttr}" data-asset-type="${a.type}">
  <a href="${href}" target="_blank" rel="noopener noreferrer">
    <div class="ai-camp-pf-placeholder">🌐</div>
    <h3>${title}</h3>
    <p>点击打开互动网页</p>
  </a>
</article>`;
  }
  if (a.type === 'mixed') {
    const imageUrl = pickReferenceImage(a, ctx) || mediaUrl;
    const src = escapeHtmlText(imageUrl || '');
    const body = escapeHtmlText((a.content || a.summary || '').trim().slice(0, 280));
    return `<article class="ai-camp-pf-card" data-pf-card="1" data-asset-id="${idAttr}" data-asset-type="mixed">
  ${src ? `<img src="${src}" alt="${title}" loading="lazy" />` : ''}
  <h3>${title}</h3>
  ${body ? `<p>${body}</p>` : ''}
</article>`;
  }
  const body = escapeHtmlText((a.content || a.summary || '').trim().slice(0, 400));
  return `<article class="ai-camp-pf-card" data-pf-card="1" data-asset-id="${idAttr}" data-asset-type="${escapeHtmlText(a.type)}">
  <h3>${title}</h3>
  ${body ? `<p>${body}</p>` : ''}
</article>`;
}

function buildPortfolioWorksInnerHtml(chosen, cardLayout, ctx) {
  if (!chosen.length) {
    return `<p class="ai-camp-pf-meta">还没有选中作品。</p>`;
  }
  const byType = isTypeClassificationLayout(cardLayout || TYPE_LAYOUT_OPTION);
  const meta = `<p class="ai-camp-pf-meta">共 ${chosen.length} 件作品${
    byType
      ? ` · 已按类型分成 ${groupPortfolioAssetsByType(chosen).length} 个分区（图片/文字/视频/音频/网页都会显示）`
      : ''
  }</p>`;

  if (!byType) {
    return `${meta}<div class="ai-camp-pf-grid">${chosen.map((a) => buildInjectedCardHtml(a, ctx)).join('\n')}</div>`;
  }

  const sections = groupPortfolioAssetsByType(chosen);
  const knownTypes = new Set(PORTFOLIO_TYPE_SECTIONS.flatMap((s) => [...s.types]));
  const leftovers = chosen.filter((a) => !knownTypes.has(a.type));
  const blocks = [meta];

  const navItems = sections.map(
    (s) => `<a href="#pf-section-${s.key}">${s.emoji} ${escapeHtmlText(s.title)} (${s.items.length})</a>`,
  );
  if (leftovers.length > 0) {
    navItems.push(`<a href="#pf-section-other">📦 其他作品 (${leftovers.length})</a>`);
  }
  if (navItems.length > 1) {
    blocks.push(`<nav class="ai-camp-pf-nav" aria-label="作品分区">${navItems.join('')}</nav>`);
  }

  for (const section of sections) {
    blocks.push(`<section class="ai-camp-pf-section" id="pf-section-${section.key}" data-portfolio-section="${section.key}">
  <h2>${section.emoji} ${escapeHtmlText(section.title)} <span style="font-size:.9rem;font-weight:600;color:#64748b">（${section.items.length}）</span></h2>
  <div class="ai-camp-pf-grid">
    ${section.items.map((a) => buildInjectedCardHtml(a, ctx)).join('\n    ')}
  </div>
</section>`);
  }
  if (leftovers.length > 0) {
    blocks.push(`<section class="ai-camp-pf-section" id="pf-section-other" data-portfolio-section="other">
  <h2>📦 其他作品 <span style="font-size:.9rem;font-weight:600;color:#64748b">（${leftovers.length}）</span></h2>
  <div class="ai-camp-pf-grid">${leftovers.map((a) => buildInjectedCardHtml(a, ctx)).join('\n')}</div>
</section>`);
  }
  return blocks.join('\n');
}

function replaceElementById(html, id, replacement) {
  const re = new RegExp(`<(div|section)\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i');
  const m = re.exec(html);
  if (!m || m.index === undefined) return null;
  const tag = m[1].toLowerCase();
  const start = m.index;
  const openEnd = start + m[0].length;
  const lower = html.toLowerCase();
  const openTok = `<${tag}`;
  const closeTok = `</${tag}>`;
  let depth = 1;
  let i = openEnd;
  while (i < html.length && depth > 0) {
    const nextOpen = lower.indexOf(openTok, i);
    const nextClose = lower.indexOf(closeTok, i);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const after = lower[nextOpen + openTok.length];
      if (after === ' ' || after === '>' || after === '\n' || after === '\t' || after === '/') {
        depth += 1;
      }
      i = nextOpen + openTok.length;
    } else {
      depth -= 1;
      if (depth === 0) {
        return html.slice(0, start) + replacement + html.slice(nextClose + closeTok.length);
      }
      i = nextClose + closeTok.length;
    }
  }
  return null;
}

function stripShellWorksContainerClasses(html) {
  return html.replace(
    /(<(?:div|section|main|article)\b[^>]*\bid=["']portfolio-works-root["'][^>]*\bclass=["'])([^"']*)(["'])/gi,
    (_, open, classes, close) => {
      const cleaned = classes
        .split(/\s+/)
        .filter(
          (c) =>
            c &&
            !/^flip-card(-front|-back)?$/i.test(c) &&
            !/^card$/i.test(c) &&
            !/^work-card$/i.test(c),
        )
        .join(' ');
      return `${open}${cleaned}${close}`;
    },
  );
}

function applyDeterministicPortfolioWorks(html, chosen, cardLayout, urlCtx) {
  if (!chosen.length) return html;
  const ctx = urlCtx || createDefaultUrlContext();

  const inner = buildPortfolioWorksInnerHtml(chosen, cardLayout, ctx);
  const styleTag = `<style data-ai-camp-portfolio-inject>${INJECTED_PORTFOLIO_CSS}</style>`;
  const block = `<div id="portfolio-works-root" class="ai-camp-pf-works" data-ai-camp-portfolio-works="1">${inner}</div>`;

  const scripts = [];
  let out = stripShellWorksContainerClasses(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => {
    const key = `<!--PORTFOLIO_KEEP_SCRIPT_${scripts.length}-->`;
    scripts.push(m);
    return key;
  });

  out = out.replace(/<style[^>]*data-ai-camp-portfolio-inject[\s\S]*?<\/style>/gi, '');
  out = out.replace(
    /<div[^>]*(?:data-ai-camp-portfolio-missing-fix|class=["'][^"']*ai-camp-pf-inject)[^>]*>[\s\S]*?<\/div>/gi,
    '',
  );

  const replaced = replaceElementById(out, 'portfolio-works-root', block);
  if (replaced) {
    out = replaced;
  } else if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `${block}\n</body>`);
  } else {
    out = `${out}\n${block}`;
  }

  if (!/data-ai-camp-portfolio-inject/i.test(out)) {
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `${styleTag}</head>`);
    } else if (/<\/body>/i.test(out)) {
      out = out.replace(/<\/body>/i, `${styleTag}\n</body>`);
    } else {
      out = `${styleTag}\n${out}`;
    }
  }

  out = out.replace(/<!--PORTFOLIO_KEEP_SCRIPT_(\d+)-->/g, (_, n) => scripts[Number(n)] || '');
  return out;
}

function buildPortfolioSectionAnchors(chosen) {
  const sections = groupPortfolioAssetsByType(chosen);
  const knownTypes = new Set(PORTFOLIO_TYPE_SECTIONS.flatMap((s) => [...s.types]));
  const leftovers = chosen.filter((a) => !knownTypes.has(a.type));
  const anchors = sections.map((s) => ({
    key: s.key,
    title: s.title,
    emoji: s.emoji,
    count: s.items.length,
    href: `#pf-section-${s.key}`,
  }));
  if (leftovers.length > 0) {
    anchors.push({
      key: 'other',
      title: '其他作品',
      emoji: '📦',
      count: leftovers.length,
      href: '#pf-section-other',
    });
  }
  return anchors;
}

function buildPortfolioNavPromptLines(chosen) {
  const anchors = buildPortfolioSectionAnchors(chosen);
  if (!anchors.length) return '- 暂无分区导航';
  return anchors
    .map((a) => `- ${a.emoji} ${a.title}（${a.count} 件）→ 必须用 href="${a.href}"`)
    .concat(['- 回首页 / 回到顶部 → 必须用 href="#portfolio-top"'])
    .join('\n');
}

function matchAnchorForText(text, chosen) {
  const t = String(text || '').toLowerCase();
  if (HOME_KEYWORDS.some((k) => t.includes(k.toLowerCase()))) return '#portfolio-top';
  const anchors = buildPortfolioSectionAnchors(chosen);
  for (const def of COVER_NAV_KEYWORDS) {
    if (!anchors.some((a) => a.key === def.key)) continue;
    if (def.patterns.some((p) => t.includes(p.toLowerCase()))) return `#pf-section-${def.key}`;
  }
  for (const a of anchors) {
    if (t.includes(a.title.toLowerCase()) || t.includes(a.key)) return a.href;
  }
  return null;
}

function isBadNavHref(href) {
  if (!href || href === '#') return true;
  if (href.startsWith('#pf-section-') || href === '#portfolio-top' || href === '#top') return false;
  if (href.startsWith('#')) return false;
  if (/^https?:\/\//i.test(href)) return true;
  if (href.startsWith('/')) return true;
  return false;
}

function rewritePortfolioCoverLinks(html, chosen) {
  const rootIdx = html.search(/id=["']portfolio-works-root["']/i);
  const coverPart = rootIdx >= 0 ? html.slice(0, rootIdx) : html;
  const restPart = rootIdx >= 0 ? html.slice(rootIdx) : '';

  let cover = coverPart.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs, inner) => {
    const hrefMatch = attrs.match(/\bhref=["']([^"']*)["']/i);
    const href = hrefMatch ? hrefMatch[1] : '';
    const text = inner.replace(/<[^>]+>/g, ' ');
    const mapped = matchAnchorForText(text, chosen);
    if (mapped) {
      const newAttrs = hrefMatch
        ? attrs.replace(/\bhref=["'][^"']*["']/i, `href="${mapped}"`)
        : `${attrs} href="${mapped}"`;
      return `<a${newAttrs.replace(/\btarget=["'][^"']*["']/gi, '').replace(/\brel=["'][^"']*["']/gi, '')}>${inner}</a>`;
    }
    if (isBadNavHref(href)) {
      const home = matchAnchorForText(text, chosen) || '#portfolio-top';
      const newAttrs = hrefMatch
        ? attrs.replace(/\bhref=["'][^"']*["']/i, `href="${home}"`)
        : `${attrs} href="${home}"`;
      return `<a${newAttrs.replace(/\btarget=["'][^"']*["']/gi, '').replace(/\brel=["'][^"']*["']/gi, '')}>${inner}</a>`;
    }
    return full;
  });

  cover = cover.replace(/\bonclick=["']([^"']*)["']/gi, (full, js) => {
    if (/location\.(href|assign|replace)|window\.open/i.test(js)) {
      return '';
    }
    return full;
  });

  return cover + restPart;
}

function injectPortfolioAnchorNavScript(html, chosen) {
  if (/data-ai-camp-portfolio-nav-script/i.test(html)) return html;
  const anchors = buildPortfolioSectionAnchors(chosen);
  const anchorJson = JSON.stringify(
    anchors.map((a) => ({ key: a.key, href: a.href, title: a.title, patterns: COVER_NAV_KEYWORDS.find((k) => k.key === a.key)?.patterns || [] })),
  );
  const script = `<script data-ai-camp-portfolio-nav-script>(function(){
  var ANCHORS=${anchorJson};
  var HOME=${JSON.stringify(HOME_KEYWORDS)};
  function scrollToHash(hash){
    if(!hash||hash==='#') return;
    var id=hash.replace(/^#/,'');
    var el=document.getElementById(id);
    if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if(id==='top') window.scrollTo({top:0,behavior:'smooth'});
  }
  function textOf(el){
    return (el&&(el.innerText||el.textContent||'')).replace(/\\s+/g,' ').trim();
  }
  function matchHref(text){
    var t=(text||'').toLowerCase();
    for(var i=0;i<HOME.length;i++){ if(t.indexOf(HOME[i].toLowerCase())>=0) return '#portfolio-top'; }
    for(var j=0;j<ANCHORS.length;j++){
      var a=ANCHORS[j];
      if(t.indexOf(a.title.toLowerCase())>=0) return a.href;
      var p=a.patterns||[];
      for(var k=0;k<p.length;k++){ if(t.indexOf(p[k].toLowerCase())>=0) return a.href; }
    }
    return null;
  }
  function inCoverZone(el){
    if(!el||!el.closest) return false;
    if(el.closest('#portfolio-works-root')) return false;
    if(el.closest('.ai-camp-pf-card[data-pf-card]')) return false;
    if(el.closest('.ai-camp-pf-web')) return false;
    return true;
  }
  document.addEventListener('click',function(e){
    var link=e.target&&e.target.closest?e.target.closest('a[href]'):null;
    if(!link||!inCoverZone(link)) return;
    var href=(link.getAttribute('href')||'').trim();
    var mapped=matchHref(textOf(link));
    if(href.startsWith('#pf-section-')||href==='#portfolio-top'||href==='#top'){
      e.preventDefault();
      scrollToHash(href);
      return;
    }
    if(mapped||/^\\/?|^https?:/i.test(href)){
      e.preventDefault();
      scrollToHash(mapped||'#portfolio-top');
    }
  },true);
})();</script>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${script}\n</body>`);
  }
  return html + script;
}

function ensurePortfolioTopAnchor(html) {
  if (/id=["']portfolio-top["']/i.test(html)) return html;
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, '<body$1>\n<div id="portfolio-top" aria-hidden="true"></div>');
  }
  return `<div id="portfolio-top" aria-hidden="true"></div>\n${html}`;
}

function finalizePortfolioNavigation(html, chosen) {
  let out = ensurePortfolioTopAnchor(html);
  out = rewritePortfolioCoverLinks(out, chosen);
  out = injectPortfolioAnchorNavScript(out, chosen);
  return out;
}

const SHELL_SECTION_COLORS = {
  image: { bg: '#fce7f3', border: '#f472b6', text: '#9d174d' },
  text: { bg: '#dbeafe', border: '#60a5fa', text: '#1e40af' },
  video: { bg: '#ede9fe', border: '#a78bfa', text: '#5b21b6' },
  audio: { bg: '#ccfbf1', border: '#2dd4bf', text: '#115e59' },
  web: { bg: '#cffafe', border: '#22d3ee', text: '#155e75' },
  other: { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' },
};

function buildDeterministicPortfolioShell(displayName, chosen) {
  const name = escapeHtmlText(displayName || '小朋友');
  const anchors = buildPortfolioSectionAnchors(chosen);
  const navButtons = anchors
    .map((a) => {
      const colors = SHELL_SECTION_COLORS[a.key] || SHELL_SECTION_COLORS.other;
      const shortTitle = a.title.replace(/^AI /, '').replace(/与小游戏$/, '');
      const unit = a.key === 'text' ? '篇' : a.key === 'video' ? '段' : a.key === 'web' ? '个' : '幅';
      return `<a class="pf-cover-pill" href="${a.href}" style="background:${colors.bg};border:2px dashed ${colors.border};color:${colors.text}">${a.emoji} ${escapeHtmlText(shortTitle)} ${a.count}${unit}</a>`;
    })
    .join('\n    ');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>我的 AI 作品集</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:"PingFang SC",system-ui,sans-serif;background:linear-gradient(135deg,#e0f2fe,#fce7f3 45%,#fef9c3);color:#1e293b;min-height:100vh}
  .pf-cover{max-width:960px;margin:0 auto;padding:32px 20px 24px;text-align:center}
  .pf-cover h1{font-size:clamp(1.8rem,5vw,2.6rem);color:#ec4899;margin:0 0 12px;text-shadow:0 2px 0 #fff}
  .pf-cover .intro{font-size:1.05rem;color:#475569;margin:0 0 24px;line-height:1.6}
  .pf-cover-nav{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:20px;border:3px dashed #fbbf24;border-radius:24px;background:rgba(255,255,255,.55);margin-bottom:8px}
  .pf-cover-pill{display:inline-block;padding:14px 22px;border-radius:999px;font-weight:800;font-size:1rem;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease;box-shadow:0 6px 16px rgba(15,23,42,.08)}
  .pf-cover-pill:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 10px 24px rgba(15,23,42,.12)}
  .pf-home-link{display:inline-block;margin-top:16px;padding:10px 20px;border-radius:999px;background:#fb923c;color:#fff;font-weight:700;text-decoration:none;box-shadow:0 4px 12px rgba(251,146,60,.35)}
</style>
</head>
<body>
<div id="portfolio-top" aria-hidden="true"></div>
<header class="pf-cover" data-portfolio-cover="1">
  <h1>✨ ${name} 的 AI 作品集</h1>
  <p class="intro">快来点点看，一起逛我的创意小世界吧 🎨📚🌟</p>
  <nav class="pf-cover-nav" aria-label="作品分区导航">
    ${navButtons}
  </nav>
  <a class="pf-home-link" href="#portfolio-top">🏠 回顶部</a>
</header>
<div id="portfolio-works-root"></div>
</body>
</html>`;
}

function buildFullPortfolioHtml(chosen, cardLayout, displayName, urlCtx) {
  const ctx = urlCtx || createDefaultUrlContext();
  const shell = buildDeterministicPortfolioShell(displayName, chosen);
  let html = applyDeterministicPortfolioWorks(shell, chosen, cardLayout || TYPE_LAYOUT_OPTION, ctx);
  html = finalizePortfolioNavigation(html, chosen);
  return html;
}

module.exports = {
  PORTFOLIO_TYPE_SECTIONS,
  TYPE_LAYOUT_OPTION,
  PORTFOLIO_SELECTABLE_TYPES: ['text', 'ppt', 'image', 'poster', 'mixed', 'video', 'web', 'code', 'audio'],
  parseMeta,
  isTypeClassificationLayout,
  groupPortfolioAssetsByType,
  createDefaultUrlContext,
  buildPortfolioWorksInnerHtml,
  applyDeterministicPortfolioWorks,
  buildPortfolioSectionAnchors,
  buildPortfolioNavPromptLines,
  rewritePortfolioCoverLinks,
  injectPortfolioAnchorNavScript,
  finalizePortfolioNavigation,
  buildDeterministicPortfolioShell,
  buildFullPortfolioHtml,
};
