import {
  PORTFOLIO_TYPE_SECTIONS,
  TYPE_LAYOUT_OPTION,
  PORTFOLIO_SELECTABLE_TYPES as PKG_SELECTABLE_TYPES,
  parseMeta as pkgParseMeta,
  isTypeClassificationLayout,
  groupPortfolioAssetsByType,
  applyDeterministicPortfolioWorks as pkgApplyDeterministicPortfolioWorks,
  buildPortfolioWorksInnerHtml as pkgBuildPortfolioWorksInnerHtml,
  buildPortfolioNavPromptLines,
  finalizePortfolioNavigation,
  type PortfolioAsset as PkgPortfolioAsset,
} from '@ai-camp/portfolio-html';
import { api } from '@/lib/api';
import { fetchAssetContent, fetchAssetsList } from '@/lib/assets-cache';
import { filterAssetsByTab, type AssetTabKey } from '@/lib/asset-tabs';
import { mergeWebHtml, splitInlineWebParts } from '@/lib/merge-web-html';
import { persistWebAsset } from '@/lib/persist-web-asset';
import { absoluteAssetUrl } from '@/lib/asset-path';
import { resolveEmbedUrl, resolveUploadPath } from '@/lib/upload-url';
import { renderFilledSentence } from '@/components/course/fill-blank-sentence';
import { WEB_ITERATION_DELTA_RULES } from '@/lib/web-iteration-prompt';
import { prepareIterationSourceForPrompt } from '@/lib/web-iteration-base';
import { syncLocalUploadWebProjectsToAssets } from '@/lib/upload-local-html-web-project';

export {
  PORTFOLIO_TYPE_SECTIONS,
  TYPE_LAYOUT_OPTION,
  isTypeClassificationLayout,
  groupPortfolioAssetsByType,
  finalizePortfolioNavigation,
  buildPortfolioNavPromptLines,
};

const portfolioUrlContext = {
  resolveEmbedUrl,
  resolveWebAssetUrl(url: string) {
    if (!url.trim()) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return absoluteAssetUrl(url.startsWith('/') ? url : `/${url}`);
  },
};

export interface PortfolioAsset {
  id: string;
  type: string;
  title: string;
  url?: string;
  thumbnailUrl?: string;
  content?: string;
  summary?: string;
  meta?: unknown;
}

export interface PortfolioForm {
  audience: string;
  goal: string;
  style: string;
  cover: string;
  cardLayout: string;
  interactionRule: string;
  interactionAction: string;
  interactionFeedback: string;
}

export const TYPE_EMOJI: Record<string, string> = {
  image: '🖼️',
  video: '🎬',
  poster: '🖼️',
  web: '🌐',
  code: '💻',
  mixed: '🎁',
  text: '📝',
  ppt: '📊',
  audio: '🔊',
};
/** 与素材库四分类对齐，作品集可挑选的类型 */
export const PORTFOLIO_SELECTABLE_TYPES = PKG_SELECTABLE_TYPES as readonly [
  'text',
  'ppt',
  'image',
  'poster',
  'mixed',
  'video',
  'web',
  'code',
  'audio',
];

export function isPortfolioSelectableAsset(asset: PortfolioAsset): boolean {
  if (!PORTFOLIO_SELECTABLE_TYPES.includes(asset.type as (typeof PORTFOLIO_SELECTABLE_TYPES)[number])) {
    return false;
  }
  const meta = pkgParseMeta(asset.meta);
  return meta.kind !== 'portfolio';
}

export type PortfolioAssetFilterKey = AssetTabKey | 'all';

/** 与素材库分类对齐；code 归入网页类 */
export function filterPortfolioAssetsByTab(items: PortfolioAsset[], tab: PortfolioAssetFilterKey): PortfolioAsset[] {
  if (tab === 'all') return items;
  if (tab === 'web') {
    return items.filter((a) => a.type === 'web' || a.type === 'code');
  }
  return filterAssetsByTab(items, tab);
}

export function countPortfolioAssetsByTab(
  items: PortfolioAsset[],
  tabs: readonly { key: AssetTabKey }[],
): Record<PortfolioAssetFilterKey, number> {
  const counts: Record<PortfolioAssetFilterKey, number> = {
    all: items.length,
    text: 0,
    image: 0,
    video: 0,
    audio: 0,
    web: 0,
  };
  for (const t of tabs) {
    counts[t.key] = filterPortfolioAssetsByTab(items, t.key).length;
  }
  return counts;
}
export const PORTFOLIO_TITLE = '我的 AI 作品集';
export const PORTFOLIO_DESC = '课程 · 第5课 AI 作品集';

export const DEFAULT_FORM: PortfolioForm = {
  audience: '给爸爸妈妈和老师看',
  goal: '我这学期用 AI 做的所有创意作品',
  style: '活泼可爱、五彩缤纷的颜色',
  cover: '大标题和一段自我介绍',
  cardLayout: TYPE_LAYOUT_OPTION,
  interactionRule: '鼠标移到卡片上，或用手指点一下卡片',
  interactionAction: '卡片会轻轻放大、出现阴影，并显示作品名称',
  interactionFeedback: '再点一次可以弹出大图或播放视频',
};

export function portfolioTypeSectionFor(type: string) {
  return PORTFOLIO_TYPE_SECTIONS.find((s) => s.types.includes(type)) ?? null;
}

/** 生成前补全文字/图文/代码正文（列表接口默认不含 content） */
export async function enrichChosenPortfolioAssets(chosen: PortfolioAsset[]): Promise<PortfolioAsset[]> {
  const needContent = (a: PortfolioAsset) =>
    (a.type === 'text' || a.type === 'ppt' || a.type === 'mixed' || a.type === 'code') && !a.content?.trim();

  return Promise.all(
    chosen.map(async (a) => {
      if (!needContent(a)) return a;
      try {
        const content = await fetchAssetContent(a.id);
        return content ? { ...a, content } : a;
      } catch {
        return a;
      }
    }),
  );
}

/** 收集 URL 指纹，兼容绝对地址 / /aisy 前缀 / 仅文件名 */
function collectUrlFingerprints(url: string): string[] {
  const out = new Set<string>();
  const raw = url.trim();
  if (!raw) return [];
  out.add(raw);
  try {
    out.add(decodeURIComponent(raw));
  } catch {
    /* ignore */
  }
  try {
    const u = new URL(raw, 'http://local.invalid');
    out.add(u.pathname);
    out.add(u.pathname.replace(/^\/aisy/, ''));
    const uploads = u.pathname.match(/(?:^|\/)uploads\/.+$/);
    if (uploads) out.add(uploads[0].replace(/^\//, ''));
    const file = u.pathname.split('/').filter(Boolean).pop();
    if (file && /\.[a-z0-9]{2,5}$/i.test(file)) out.add(file);
  } catch {
    if (raw.startsWith('/')) {
      out.add(raw.replace(/^\/aisy/, ''));
      const file = raw.split('/').filter(Boolean).pop();
      if (file) out.add(file);
    }
  }
  return [...out].filter((s) => s.length >= 6);
}

function htmlContainsMediaUrl(html: string, url: string): boolean {
  return collectUrlFingerprints(url).some((fp) => html.includes(fp));
}

/** 检查生成 HTML 是否覆盖了选中作品（媒体以 URL 为准，文字类看标题） */
export function findMissingPortfolioAssets(html: string, chosen: PortfolioAsset[]): PortfolioAsset[] {
  if (!html.trim()) return [...chosen];
  return chosen.filter((a) => {
    if (a.type === 'image' || a.type === 'poster' || a.type === 'video' || a.type === 'audio') {
      const url = pickMediaUrl(a);
      if (url) return !htmlContainsMediaUrl(html, url);
      return a.title?.trim() ? !html.includes(a.title.trim()) : false;
    }
    if (a.type === 'web') {
      const pageUrl = a.url ? resolveWebAssetUrl(a.url) : '';
      if (pageUrl) return !htmlContainsMediaUrl(html, pageUrl);
      return a.title?.trim() ? !html.includes(a.title.trim()) : false;
    }
    if (a.type === 'mixed') {
      const imageUrl = pickReferenceImage(a) || pickMediaUrl(a);
      if (imageUrl && htmlContainsMediaUrl(html, imageUrl)) return false;
      return a.title?.trim() ? !html.includes(a.title.trim()) : Boolean(imageUrl);
    }
    if (a.type === 'text' || a.type === 'ppt' || a.type === 'code') {
      return a.title?.trim() ? !html.includes(a.title.trim()) : false;
    }
    return a.title?.trim() ? !html.includes(a.title.trim()) : false;
  });
}

function pickMediaUrl(asset: PortfolioAsset): string {
  const meta = parseMeta(asset.meta);
  const candidates = [
    asset.url,
    asset.thumbnailUrl,
    ...(Array.isArray(meta.allUrls) ? (meta.allUrls as string[]) : []),
    ...(Array.isArray(meta.sourceUrls) ? (meta.sourceUrls as string[]) : []),
  ].filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  return candidates[0] ? portfolioUrlContext.resolveEmbedUrl(candidates[0]) : '';
}

function pickReferenceImage(asset: PortfolioAsset): string {
  const meta = parseMeta(asset.meta);
  const refs = meta.references as Array<{ type?: string; url?: string }> | undefined;
  const refUrl = refs?.find((r) => r.type === 'image' && r.url)?.url;
  return refUrl ? portfolioUrlContext.resolveEmbedUrl(refUrl) : '';
}

function resolveWebAssetUrl(url: string): string {
  return portfolioUrlContext.resolveWebAssetUrl(url);
}

/** 按布局规则生成「全部选中作品」的确定性 HTML（不依赖 AI） */
export function buildPortfolioWorksInnerHtml(chosen: PortfolioAsset[], cardLayout?: string): string {
  return pkgBuildPortfolioWorksInnerHtml(chosen as PkgPortfolioAsset[], cardLayout, portfolioUrlContext);
}

/**
 * 用代码强制写入「全部选中作品」（按类型分区分或平铺）。
 * 仅用字符串操作，禁止 DOMParser.outerHTML（会拆掉 `<script>` 导致页面显示 JS 乱码）。
 */
export function applyDeterministicPortfolioWorks(
  html: string,
  chosen: PortfolioAsset[],
  cardLayout?: string,
): string {
  return pkgApplyDeterministicPortfolioWorks(
    html,
    chosen as PkgPortfolioAsset[],
    cardLayout,
    portfolioUrlContext,
  );
}

/** @deprecated 使用 applyDeterministicPortfolioWorks；保留兼容 */
export function injectMissingPortfolioCards(html: string, missing: PortfolioAsset[]): string {
  return applyDeterministicPortfolioWorks(html, missing, TYPE_LAYOUT_OPTION);
}

/** @deprecated 使用 applyDeterministicPortfolioWorks */
export function ensurePortfolioAssetsInHtml(html: string, chosen: PortfolioAsset[]): string {
  return applyDeterministicPortfolioWorks(html, chosen, TYPE_LAYOUT_OPTION);
}

/** 已选作品按类型汇总文案（选作品步骤提示用） */
export function summarizeChosenByType(chosen: PortfolioAsset[]): string {
  if (!chosen.length) return '';
  const sections = groupPortfolioAssetsByType(chosen);
  if (!sections.length) return `已选 ${chosen.length} 个`;
  return sections.map((s) => `${s.emoji}${s.title.replace(/^AI /, '')} ${s.items.length}`).join(' · ');
}

export const INTERACTION_TEMPLATE = {
  segments: ['👆 当访客「', '」的时候，「', '」，页面就会「', '」。'],
  blanks: [
    { key: 'interactionRule', placeholder: '什么时候触发', quickOptions: ['鼠标移到卡片上，或用手指点一下卡片', '点击卡片上的「查看详情」按钮'] },
    { key: 'interactionAction', placeholder: '做出什么动作', quickOptions: ['卡片会轻轻放大、出现阴影，并显示作品名称', '卡片会翻转，背面显示作品介绍'] },
    { key: 'interactionFeedback', placeholder: '页面出现什么', quickOptions: ['再点一次可以弹出大图或播放视频', '弹出一个介绍窗口，讲讲这个作品是怎么做的'] },
  ],
};

export function parseMeta(raw: unknown): Record<string, unknown> {
  return pkgParseMeta(raw);
}

export function formFromMeta(meta: Record<string, unknown>): PortfolioForm {
  const str = (key: string, fallback: string) => (typeof meta[key] === 'string' ? (meta[key] as string) : fallback);
  return {
    audience: str('audience', DEFAULT_FORM.audience),
    goal: str('goal', typeof meta.scenarioNeed === 'string' ? (meta.scenarioNeed as string) : DEFAULT_FORM.goal),
    style: str('style', DEFAULT_FORM.style),
    cover: str('cover', DEFAULT_FORM.cover),
    cardLayout: (() => {
      const raw = str(
        'cardLayout',
        typeof meta.scenarioStyle === 'string' ? (meta.scenarioStyle as string) : DEFAULT_FORM.cardLayout,
      );
      // 旧文案未含「音频」，升级为完整类型选项，避免布局意图被窄化
      if (raw === '按作品类型（图片/文字/视频/网页）分类') return TYPE_LAYOUT_OPTION;
      return raw;
    })(),
    interactionRule: str('interactionRule', DEFAULT_FORM.interactionRule),
    interactionAction: str('interactionAction', DEFAULT_FORM.interactionAction),
    interactionFeedback: str('interactionFeedback', DEFAULT_FORM.interactionFeedback),
  };
}

export function buildPromptFromForm(
  form: PortfolioForm,
  assetList: string,
  selectedCount?: number,
  chosen?: PortfolioAsset[],
) {
  const interactionSummary = renderFilledSentence(
    INTERACTION_TEMPLATE.segments,
    INTERACTION_TEMPLATE.blanks,
    form as unknown as Record<string, string>,
  );
  const countHint =
    typeof selectedCount === 'number' && selectedCount > 0
      ? `素材库中选中的全部 ${selectedCount} 个作品`
      : form.goal.trim() || DEFAULT_FORM.goal;
  const typeSummary =
    chosen?.length && isTypeClassificationLayout(form.cardLayout)
      ? `\n- 类型分布（仅供文案参考，不要自己画这些卡片）：${summarizeChosenByType(chosen)}`
      : '';
  const navHint =
    chosen?.length && isTypeClassificationLayout(form.cardLayout)
      ? `\n\n【封面导航 · 必须页内锚点跳转】
- 页面顶部必须有 <div id="portfolio-top"></div>
- 封面上的分类按钮/导航链接只能使用下列 href（禁止 href="/"、禁止 window.location、禁止 target="_blank" 做分区跳转）：
${buildPortfolioNavPromptLines(chosen)}`
      : '';

  return `请帮我做一个「我的 AI 作品集」展示网页的外壳（单文件 HTML，含内联 CSS 和 JavaScript）。

【重要 · 作品卡片由系统写入，你不要生成】
- 页面中必须且只能用下面这个空容器作为作品展示区（保持 id 不变，内部留空）：
  <div id="portfolio-works-root"></div>
- 禁止根据作品清单自己生成任何作品卡片、分区标题、图片/视频/音频/网页链接。
- 禁止只展示某一类作品。作品清单仅供你写封面介绍文案时参考。

【展示目标】
- 默认受众：${form.audience.trim() || DEFAULT_FORM.audience}
- 展示内容：${countHint}（共 ${selectedCount ?? '若干'} 项）${typeSummary}${navHint}

【布局 · 页面结构怎么摆】
- 整体风格：${form.style.trim()}
- 最上面（封面/标题区）：${form.cover.trim()}
- 作品区说明（系统会按此规则填充 #portfolio-works-root）：${form.cardLayout.trim()}

【交互 · 针对整页与封面】
- 什么时候触发：${form.interactionRule.trim()}
- 做出什么动作：${form.interactionAction.trim()}
- 页面反馈：${form.interactionFeedback.trim()}
- 交互规则总结：${interactionSummary}

作品清单（仅供封面自我介绍文案参考，不要渲染成卡片）：
${assetList}

要求：
1. 输出完整单文件 HTML：封面/标题/自我介绍 + 空的 <div id="portfolio-works-root"></div> + 页脚；内联 CSS/JS。
2. 根据【交互】用 JavaScript 实现真实可点交互（悬停、动画等），但交互只作用于封面/标题区；禁止给 #portfolio-works-root 或其父级容器绑定悬停放大、翻转、阴影动画。
3. 作品卡片由系统写入 #portfolio-works-root，你不要自己生成 flip-card 或 data-ai-action 按钮在作品区。
4. 封面导航若做分类按钮，必须只用 #pf-section-* 与 #portfolio-top 锚点，禁止跳转到新页面。
5. 不要使用外链 JS/CSS/字体；不要编造作品图片或链接。
6. 只输出 HTML 代码，不要 Markdown 代码块。`;
}

/** 补全遗漏作品时的二次生成提示 */
export function buildPortfolioRepairPrompt(
  form: PortfolioForm,
  previousHtml: string,
  missing: PortfolioAsset[],
  allChosen: PortfolioAsset[],
) {
  const missingList = buildAssetList(missing, form.cardLayout);
  const sectionHint = isTypeClassificationLayout(form.cardLayout)
    ? `\n请确保按类型分区后，下列遗漏作品所在的分区（${groupPortfolioAssetsByType(missing)
        .map((s) => `「${s.emoji} ${s.title}」`)
        .join('、')}）完整出现在页面上。`
    : '';

  return `下面是一份「我的 AI 作品集」HTML，但漏掉了部分选中作品。请在保留现有风格与交互的前提下，把遗漏作品全部补进页面，并输出完整单文件 HTML。

已收录作品共应有 ${allChosen.length} 项；下列 ${missing.length} 项必须补上：
${missingList}
${sectionHint}

【当前不完整 HTML】
${previousHtml}

要求：
1. 不要删除已有作品卡片；只补充遗漏项，并保持分区完整。
2. 图片/视频/音频必须使用清单给出的精确 URL；网页作品用 target="_blank" 打开链接。
3. 只输出完整 HTML，不要 Markdown 代码块。`;
}

export function friendlyApiError(message: string) {
  if (
    message.includes('Foreign key constraint') ||
    message.includes('登录态') ||
    message.includes('重新登录') ||
    message.includes('STALE_SESSION')
  ) {
    return '登录状态已过期，请先退出账号并重新登录，再生成作品集。';
  }
  return message;
}

export function buildIterationPrompt(html: string, instruction: string, blocksContext = '') {
  const source = prepareIterationSourceForPrompt(html);
  const blockSection = blocksContext
    ? `【小朋友点选的具体部分，请重点参考、优先修改这里（及其直接相关的样式/结构），尽量不要改动页面其他区域】
${blocksContext}

`
    : '';

  return `【上一版本完整 HTML 源码】（含内联 CSS/JS，共约 ${source.length} 字符 — 必须作为唯一基础做增量修改）
${source}

${blockSection}【小学生的修改意见】
${instruction.trim()}

要求：
${WEB_ITERATION_DELTA_RULES}
1. 按修改意见调整封面、配色、文案和交互；务必保留 <div id="portfolio-works-root">…</div>（系统会再写入全部作品）。
2. 禁止给 #portfolio-works-root、.ai-camp-pf-section、.ai-camp-pf-grid 整块绑定悬停放大/翻转；交互只作用于封面区和单张 .ai-camp-pf-card。
3. 不要删掉某一种类型的作品分区；不要只保留图片或只保留网页。
4. 封面导航必须保持页内锚点（#pf-section-* / #portfolio-top），禁止 href="/" 或跳转到新页面。
5. 输出完整单文件 HTML（含内联 CSS 和 JavaScript），可直接运行。
6. 只输出 HTML 代码，不要 Markdown 代码块。`;
}

function formatOneAssetLine(a: PortfolioAsset, n: number): string {
  const summary = a.summary?.trim();
  const content = a.content?.trim();
  const mediaUrl = pickMediaUrl(a);

  if (a.type === 'image' || a.type === 'poster') {
    return `- [图片 ${n}] 标题：「${a.title}」${summary ? `，简介：${summary}` : ''}
  必须使用此图片地址（禁止替换为其他图片）：${mediaUrl || '（地址缺失，请保留标题并留占位说明）'}`;
  }
  if (a.type === 'video') {
    return `- [视频 ${n}] 标题：「${a.title}」${summary ? `，简介：${summary}` : ''}
  必须使用此视频地址：${mediaUrl || '（地址缺失）'}`;
  }
  if (a.type === 'audio') {
    return `- [音频 ${n}] 标题：「${a.title}」${summary ? `，简介：${summary}` : ''}
  音频地址：${mediaUrl || '（地址缺失）'}（可用 <audio controls src="…"> 播放）`;
  }
  if (a.type === 'text' || a.type === 'ppt') {
    return `- [文字作品 ${n}] 标题：「${a.title}」${summary ? `，简介：${summary}` : ''}
  正文（必须在页面中完整或分段展示）：
${content || summary || '（无正文）'}`;
  }
  if (a.type === 'mixed') {
    const imageUrl = pickReferenceImage(a) || mediaUrl;
    return `- [图文作品 ${n}] 标题：「${a.title}」${summary ? `，简介：${summary}` : ''}${imageUrl ? `\n  配图地址：${imageUrl}` : ''}
  文字内容（必须在页面中展示）：
${content || summary || '（无正文）'}`;
  }
  if (a.type === 'web') {
    const pageUrl = a.url ? resolveWebAssetUrl(a.url) : '';
    return `- [网页/交互作品 ${n}] 标题：「${a.title}」${summary ? `，简介：${summary}` : ''}
  打开链接：${pageUrl || '（无链接）'}（请做可点击卡片，target="_blank" 打开）
  ${content ? `页面说明摘录：${content.slice(0, 240)}${content.length > 240 ? '…' : ''}` : '请用卡片介绍这个交互作品，并链接到上述地址'}`;
  }
  if (a.type === 'code') {
    return `- [代码作品 ${n}] 标题：「${a.title}」${summary ? `，简介：${summary}` : ''}
  代码（可用 <pre><code> 展示）：
${content?.slice(0, 1200) || '（无代码内容）'}`;
  }
  return `- [作品 ${n}] 标题：「${a.title}」`;
}

export function buildAssetList(chosen: PortfolioAsset[], cardLayout?: string) {
  const useSections = cardLayout == null ? true : isTypeClassificationLayout(cardLayout);
  if (!useSections || chosen.length === 0) {
    return chosen.map((a, index) => formatOneAssetLine(a, index + 1)).join('\n\n');
  }

  const sections = groupPortfolioAssetsByType(chosen);
  // 未归入已知分区的作品（兜底）
  const knownTypes = new Set(PORTFOLIO_TYPE_SECTIONS.flatMap((s) => [...s.types]));
  const leftovers = chosen.filter((a) => !knownTypes.has(a.type));

  let n = 0;
  const parts: string[] = [];
  for (const section of sections) {
    parts.push(`### 分区：${section.emoji} ${section.title}（本区 ${section.items.length} 项，必须全部展示）`);
    for (const a of section.items) {
      n += 1;
      parts.push(formatOneAssetLine(a, n));
    }
  }
  if (leftovers.length > 0) {
    parts.push(`### 分区：📦 其他作品（本区 ${leftovers.length} 项，必须全部展示）`);
    for (const a of leftovers) {
      n += 1;
      parts.push(formatOneAssetLine(a, n));
    }
  }
  return parts.join('\n\n');
}

export function mergeHtml(data: { html?: string; css?: string; js?: string }): string {
  let out = data.html || '';
  if (data.css) out = out.replace(/<\/head>/i, `<style>${data.css}</style></head>`);
  if (data.js) out = out.replace(/<\/body>/i, `<script>${data.js}<\/script></body>`);
  return out;
}

export async function persistPortfolio(params: {
  htmlContent: string;
  form: PortfolioForm;
  chosen: PortfolioAsset[];
  projectId: string | null;
  publishedSlug: string | null;
  assetId: string | null;
  /** 基于哪一版继续改（版本树父节点） */
  parentVersionId?: string | null;
  /** 版本说明（如对话修改意见） */
  versionNotes?: string;
  /** 写入版本记录的 prompt；迭代时应传 buildIterationPrompt 结果 */
  promptOverride?: string;
}) {
  const {
    htmlContent,
    form,
    chosen,
    projectId,
    assetId,
    parentVersionId,
    versionNotes,
    promptOverride,
  } = params;
  const prompt =
    promptOverride ??
    buildPromptFromForm(form, buildAssetList(chosen, form.cardLayout), chosen.length, chosen);
  const parts = splitInlineWebParts(htmlContent);
  const metaBase = {
    kind: 'portfolio' as const,
    pickedAssetIds: chosen.map((c) => c.id),
    ...form,
  };

  const save = (pid: string | null, aid: string | null) =>
    persistWebAsset({
      title: PORTFOLIO_TITLE,
      html: parts.html || htmlContent,
      css: parts.css || undefined,
      js: parts.js || undefined,
      summary: `共 ${chosen.length} 个作品的展示网页`,
      prompt,
      description: PORTFOLIO_DESC,
      projectId: pid,
      assetId: aid,
      setAsHomepage: true,
      parentVersionId,
      versionNotes,
      meta: metaBase,
    });

  try {
    const saved = await save(projectId, assetId);
    if (saved.versionId) {
      await api.patch(`/assets/${saved.assetId}`, {
        meta: { ...metaBase, projectId: saved.projectId, slug: saved.slug, headVersionId: saved.versionId },
      });
    }
    return {
      projectId: saved.projectId,
      slug: saved.slug,
      assetId: saved.assetId,
      url: saved.url,
      versionId: saved.versionId,
    };
  } catch (e: unknown) {
    const msg = (e as Error)?.message || '';
    if (projectId && (msg.includes('不存在') || msg.includes('404') || msg.includes('无权'))) {
      const saved = await save(null, assetId);
      if (saved.versionId) {
        await api.patch(`/assets/${saved.assetId}`, {
          meta: { ...metaBase, projectId: saved.projectId, slug: saved.slug, headVersionId: saved.versionId },
        });
      }
      return {
        projectId: saved.projectId,
        slug: saved.slug,
        assetId: saved.assetId,
        url: saved.url,
        versionId: saved.versionId,
      };
    }
    throw e;
  }
}

export async function loadPortfolioState() {
  await syncLocalUploadWebProjectsToAssets().catch(() => {});
  const [all, projectsRes] = await Promise.all([fetchAssetsList({ all: true }), api.get('/web-projects')]);
  const selectableAssets = all.filter((a: PortfolioAsset) => isPortfolioSelectableAsset(a));

  const portfolioAsset = all.find((a: PortfolioAsset) => parseMeta((a as { meta?: unknown }).meta).kind === 'portfolio');
  const meta = portfolioAsset ? parseMeta((portfolioAsset as { meta?: unknown }).meta) : {};

  let projectId = typeof meta.projectId === 'string' ? meta.projectId : null;
  let publishedSlug = typeof meta.slug === 'string' ? meta.slug : null;
  const myProjects = projectsRes.data || [];

  if (!projectId) {
    const wp = myProjects.find((p: { title: string; id: string; slug?: string }) => p.title === PORTFOLIO_TITLE);
    if (wp) {
      projectId = wp.id;
      publishedSlug = wp.slug ?? publishedSlug;
    }
  } else if (!myProjects.some((p: { id: string }) => p.id === projectId)) {
    projectId = null;
    publishedSlug = null;
  }

  const selected: Record<string, boolean> = {};
  if (Array.isArray(meta.pickedAssetIds)) {
    for (const id of meta.pickedAssetIds) {
      if (typeof id === 'string') selected[id] = true;
    }
  }

  // 优先从 web-projects 当前 head 版本合并 HTML，避免素材库 content 滞后导致迭代总是基于初始版
  let html = (portfolioAsset as { content?: string } | undefined)?.content || '';
  if (!html && portfolioAsset?.id && !projectId) {
    html = await fetchAssetContent(portfolioAsset.id).catch(() => '');
  }
  let headVersionId =
    typeof meta.headVersionId === 'string' ? (meta.headVersionId as string) : null;

  if (projectId) {
    try {
      const projectRes = await api.get(`/web-projects/${projectId}`);
      headVersionId = (projectRes.data?.headVersionId as string | null) ?? headVersionId;
      const versions = (projectRes.data?.versions ?? []) as Array<{
        id: string;
        html?: string;
        css?: string;
        js?: string;
      }>;
      const head = headVersionId
        ? versions.find((v) => v.id === headVersionId) ?? versions[0]
        : versions[0];
      if (head?.html) {
        html = mergeWebHtml({ html: head.html, css: head.css, js: head.js });
      }
    } catch {
      // 拉取失败时回退 asset.content
    }
  }

  return {
    assets: selectableAssets,
    portfolioAsset,
    form: portfolioAsset ? formFromMeta(meta) : DEFAULT_FORM,
    html,
    selected,
    projectId,
    publishedSlug,
    assetId: portfolioAsset?.id ?? null,
    headVersionId,
    hasSaved: !!html,
  };
}
