import { api } from '@/lib/api';
import { fetchAssetContent, fetchAssetsList } from '@/lib/assets-cache';
import { persistWebAsset } from '@/lib/persist-web-asset';
import { renderFilledSentence } from '@/components/course/fill-blank-sentence';
import {
  DEFAULT_FORM,
  INTERACTION_TEMPLATE,
  LAYOUT_TEMPLATE,
  SCENE_TEMPLATE,
  type FreeformForm,
} from './freeform-app-shared';
import { AI_API_PROMPT_HINT, DECLARATIVE_AI_ITERATION_HINT, wantsAiFeatures } from '@ai-camp/types';
import {
  buildPmSingleAiCodeExample,
  buildPmWorkflowAiCodeExample,
  buildImageUploadCodeExample,
} from '@/lib/pm-app-ai-wiring';
import { WEB_ITERATION_DELTA_RULES } from '@/lib/web-iteration-prompt';
import { prepareIterationSourceForPrompt } from '@/lib/web-iteration-base';
import {
  describeAiFlow,
  loadPmSingleApp,
  loadPmWorkflowApp,
  savePmSingleApp,
  savePmWorkflowApp,
  validateAiFlowDag,
  validateSingleAi,
  type AiFlowGraph,
  type PmSingleAiConfig,
} from '@/lib/pm-pipeline';

export { mergeWebHtml } from '@/lib/merge-web-html';
export type { FreeformForm };

export type PmPersistResult = {
  projectId: string;
  assetId: string;
  slug: string;
  url: string;
  versionId?: string;
};

export function commitPmSingleAppLocal(params: {
  form: FreeformForm;
  singleAi: PmSingleAiConfig;
  html: string;
  persisted: PmPersistResult;
}) {
  const prev = loadPmSingleApp();
  return savePmSingleApp({
    form: params.form,
    singleAi: params.singleAi,
    html: params.html,
    step: prev?.step,
    projectId: params.persisted.projectId,
    assetId: params.persisted.assetId,
    slug: params.persisted.slug,
    headVersionId: params.persisted.versionId ?? prev?.headVersionId ?? null,
  });
}

export function commitPmWorkflowAppLocal(params: {
  form: FreeformForm;
  aiFlow: AiFlowGraph;
  html: string;
  persisted: PmPersistResult;
}) {
  const prev = loadPmWorkflowApp();
  return savePmWorkflowApp({
    form: params.form,
    aiFlow: params.aiFlow,
    html: params.html,
    step: prev?.step,
    projectId: params.persisted.projectId,
    assetId: params.persisted.assetId,
    slug: params.persisted.slug,
    headVersionId: params.persisted.versionId ?? prev?.headVersionId ?? null,
  });
}

export const PM_PAGE_TITLE = '我的 AI 小应用';
export const PM_SINGLE_APP_DESC = '课程 · AI 产品经理 · 单 AI 小应用';
export const PM_WORKFLOW_APP_DESC = '课程 · AI 产品经理 · AI 工作流小应用';

function baseAppPrompt(form: FreeformForm) {
  return `请帮小学生做一个属于他自己的 AI 小应用网页（单文件 HTML，含内联 CSS 和 JavaScript）。

【场景】
- 主题：${form.topic.trim()}
- 给谁使用：${form.audience.trim()}
- 使用场景：${form.scenario.trim()}

【布局】
- 页面里有：${form.layoutItems.trim()}

【交互】
- 用户点击：${form.clickTarget.trim()}
- 页面反馈：${form.feedback.trim()}`;
}

export function buildPmSingleAppPrompt(form: FreeformForm, singleAi: PmSingleAiConfig) {
  const typeLabel = singleAi.type === 'text' ? '生文 AI' : singleAi.type === 'image' ? '生图 AI' : '生视频 AI';
  const inputModeLabel =
    singleAi.inputMode === 'image'
      ? singleAi.type === 'text'
        ? '图生文（用户先上传图片）'
        : singleAi.type === 'image'
          ? '图生图（用户先上传参考图）'
          : '图生视频（用户先上传参考图）'
      : '文字输入';
  const exampleSection =
    singleAi.inputExample?.trim() || singleAi.outputExample?.trim()
      ? `
【输入输出案例（选填，用于编写 system 提示词）】
${singleAi.inputExample?.trim() ? `- 输入案例：${singleAi.inputExample.trim()}` : ''}
${singleAi.outputExample?.trim() ? `- 输出案例：${singleAi.outputExample.trim()}` : ''}
${singleAi.systemPrompt?.trim() ? '- 请将案例风格融入已有系统提示词。' : '- 未写系统提示词时，请根据输入/输出说明与案例，在 __AI_CAMP__.text 的第二个参数编写合适的 system 提示词。'}`
      : '';
  return `${baseAppPrompt(form)}

【单个 AI】
- 名称：${singleAi.label.trim()}
- 类型：${typeLabel}
- 输入方式：${inputModeLabel}
- 输入：${singleAi.inputDesc.trim()}
- 输出：${singleAi.outputDesc.trim()}
${singleAi.systemPrompt?.trim() ? `- 系统提示词：${singleAi.systemPrompt.trim()}` : ''}${exampleSection}

小应用里只调用这一个 AI。用户操作后，把输入发给 AI，再把结果显示出来。
${AI_API_PROMPT_HINT}
${form.enableImageUpload ? '\n注意：图片上传区会由系统自动插入，你不必重复编写上传代码。' : ''}

【必须写入以下核心 JavaScript 逻辑（可调整 id/样式，但必须保留 __AI_CAMP__ 调用）】
${buildPmSingleAiCodeExample(singleAi)}

要求：
1. 儿童风格，活泼可爱、色彩明亮，紧扣「${form.topic.trim()}」这个主题。
2. 禁止在 JS 里写死 AI 输出内容；点击生成按钮必须调用 __AI_CAMP__。
3. 若需要记录用户进度（打卡、分数、清单等），使用 __AI_CAMP__.saveLocal / loadLocal 存到本机。
4. 可以留空初始输出区，或只放 placeholder 提示文字（不能放完整假故事）。
5. 输出单文件 HTML（含内联 CSS 和 JS），不要使用外部网络资源。
6. 只输出 HTML 代码，不要 Markdown 代码块。`;
}

export function buildPmWorkflowAppPrompt(form: FreeformForm, aiFlow: AiFlowGraph) {
  const flowDesc = describeAiFlow(aiFlow);
  return `${baseAppPrompt(form)}

【AI 工作流（DAG）】
${flowDesc}

按 DAG 拓扑顺序串联多个 AI：上游节点的输出作为下游节点的 prompt 或 references。
${AI_API_PROMPT_HINT}
${form.enableImageUpload ? '\n注意：图片上传区会由系统自动插入，你不必重复编写上传代码。' : ''}

【必须写入以下工作流 JavaScript 逻辑】
${buildPmWorkflowAiCodeExample(aiFlow)}

要求：
1. 儿童风格，活泼可爱、色彩明亮，紧扣「${form.topic.trim()}」这个主题。
2. 禁止 mock；必须按顺序 await __AI_CAMP__ 执行每个节点。
3. 输出单文件 HTML（含内联 CSS 和 JS），不要使用外部网络资源。
4. 只输出 HTML 代码，不要 Markdown 代码块。`;
}

/** @deprecated 使用 buildPmWorkflowAppPrompt */
export const buildPmAppPrompt = buildPmWorkflowAppPrompt;

export function buildPmAppIterationPrompt(
  html: string,
  instruction: string,
  blocksContext = '',
  config?: { singleAi: PmSingleAiConfig } | { aiFlow: AiFlowGraph },
) {
  const blockSection = blocksContext
    ? `【重点修改区域】\n${blocksContext}\n\n`
    : '';
  const uploadHint = /上传|选图|图片上传|file/i.test(instruction)
    ? `\n【图片上传参考代码】\n${buildImageUploadCodeExample()}`
    : '';
  const source = prepareIterationSourceForPrompt(html);
  const aiHint = wantsAiFeatures(instruction)
    ? `\n${DECLARATIVE_AI_ITERATION_HINT}${uploadHint}\n禁止 mock 占位；不要手写 __AI_CAMP__ 调用或 JS 字符串拼接到 HTML 属性。`
    : `\n${AI_API_PROMPT_HINT}\n保留已有功能与布局；若需新增 AI，请用 data-ai-action 声明式标记，由平台注入调用。${uploadHint}`;
  return `【上一版本完整 HTML 源码】（业务页面，共约 ${source.length} 字符 — 必须作为唯一基础做增量修改）
${source}

${blockSection}【修改意见】
${instruction.trim()}
${aiHint}

要求：
${WEB_ITERATION_DELTA_RULES}
1. 输出完整单文件 HTML，只输出 HTML 代码。
2. 保留空的 <script data-ai-camp-runtime> 占位标签即可（不要写运行时正文）。
3. 新增 AI 生文/生图/生视频时只用 data-ai-action 等属性，img/video 的 src 留空，禁止 src="'+变量+'" 写法。`;
}

export function validatePmFlow(aiFlow: AiFlowGraph): string | null {
  if (aiFlow.nodes.length === 0) return '请至少添加一个 AI 节点。';
  for (const n of aiFlow.nodes) {
    if (!n.label.trim() || !n.inputDesc.trim() || !n.outputDesc.trim()) {
      return `请完善 AI 节点「${n.label || n.id}」的名称、输入和输出说明。`;
    }
  }
  const check = validateAiFlowDag(aiFlow);
  if (!check.ok) return check.reason;
  return null;
}

export function buildPmAppSummary(form: FreeformForm) {
  return renderFilledSentence(
    INTERACTION_TEMPLATE.segments,
    INTERACTION_TEMPLATE.blanks,
    form as unknown as Record<string, string>,
  );
}

export async function persistPmSingleApp(params: {
  htmlContent: string;
  form: FreeformForm;
  singleAi: PmSingleAiConfig;
  projectId: string | null;
  assetId: string | null;
  parentVersionId?: string | null;
  versionNotes?: string;
}) {
  const { htmlContent, form, singleAi, projectId, assetId, parentVersionId, versionNotes } = params;
  return persistWebAsset({
    title: form.topic.trim() || PM_PAGE_TITLE,
    html: htmlContent,
    summary: buildPmAppSummary(form),
    prompt: buildPmAppSummary(form),
    description: PM_SINGLE_APP_DESC,
    projectId,
    assetId,
    parentVersionId,
    versionNotes,
    meta: { kind: 'web-page', sourceGame: 'pm-single-app', ...form, singleAi },
  });
}

export async function persistPmWorkflowApp(params: {
  htmlContent: string;
  form: FreeformForm;
  aiFlow: AiFlowGraph;
  projectId: string | null;
  assetId: string | null;
  parentVersionId?: string | null;
  versionNotes?: string;
}) {
  const { htmlContent, form, aiFlow, projectId, assetId, parentVersionId, versionNotes } = params;
  return persistWebAsset({
    title: form.topic.trim() || PM_PAGE_TITLE,
    html: htmlContent,
    summary: buildPmAppSummary(form),
    prompt: buildPmAppSummary(form),
    description: PM_WORKFLOW_APP_DESC,
    projectId,
    assetId,
    parentVersionId,
    versionNotes,
    meta: { kind: 'web-page', sourceGame: 'pm-workflow-app', ...form, aiFlow },
  });
}

/** @deprecated */
export const persistPmMiniApp = persistPmWorkflowApp;

function parseMeta(raw: unknown): Record<string, unknown> {
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

async function loadAppStateBySource(sourceGame: string, localLoader: () => Promise<unknown> | unknown) {
  const localData = (await localLoader()) as Record<string, unknown> | null;
  const localAssetId = typeof localData?.assetId === 'string' ? localData.assetId : null;
  const [all, projectsRes] = await Promise.all([fetchAssetsList({ all: true }), api.get('/web-projects')]);
  let asset = localAssetId ? all.find((a: { id: string }) => a.id === localAssetId) : undefined;
  if (!asset) {
    asset = all.find(
      (a: { meta?: unknown }) => parseMeta(a.meta).kind === 'web-page' && parseMeta(a.meta).sourceGame === sourceGame,
    );
  }
  const meta = asset ? parseMeta((asset as { meta?: unknown }).meta) : {};
  let html = (asset as { content?: string } | undefined)?.content || '';
  if (!html && asset?.id) {
    html = await fetchAssetContent(asset.id).catch(() => '');
  }
  let projectId = typeof meta.projectId === 'string' ? meta.projectId : (localData?.projectId as string | null) ?? null;
  let slug = typeof meta.slug === 'string' ? meta.slug : (localData?.slug as string | null) ?? null;
  const myProjects = projectsRes.data || [];
  if (projectId && !myProjects.some((p: { id: string }) => p.id === projectId)) {
    projectId = null;
    slug = null;
  }
  return { asset, meta, localData, projectId, slug, html };
}

export async function loadPmSingleAppState() {
  const { loadPmSingleApp, DEFAULT_SINGLE_AI } = await import('@/lib/pm-pipeline');
  const { asset, meta, localData, projectId, slug, html: htmlFromAsset } = await loadAppStateBySource('pm-single-app', loadPmSingleApp);
  const singleAi = (localData?.singleAi ?? meta.singleAi ?? DEFAULT_SINGLE_AI) as PmSingleAiConfig;
  return {
    assetId: asset?.id ?? (localData?.assetId as string | null) ?? null,
    projectId,
    slug,
    headVersionId: (localData?.headVersionId as string | null | undefined) ?? null,
    html: htmlFromAsset || (localData?.html as string) || '',
    form: asset ? formFromMeta(meta) : (localData?.form as FreeformForm) ?? DEFAULT_FORM,
    singleAi,
    hasSaved: !!(asset?.content || localData?.html),
  };
}

export async function loadPmWorkflowAppState() {
  const { loadPmWorkflowApp, EMPTY_AI_FLOW } = await import('@/lib/pm-pipeline');
  const { asset, meta, localData, projectId, slug, html: htmlFromAsset } = await loadAppStateBySource('pm-workflow-app', loadPmWorkflowApp);
  const aiFlow = (localData?.aiFlow ?? meta.aiFlow ?? EMPTY_AI_FLOW) as AiFlowGraph;
  return {
    assetId: asset?.id ?? (localData?.assetId as string | null) ?? null,
    projectId,
    slug,
    headVersionId: (localData?.headVersionId as string | null | undefined) ?? null,
    html: htmlFromAsset || (localData?.html as string) || '',
    form: asset ? formFromMeta(meta) : (localData?.form as FreeformForm) ?? DEFAULT_FORM,
    aiFlow,
    hasSaved: !!(asset?.content || localData?.html),
  };
}

/** @deprecated */
export const loadPmMiniAppState = loadPmWorkflowAppState;

export { SCENE_TEMPLATE, LAYOUT_TEMPLATE, INTERACTION_TEMPLATE, DEFAULT_FORM, validateSingleAi };
