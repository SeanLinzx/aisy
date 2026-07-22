import type { FreeformForm } from '@/components/course/games/freeform-app-shared';
import { DEFAULT_FORM } from '@/components/course/games/freeform-app-shared';
import type { PmPrdFields } from '@/lib/pm-prompts';
import type { PmPrdWizardAnswers, PmRequirementsInputMode } from '@/lib/pm-prd-wizard';
import { EMPTY_PRD } from '@/lib/pm-prompts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AiFlowNodeType = 'text' | 'image' | 'video';

/** 文字输入 vs 图片输入（图生文 / 图生图 / 图生视频） */
export type AiInputMode = 'text' | 'image';

export interface AiFlowNode {
  id: string;
  type: AiFlowNodeType;
  /** 默认 text；选 image 时生成页会自动加入图片上传区 */
  inputMode?: AiInputMode;
  label: string;
  inputDesc: string;
  outputDesc: string;
  systemPrompt?: string;
  position: { x: number; y: number };
}

export interface AiFlowEdge {
  id: string;
  source: string;
  target: string;
}

export interface AiFlowGraph {
  nodes: AiFlowNode[];
  edges: AiFlowEdge[];
  mode: 'linear' | 'dag';
}

export interface PmRequirementsData {
  interest: string;
  messages: ChatMessage[];
  prd: PmPrdFields;
  assetId?: string | null;
  inputMode?: PmRequirementsInputMode;
  wizardAnswers?: PmPrdWizardAnswers;
  wizardReviewStarted?: boolean;
  prdComplete?: boolean;
  savedAt: number;
}

export interface PmMiniAppData {
  form: FreeformForm;
  aiFlow: AiFlowGraph;
  html: string;
  step?: number;
  projectId?: string | null;
  assetId?: string | null;
  slug?: string | null;
  headVersionId?: string | null;
  savedAt: number;
}

/** 单个 AI 配置（单 AI 小应用游戏） */
export interface PmSingleAiConfig {
  type: AiFlowNodeType;
  /** 默认 text；选 image 时生成页会自动加入图片上传区 */
  inputMode?: AiInputMode;
  label: string;
  inputDesc: string;
  outputDesc: string;
  systemPrompt?: string;
  /** 选填：输入案例，用于帮助生成/完善系统提示词 */
  inputExample?: string;
  /** 选填：输出案例，用于帮助生成/完善系统提示词 */
  outputExample?: string;
}

export interface PmSingleAppData {
  form: FreeformForm;
  singleAi: PmSingleAiConfig;
  html: string;
  step?: number;
  projectId?: string | null;
  assetId?: string | null;
  slug?: string | null;
  headVersionId?: string | null;
  savedAt: number;
}

export type PmWorkflowAppData = PmMiniAppData;

export interface PmPitchData {
  sections: Record<PitchSectionKey, string>;
  assetId?: string | null;
  savedAt: number;
}

export type PitchSectionKey = 'background' | 'goal' | 'method' | 'effect' | 'outlook';

export const PITCH_SECTION_LABELS: { key: PitchSectionKey; title: string }[] = [
  { key: 'background', title: '背景（场景）' },
  { key: 'goal', title: '目标' },
  { key: 'method', title: '方法' },
  { key: 'effect', title: '应用效果' },
  { key: 'outlook', title: '展望' },
];

export function pitchSectionsToMarkdown(sections: Record<PitchSectionKey, string>): string {
  return PITCH_SECTION_LABELS.map(
    ({ key, title }) => `## ${title}\n${sections[key]?.trim() || '（待补充）'}`,
  ).join('\n\n');
}

export function hasPitchContent(sections: Record<PitchSectionKey, string>): boolean {
  return PITCH_SECTION_LABELS.some(({ key }) => Boolean(sections[key]?.trim()));
}

/** 素材库中展示的路演材料标题 */
export function buildPitchAssetTitle(): string {
  const prd = loadPmRequirements();
  const app = loadPmAppForPitch();
  const productName = prd?.prd?.productName?.trim();
  const appTopic = app?.form?.topic?.trim();
  const base = productName || appTopic;
  return base ? `${base} · 路演材料` : 'AI 小应用路演材料';
}

export const PM_REQUIREMENTS_KEY = 'course.pm.requirements';
export const PM_MINI_APP_KEY = 'course.pm.mini-app';
export const PM_SINGLE_APP_KEY = 'course.pm.single-app';
export const PM_WORKFLOW_APP_KEY = 'course.pm.workflow-app';
export const PM_PITCH_KEY = 'course.pm.pitch';

export const EMPTY_AI_FLOW: AiFlowGraph = { nodes: [], edges: [], mode: 'dag' };

export const DEFAULT_SINGLE_AI: PmSingleAiConfig = {
  type: 'text',
  inputMode: 'text',
  label: '我的 AI 助手',
  inputDesc: '',
  outputDesc: '',
  systemPrompt: '',
};

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLocal(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function savePmRequirements(data: Omit<PmRequirementsData, 'savedAt'>) {
  const payload: PmRequirementsData = { ...data, savedAt: Date.now() };
  writeLocal(PM_REQUIREMENTS_KEY, payload);
  return payload;
}

export function loadPmRequirements(): PmRequirementsData | null {
  return readLocal<PmRequirementsData>(PM_REQUIREMENTS_KEY);
}

/** 本机草稿：对话与说明书编辑后自动写入，供第 2 步「从需求说明书填表」读取 */
export function savePmRequirementsDraft(data: Omit<PmRequirementsData, 'savedAt'>) {
  return savePmRequirements(data);
}

export function savePmMiniApp(data: Omit<PmMiniAppData, 'savedAt'>) {
  return savePmWorkflowApp(data);
}

export function loadPmMiniApp(): PmMiniAppData | null {
  return loadPmWorkflowApp();
}

export function savePmSingleApp(data: Omit<PmSingleAppData, 'savedAt'>) {
  const payload: PmSingleAppData = { ...data, savedAt: Date.now() };
  writeLocal(PM_SINGLE_APP_KEY, payload);
  return payload;
}

export function loadPmSingleApp(): PmSingleAppData | null {
  return readLocal<PmSingleAppData>(PM_SINGLE_APP_KEY);
}

export function savePmWorkflowApp(data: Omit<PmWorkflowAppData, 'savedAt'>) {
  const payload: PmWorkflowAppData = { ...data, savedAt: Date.now() };
  writeLocal(PM_WORKFLOW_APP_KEY, payload);
  writeLocal(PM_MINI_APP_KEY, payload);
  return payload;
}

export function loadPmWorkflowApp(): PmWorkflowAppData | null {
  return (
    readLocal<PmWorkflowAppData>(PM_WORKFLOW_APP_KEY) ??
    readLocal<PmWorkflowAppData>(PM_MINI_APP_KEY)
  );
}

/** 路演导入：优先工作流小应用，否则单 AI 小应用 */
export function loadPmAppForPitch(): {
  form: FreeformForm;
  html: string;
  aiSummary: string;
  kind: 'workflow' | 'single' | null;
} | null {
  const workflow = loadPmWorkflowApp();
  if (workflow?.html) {
    return {
      form: workflow.form,
      html: workflow.html,
      aiSummary: describeAiFlow(workflow.aiFlow),
      kind: 'workflow',
    };
  }
  const single = loadPmSingleApp();
  if (single?.html) {
    return {
      form: single.form,
      html: single.html,
      aiSummary: describeSingleAi(single.singleAi),
      kind: 'single',
    };
  }
  return null;
}

export function savePmPitch(data: Omit<PmPitchData, 'savedAt'>) {
  const payload: PmPitchData = { ...data, savedAt: Date.now() };
  writeLocal(PM_PITCH_KEY, payload);
  return payload;
}

export function loadPmPitch(): PmPitchData | null {
  return readLocal<PmPitchData>(PM_PITCH_KEY);
}

export function defaultPmMiniAppData(): PmMiniAppData {
  return {
    form: { ...DEFAULT_FORM },
    aiFlow: { ...EMPTY_AI_FLOW, nodes: [], edges: [] },
    html: '',
    savedAt: 0,
  };
}

/** 检测 DAG 是否有环，并返回拓扑序 */
export function validateAiFlowDag(flow: AiFlowGraph): { ok: true; order: string[] } | { ok: false; reason: string } {
  const { nodes, edges } = flow;
  if (nodes.length === 0) return { ok: false, reason: '请至少添加一个 AI 节点。' };

  const ids = new Set(nodes.map((n) => n.id));
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) {
      return { ok: false, reason: '连线引用了不存在的节点。' };
    }
    if (e.source === e.target) return { ok: false, reason: '节点不能连自己。' };
  }

  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const d = (indeg.get(next) ?? 0) - 1;
      indeg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  if (order.length !== nodes.length) {
    return { ok: false, reason: 'AI 流程不能有环，请检查连线。' };
  }
  return { ok: true, order };
}

export function describeAiFlow(flow: AiFlowGraph): string {
  if (flow.nodes.length === 0) return '（未配置 AI 流程）';
  const check = validateAiFlowDag(flow);
  if (!check.ok) return flow.nodes.map((n) => `- ${n.label}（${n.type}）`).join('\n');
  const nodeMap = new Map(flow.nodes.map((n) => [n.id, n]));
  return check.order
    .map((id, i) => {
      const n = nodeMap.get(id)!;
      const preds = flow.edges.filter((e) => e.target === id).map((e) => nodeMap.get(e.source)?.label).filter(Boolean);
      return `${i + 1}. 【${n.label}】类型：${n.type}；输入：${n.inputDesc}；输出：${n.outputDesc}${preds.length ? `；上游：${preds.join('、')}` : ''}`;
    })
    .join('\n');
}

export function describeSingleAi(ai: PmSingleAiConfig): string {
  const typeLabel = ai.type === 'text' ? '生文' : ai.type === 'image' ? '生图' : '生视频';
  const examples =
    ai.inputExample?.trim() || ai.outputExample?.trim()
      ? `；案例：输入「${ai.inputExample?.trim() || '—'}」→ 输出「${ai.outputExample?.trim() || '—'}」`
      : '';
  return `【${ai.label || 'AI 助手'}】类型：${typeLabel}；输入：${ai.inputDesc}；输出：${ai.outputDesc}${ai.systemPrompt ? `；提示词：${ai.systemPrompt}` : ''}${examples}`;
}

/** 合并系统提示词与输入输出案例，供生成 HTML 与兜底 bridge 使用 */
export function resolveSingleAiSystemPrompt(ai: PmSingleAiConfig): string {
  const custom = ai.systemPrompt?.trim();
  const inputEx = ai.inputExample?.trim();
  const outputEx = ai.outputExample?.trim();
  const exampleBlock =
    inputEx || outputEx
      ? `\n\n【参考输入输出案例】\n${inputEx ? `输入示例：${inputEx}` : ''}${inputEx && outputEx ? '\n' : ''}${outputEx ? `输出示例：${outputEx}` : ''}\n请按案例的风格与格式回应，但不要照抄案例原文。`
      : '';

  if (custom) return `${custom}${exampleBlock}`;

  if (inputEx || outputEx) {
    return `你是「${ai.label || 'AI 助手'}」。任务：${ai.inputDesc} → ${ai.outputDesc}。${exampleBlock}\n用简单有趣的中文，适合小学生理解。`;
  }

  if (ai.type === 'image') {
    return '你是儿童友好的 AI 生图助手，根据描述生成清晰、色彩明亮的图片。';
  }
  if (ai.type === 'video') {
    return '你是儿童友好的 AI 生视频助手，根据描述生成简短有趣的视频。';
  }
  return '你是友好的儿童 AI 助手，用简单中文回答，语气活泼、句子短。';
}

export function validateSingleAi(ai: PmSingleAiConfig): string | null {
  if (!ai.label.trim()) return '请给这个 AI 起个名字。';
  if (!ai.inputDesc.trim() || !ai.outputDesc.trim()) return '请写清楚 AI 的输入和输出。';
  return null;
}

export function emptyPrd(): PmPrdFields {
  return { ...EMPTY_PRD, features: [] };
}

export const PM_CREATOR_STEP_KEY = 'course.pm.creator-step';

export interface PmCreatorEmbedProps {
  /** 嵌入「AI 应用创作者」三步流程 */
  embedded?: boolean;
  /** 点击「下一步」 */
  onNextStep?: () => void;
}

export function savePmCreatorStep(step: 1 | 2 | 3) {
  localStorage.setItem(PM_CREATOR_STEP_KEY, String(step));
}

export function loadPmCreatorStep(): 1 | 2 | 3 {
  try {
    const n = Number(localStorage.getItem(PM_CREATOR_STEP_KEY));
    if (n === 2 || n === 3) return n;
  } catch {
    /* ignore */
  }
  return 1;
}
