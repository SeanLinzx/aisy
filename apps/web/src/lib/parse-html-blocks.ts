export interface LayoutBlock {
  id: string;
  tag: string;
  label: string;
  emoji: string;
  preview: string;
  html: string;
}

export interface ParseHtmlBlocksResult {
  blocks: LayoutBlock[];
  reorderable: boolean;
  message: string;
}

const TAG_EMOJI: Record<string, string> = {
  h1: '📌',
  h2: '📌',
  h3: '📌',
  h4: '📌',
  h5: '📌',
  h6: '📌',
  figure: '🖼️',
  img: '🖼️',
  p: '📝',
  div: '📦',
  section: '📂',
  article: '📄',
  main: '🏠',
  video: '🎬',
  ul: '📋',
  ol: '📋',
  button: '🔘',
  a: '🔗',
  header: '🔝',
  footer: '🔚',
};

const CONTAINER_TAGS = new Set(['ARTICLE', 'MAIN', 'SECTION', 'DIV']);

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function getElementChildren(el: Element): Element[] {
  return Array.from(el.children);
}

function labelForElement(el: Element): string {
  const tag = el.tagName.toLowerCase();

  if (/^h[1-6]$/.test(tag)) {
    return truncate(el.textContent?.trim() || '标题', 28);
  }
  if (tag === 'figure') {
    const cap = el.querySelector('figcaption')?.textContent?.trim();
    if (cap) return truncate(cap, 32);
    if (el.querySelector('img')) return '图片块';
    if (el.querySelector('video')) return '视频块';
    return '图文块';
  }
  if (tag === 'img') {
    return truncate(el.getAttribute('alt')?.trim() || '图片', 28);
  }
  if (tag === 'video') return '视频';
  if (tag === 'p') {
    const t = el.textContent?.trim();
    return t ? truncate(t, 32) : '段落';
  }
  if (tag === 'div') {
    const heading = el.querySelector('h1,h2,h3,h4,h5,h6');
    if (heading?.textContent?.trim()) return truncate(heading.textContent.trim(), 28);
    const cls = (el.getAttribute('class') || '').trim();
    if (cls) return `区块 · ${cls.split(/\s+/)[0]}`;
  }
  if (tag === 'main') return '主内容区';
  if (tag === 'header') return truncate(el.textContent?.trim() || '页头', 28);
  if (tag === 'footer') return truncate(el.textContent?.trim() || '页脚', 28);

  const text = el.textContent?.trim();
  if (text) return truncate(text, 28);
  return `${tag} 块`;
}

function previewForElement(el: Element): string {
  const text = el.textContent?.replace(/\s+/g, ' ').trim() || '';
  if (text) return truncate(text, 48);
  if (el.querySelector('img')) return '包含图片';
  if (el.querySelector('video')) return '包含视频';
  return el.outerHTML.replace(/\s+/g, ' ').slice(0, 48);
}

function wrapForParse(html: string): { content: string; mode: 'fragment' | 'document' } {
  const trimmed = (html || '').trim();
  if (!trimmed) {
    return {
      content: '<!doctype html><html><head></head><body></body></html>',
      mode: 'fragment',
    };
  }
  if (/<\s*html[\s>]/i.test(trimmed) || /<!doctype/i.test(trimmed)) {
    return { content: trimmed, mode: 'document' };
  }
  return {
    content: `<!doctype html><html><head></head><body>${trimmed}</body></html>`,
    mode: 'fragment',
  };
}

function findBlockContainer(body: Element): Element {
  const bodyChildren = getElementChildren(body);
  if (bodyChildren.length === 1) {
    const only = bodyChildren[0];
    if (CONTAINER_TAGS.has(only.tagName)) {
      const inner = getElementChildren(only);
      if (inner.length >= 2) return only;
    }
  }
  return body;
}

function blockFromElement(el: Element, index: number): LayoutBlock {
  const tag = el.tagName.toLowerCase();
  return {
    id: `block-${index}`,
    tag,
    label: labelForElement(el),
    emoji: TAG_EMOJI[tag] || '🧩',
    preview: previewForElement(el),
    html: el.outerHTML,
  };
}

interface ParsedDom {
  doc: Document;
  mode: 'fragment' | 'document';
  container: Element;
  blockElements: Element[];
}

function parseDom(html: string): ParsedDom | null {
  if (typeof DOMParser === 'undefined') return null;
  const { content, mode } = wrapForParse(html);
  const doc = new DOMParser().parseFromString(content, 'text/html');
  const body = doc.body;
  if (!body) return null;

  const container = findBlockContainer(body);
  const blockElements = getElementChildren(container);
  return { doc, mode, container, blockElements };
}

function serializeHtml(parsed: ParsedDom): string {
  const { doc, mode, container } = parsed;
  if (mode === 'document') {
    const dt = doc.doctype;
    const doctype = dt
      ? `<!DOCTYPE ${dt.name}${dt.publicId ? ` PUBLIC "${dt.publicId}"` : ''}${dt.systemId ? ` "${dt.systemId}"` : ''}>`
      : '<!doctype html>';
    return `${doctype}${doc.documentElement.outerHTML}`;
  }
  if (container.tagName === 'BODY') return doc.body.innerHTML;
  return container.outerHTML;
}

/** 智能解析 HTML，识别页面中的主要布局块 */
export function parseHtmlBlocks(html: string): ParseHtmlBlocksResult {
  const parsed = parseDom(html);
  if (!parsed) {
    return { blocks: [], reorderable: false, message: '当前环境无法解析 HTML' };
  }

  const { blockElements } = parsed;
  if (blockElements.length === 0) {
    return { blocks: [], reorderable: false, message: '还没有可识别的页面块，请先在 HTML 里写好内容' };
  }

  const blocks = blockElements.map((el, i) => blockFromElement(el, i));
  if (blocks.length < 2) {
    return {
      blocks,
      reorderable: false,
      message: '只识别到 1 个页面块，再添加一些内容就可以拖拽排序啦',
    };
  }

  return {
    blocks,
    reorderable: true,
    message: `已识别 ${blocks.length} 个主要页面块，拖拽卡片即可调整顺序`,
  };
}

/** 按新顺序重排 HTML 中的布局块 */
export function reorderHtmlBlocks(html: string, orderedIds: string[]): string {
  const parsed = parseDom(html);
  if (!parsed) return html;

  const current = parseHtmlBlocks(html);
  const idToHtml = new Map(current.blocks.map((b) => [b.id, b.html]));
  const orderedHtml = orderedIds.map((id) => idToHtml.get(id)).filter(Boolean) as string[];
  if (orderedHtml.length !== current.blocks.length) return html;

  const { container, blockElements } = parsed;
  blockElements.forEach((el) => el.remove());

  const frag = parsed.doc.createDocumentFragment();
  orderedHtml.forEach((snippet) => {
    const tmp = parsed.doc.createElement('div');
    tmp.innerHTML = snippet;
    const first = tmp.firstElementChild;
    if (first) frag.appendChild(first);
  });
  container.appendChild(frag);

  return serializeHtml(parsed);
}
