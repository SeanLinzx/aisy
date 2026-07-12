import { api } from '@/lib/api';
import { persistCourseWebProject } from '@/lib/course-web-project';
import { publishPath } from '@/lib/public-url';
import { splitInlineWebParts } from '@/lib/merge-web-html';
import { absoluteAssetUrl } from '@/lib/asset-path';
import { resolveEmbedUrl, resolveUploadPath } from '@/lib/upload-url';
import { renderFilledSentence } from '@/components/course/fill-blank-sentence';

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
export const PORTFOLIO_SELECTABLE_TYPES = [
  'text',
  'ppt',
  'image',
  'poster',
  'mixed',
  'video',
  'web',
  'code',
  'audio',
] as const;

export function isPortfolioSelectableAsset(asset: PortfolioAsset): boolean {
  if (!PORTFOLIO_SELECTABLE_TYPES.includes(asset.type as (typeof PORTFOLIO_SELECTABLE_TYPES)[number])) {
    return false;
  }
  const meta = parseMeta(asset.meta);
  return meta.kind !== 'portfolio';
}
export const PORTFOLIO_TITLE = '我的 AI 作品集';
export const PORTFOLIO_DESC = '课程 · 第5课 AI 作品集';

export const DEFAULT_FORM: PortfolioForm = {
  audience: '给爸爸妈妈和老师看',
  goal: '我这学期用 AI 做的所有创意作品',
  style: '活泼可爱、五彩缤纷的颜色',
  cover: '大标题和一段自我介绍',
  cardLayout: '按作品类型（图片/文字/视频/网页）分类',
  interactionRule: '鼠标移到卡片上，或用手指点一下卡片',
  interactionAction: '卡片会轻轻放大、出现阴影，并显示作品名称',
  interactionFeedback: '再点一次可以弹出大图或播放视频',
};

export const INTERACTION_TEMPLATE = {
  segments: ['👆 当访客「', '」的时候，「', '」，页面就会「', '」。'],
  blanks: [
    { key: 'interactionRule', placeholder: '什么时候触发', quickOptions: ['鼠标移到卡片上，或用手指点一下卡片', '点击卡片上的「查看详情」按钮'] },
    { key: 'interactionAction', placeholder: '做出什么动作', quickOptions: ['卡片会轻轻放大、出现阴影，并显示作品名称', '卡片会翻转，背面显示作品介绍'] },
    { key: 'interactionFeedback', placeholder: '页面出现什么', quickOptions: ['再点一次可以弹出大图或播放视频', '弹出一个介绍窗口，讲讲这个作品是怎么做的'] },
  ],
};

export function parseMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try {
    return JSON.parse(raw as string);
  } catch {
    return {};
  }
}

export function formFromMeta(meta: Record<string, unknown>): PortfolioForm {
  const str = (key: string, fallback: string) => (typeof meta[key] === 'string' ? (meta[key] as string) : fallback);
  return {
    audience: str('audience', DEFAULT_FORM.audience),
    goal: str('goal', typeof meta.scenarioNeed === 'string' ? (meta.scenarioNeed as string) : DEFAULT_FORM.goal),
    style: str('style', DEFAULT_FORM.style),
    cover: str('cover', DEFAULT_FORM.cover),
    cardLayout: str(
      'cardLayout',
      typeof meta.scenarioStyle === 'string' ? (meta.scenarioStyle as string) : DEFAULT_FORM.cardLayout,
    ),
    interactionRule: str('interactionRule', DEFAULT_FORM.interactionRule),
    interactionAction: str('interactionAction', DEFAULT_FORM.interactionAction),
    interactionFeedback: str('interactionFeedback', DEFAULT_FORM.interactionFeedback),
  };
}

export function buildPromptFromForm(form: PortfolioForm, assetList: string) {
  const interactionSummary = renderFilledSentence(
    INTERACTION_TEMPLATE.segments,
    INTERACTION_TEMPLATE.blanks,
    form as unknown as Record<string, string>,
  );

  return `请帮我把这些作品做成一个完整的「我的 AI 作品集」展示网页（单文件 HTML，含内联 CSS 和 JavaScript）。

【场景 · 给谁看、想展示什么】
- 给谁看：${form.audience.trim()}
- 想展示什么：${form.goal.trim()}

【布局 · 页面结构怎么摆】
- 整体风格：${form.style.trim()}
- 最上面（封面/标题区）：${form.cover.trim()}
- 作品卡片摆放方式：${form.cardLayout.trim()}

【交互 · 动作 / 规则 / 反馈】
- 什么时候触发：${form.interactionRule.trim()}
- 做出什么动作：${form.interactionAction.trim()}
- 页面反馈：${form.interactionFeedback.trim()}
- 交互规则总结：${interactionSummary}

作品清单：
${assetList}

要求：
1. 根据【场景】设计页面文案，根据【布局】安排页面结构、区域顺序和卡片摆放方式。
2. 根据【交互】部分，用 JavaScript 实现真实可点的交互（不能只是静态展示）。
3. 【作品清单】里的每一个作品都必须在页面中出现；不得遗漏，也不得用无关的占位图/示例内容替代。
4. 图片必须用清单里给出的精确 URL（<img src="…" style="max-width:100%">）；视频必须用清单里的精确 URL（<video controls src="…">）。
5. 文字/图文类作品要把提供的正文展示在卡片、弹窗或独立区域里。
6. 网页/交互类作品要做成可点击卡片，点击后在新窗口打开清单里给出的链接。
7. 输出单文件 HTML（含内联 CSS 和 JS）；不要使用未在清单中出现的图片、视频或外部资源。
8. 只输出 HTML 代码，不要 Markdown 代码块。`;
}

function pickMediaUrl(asset: PortfolioAsset): string {
  const meta = parseMeta(asset.meta);
  const candidates = [
    asset.url,
    asset.thumbnailUrl,
    ...(Array.isArray(meta.allUrls) ? (meta.allUrls as string[]) : []),
    ...(Array.isArray(meta.sourceUrls) ? (meta.sourceUrls as string[]) : []),
  ].filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
  return candidates[0] ? resolveEmbedUrl(candidates[0]) : '';
}

function pickReferenceImage(asset: PortfolioAsset): string {
  const meta = parseMeta(asset.meta);
  const refs = meta.references as Array<{ type?: string; url?: string }> | undefined;
  const refUrl = refs?.find((r) => r.type === 'image' && r.url)?.url;
  return refUrl ? resolveEmbedUrl(refUrl) : '';
}

function resolveWebAssetUrl(url: string): string {
  if (!url.trim()) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return absoluteAssetUrl(url.startsWith('/') ? url : `/${url}`);
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
  const blockSection = blocksContext
    ? `【小朋友点选的具体部分，请重点参考、优先修改这里（及其直接相关的样式/结构），尽量不要改动页面其他区域】
${blocksContext}

`
    : '';

  return `这是我当前的作品集网页 HTML：
${html}

${blockSection}【小学生的修改意见】
${instruction.trim()}

要求：
1. 按修改意见调整，并保持作品集里原有的作品都还在。如果上面没有给出「点选的具体部分」，说明修改意见是针对整页的，可以调整整页布局、配色、文案和交互。
2. 输出完整单文件 HTML（含内联 CSS 和 JavaScript），可直接运行。
3. 只输出 HTML 代码，不要 Markdown 代码块。`;
}

export function buildAssetList(chosen: PortfolioAsset[]) {
  return chosen
    .map((a, index) => {
      const n = index + 1;
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
    })
    .join('\n\n');
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
}) {
  const { htmlContent, form, chosen, projectId, publishedSlug, assetId } = params;
  const prompt = buildPromptFromForm(form, buildAssetList(chosen));
  let pid = projectId;
  let slug = publishedSlug;
  let url = slug ? publishPath(slug) : '';
  const parts = splitInlineWebParts(htmlContent);

  try {
    const saved = await persistCourseWebProject({
      title: PORTFOLIO_TITLE,
      html: parts.html || htmlContent,
      css: parts.css || undefined,
      js: parts.js || undefined,
      prompt,
      projectId: pid,
      description: PORTFOLIO_DESC,
      setAsHomepage: true,
    });
    pid = saved.projectId;
    slug = saved.slug;
    url = saved.url;
  } catch (e: unknown) {
    const msg = (e as Error)?.message || '';
    if (pid && (msg.includes('不存在') || msg.includes('404') || msg.includes('无权'))) {
      const saved = await persistCourseWebProject({
        title: PORTFOLIO_TITLE,
        html: parts.html || htmlContent,
        css: parts.css || undefined,
        js: parts.js || undefined,
        prompt,
        projectId: null,
        description: PORTFOLIO_DESC,
        setAsHomepage: true,
      });
      pid = saved.projectId;
      slug = saved.slug;
      url = saved.url;
    } else {
      throw e;
    }
  }

  const payload = {
    type: 'web' as const,
    title: PORTFOLIO_TITLE,
    summary: `共 ${chosen.length} 个作品的展示网页`,
    content: htmlContent,
    url,
    meta: {
      kind: 'portfolio',
      projectId: pid,
      slug,
      pickedAssetIds: chosen.map((c) => c.id),
      ...form,
    },
  };

  let nextAssetId = assetId;
  if (assetId) {
    await api.patch(`/assets/${assetId}`, payload);
  } else {
    const ar = await api.post('/assets', payload);
    nextAssetId = ar.data.id;
  }

  return { projectId: pid, slug, assetId: nextAssetId, url };
}

export async function loadPortfolioState() {
  const [assetsRes, projectsRes] = await Promise.all([api.get('/assets'), api.get('/web-projects')]);
  const all = assetsRes.data || [];
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

  return {
    assets: selectableAssets,
    portfolioAsset,
    form: portfolioAsset ? formFromMeta(meta) : DEFAULT_FORM,
    html: portfolioAsset?.content || '',
    selected,
    projectId,
    publishedSlug,
    assetId: portfolioAsset?.id ?? null,
    hasSaved: !!portfolioAsset?.content,
  };
}
