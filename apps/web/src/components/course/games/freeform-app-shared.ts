import { api } from '@/lib/api';
import { fetchAssetContent, fetchAssetsList } from '@/lib/assets-cache';
import { persistWebAsset } from '@/lib/persist-web-asset';
import { splitInlineWebParts } from '@/lib/merge-web-html';
import { loadWebProjectHead } from '@/lib/web-project-head';
import { renderFilledSentence, type FillBlankSpec } from '@/components/course/fill-blank-sentence';
import { DECLARATIVE_AI_ITERATION_HINT, wantsAiFeatures } from '@ai-camp/types';
import { prepareIterationSourceForPrompt } from '@/lib/web-iteration-base';
import { readKidLocalDraft, writeKidLocalDraft } from '@/lib/kid-app-local-draft';
import { WEB_ITERATION_DELTA_RULES } from '@/lib/web-iteration-prompt';

export { mergeWebHtml } from '@/lib/merge-web-html';

export interface FreeformForm {
  topic: string;
  audience: string;
  scenario: string;
  layoutItems: string;
  clickTarget: string;
  feedback: string;
  /** 创建时勾选：生成后自动插入图片上传区 */
  enableImageUpload: boolean;
}

export const FREEFORM_APP_LOCAL_KEY = 'kid-app.local.freeform';

export interface FreeformAppLocalData {
  form: FreeformForm;
  step: number;
  html: string;
  projectId?: string | null;
  assetId?: string | null;
  slug?: string | null;
}

export function saveFreeformAppLocal(data: FreeformAppLocalData) {
  return writeKidLocalDraft(FREEFORM_APP_LOCAL_KEY, data);
}

export function loadFreeformAppLocal(): FreeformAppLocalData | null {
  return readKidLocalDraft<FreeformAppLocalData>(FREEFORM_APP_LOCAL_KEY)?.data ?? null;
}

export const PAGE_TITLE_DEFAULT = '我的 AI 小应用';
export const FREEFORM_DESC = '课程 · 做自己的 AI 小应用';

export const DEFAULT_FORM: FreeformForm = {
  topic: '',
  audience: '',
  scenario: '',
  layoutItems: '',
  clickTarget: '',
  feedback: '',
  enableImageUpload: false,
};

export const SCENE_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['🎯 我的主题是「', '」，给「', '」使用，使用场景是「', '」。'],
  blanks: [
    {
      key: 'topic',
      placeholder: '想做什么小应用',
      quickOptions: ['我最喜欢的动物图鉴', '班级小任务打卡器', '心情能量补给站', '故事结局选择器'],
    },
    { key: 'audience', placeholder: '给谁用', quickOptions: ['同学和好朋友', '爸爸妈妈和家人'] },
    {
      key: 'scenario',
      placeholder: '什么时候用',
      multiline: true,
      quickOptions: ['课间休息或放学后想认识新动物的时候', '每天完成任务想打卡的时候'],
    },
  ],
};

export const LAYOUT_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['🧱 页面里有「', '」。'],
  blanks: [
    {
      key: 'layoutItems',
      placeholder: '页面上都有什么',
      multiline: true,
      quickOptions: ['大标题、几张图片卡片、点击后出现的介绍文字', '大标题、一个输入框、一个按钮、结果展示区'],
    },
  ],
};

export const INTERACTION_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['👆 用户点击「', '」，页面就会「', '」。'],
  blanks: [
    { key: 'clickTarget', placeholder: '点哪里', quickOptions: ['一张动物卡片', '「开始」按钮'] },
    {
      key: 'feedback',
      placeholder: '页面出现什么',
      multiline: true,
      quickOptions: ['弹出这只动物的名字和一条有趣小知识', '弹出一句鼓励的话，并记录今天已经完成'],
    },
  ],
};

export function buildFreeformSummary(form: FreeformForm): string {
  return renderFilledSentence(
    INTERACTION_TEMPLATE.segments,
    INTERACTION_TEMPLATE.blanks,
    form as unknown as Record<string, string>,
  );
}

export function buildFreeformPrompt(form: FreeformForm) {
  return `请帮小学生做一个属于他自己的 AI 小应用网页（单文件 HTML，含内联 CSS 和 JavaScript）。

【场景】
- 主题：${form.topic.trim()}
- 给谁使用：${form.audience.trim()}
- 使用场景：${form.scenario.trim()}

【布局】
- 页面里有：${form.layoutItems.trim()}

【交互】
- 用户点击：${form.clickTarget.trim()}
- 页面反馈：${form.feedback.trim()}

要求：
1. 儿童风格，活泼可爱、色彩明亮，紧扣「${form.topic.trim()}」这个主题设计文案和配色。
2. 必须实现真实可点的 JavaScript 交互，不能只是静态展示。
3. 可以预设 3～5 条示例内容，让页面一打开就有东西可以看、可以点。
4. 输出单文件 HTML（含内联 CSS 和 JS），不要使用外部网络资源。
5. 只输出 HTML 代码，不要 Markdown 代码块。`;
}

export function buildFreeformIterationPrompt(html: string, instruction: string, blocksContext = '') {
  const blockSection = blocksContext
    ? `【小朋友点选的具体部分，请重点参考、优先修改这里（及其直接相关的样式/结构），尽量不要改动页面其他区域】
${blocksContext}

`
    : '';

  const source = prepareIterationSourceForPrompt(html);
  return `【上一版本完整 HTML 源码】（业务页面，共约 ${source.length} 字符 — 必须作为唯一基础做增量修改）
${source}

${blockSection}【小学生的修改意见】
${instruction.trim()}
${wantsAiFeatures(instruction) ? `\n${DECLARATIVE_AI_ITERATION_HINT}\n禁止 mock 占位；img/video 的 src 留空。` : ''}

要求：
${WEB_ITERATION_DELTA_RULES}
输出完整单文件 HTML（含内联 CSS 和 JavaScript），可直接运行。保留空的 data-ai-camp-runtime 占位标签。只输出 HTML 代码，不要 Markdown 代码块。`;
}

export function parseMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try {
    return JSON.parse(raw as string);
  } catch {
    return {};
  }
}

function formFromMeta(meta: Record<string, unknown>): FreeformForm {
  const str = (key: keyof FreeformForm, fallback: string) =>
    typeof meta[key] === 'string' ? (meta[key] as string) : fallback;
  return {
    topic: str('topic', DEFAULT_FORM.topic),
    audience: str('audience', DEFAULT_FORM.audience),
    scenario: str('scenario', DEFAULT_FORM.scenario),
    layoutItems: str('layoutItems', DEFAULT_FORM.layoutItems),
    clickTarget: str('clickTarget', DEFAULT_FORM.clickTarget),
    feedback: str('feedback', DEFAULT_FORM.feedback),
    enableImageUpload: meta.enableImageUpload === true,
  };
}

export async function persistFreeformApp(params: {
  htmlContent: string;
  form: FreeformForm;
  projectId: string | null;
  assetId: string | null;
  parentVersionId?: string | null;
  versionNotes?: string;
  promptOverride?: string;
}): Promise<{ projectId: string; slug: string; url: string; assetId: string; versionId?: string }> {
  const { htmlContent, form, projectId, assetId, parentVersionId, versionNotes, promptOverride } = params;
  const parts = splitInlineWebParts(htmlContent);
  const summary = buildFreeformSummary(form);
  const metaBase = { kind: 'web-page' as const, sourceGame: 'freeform-app', ...form };
  const saved = await persistWebAsset({
    title: form.topic.trim() || PAGE_TITLE_DEFAULT,
    html: parts.html || htmlContent,
    css: parts.css || undefined,
    js: parts.js || undefined,
    summary,
    prompt: promptOverride ?? summary,
    description: FREEFORM_DESC,
    projectId,
    assetId,
    parentVersionId,
    versionNotes,
    meta: metaBase,
  });
  if (saved.versionId) {
    await api.patch(`/assets/${saved.assetId}`, {
      meta: { ...metaBase, projectId: saved.projectId, slug: saved.slug, headVersionId: saved.versionId },
    });
  }
  return saved;
}

export async function loadFreeformAppState() {
  const [all, projectsRes] = await Promise.all([fetchAssetsList({ all: true }), api.get('/web-projects')]);
  const asset = all.find(
    (a: { meta?: unknown }) => parseMeta(a.meta).kind === 'web-page' && parseMeta(a.meta).sourceGame === 'freeform-app',
  );
  const meta = asset ? parseMeta((asset as { meta?: unknown }).meta) : {};

  let projectId = typeof meta.projectId === 'string' ? meta.projectId : null;
  let slug = typeof meta.slug === 'string' ? meta.slug : null;
  let headVersionId = typeof meta.headVersionId === 'string' ? (meta.headVersionId as string) : null;
  const myProjects = projectsRes.data || [];
  if (projectId && !myProjects.some((p: { id: string }) => p.id === projectId)) {
    projectId = null;
    slug = null;
    headVersionId = null;
  }

  let html = (asset as { content?: string } | undefined)?.content || '';
  if (!html && asset?.id) {
    html = await fetchAssetContent(asset.id).catch(() => '');
  }
  if (projectId) {
    const headState = await loadWebProjectHead(projectId);
    if (headState?.headHtml) {
      html = headState.headHtml;
      headVersionId = headState.headVersionId ?? headVersionId;
      slug = headState.slug ?? slug;
    }
  }

  return {
    assetId: asset?.id ?? null,
    projectId,
    slug,
    headVersionId,
    html,
    form: asset ? formFromMeta(meta) : DEFAULT_FORM,
    hasSaved: !!html,
  };
}
