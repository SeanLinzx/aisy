/** AI 产品经理课程 — 系统提示词与 prompt 构建 */

export const PM_REQUIREMENTS_SYSTEM = `你是一名友善的 AI 产品经理导师，面向小学生。

你的任务：通过轻松对话，帮助小朋友从自己的兴趣出发，发现「想做什么 AI 产品、给谁用、解决什么问题」，并明确 AI 的输入与输出。

对话原则：
1. 每次只问 1～2 个简单问题，语气鼓励、不用专业术语。
2. 根据小朋友的回答逐步完善产品想法；不要一次给出完整说明书，除非信息已足够。
3. 重点确认：**用户需要输入什么**、**AI 会输出什么**、**用什么 AI 能力**——必须具体、可操作，不能含糊。
4. 每轮回复末尾必须附带一个 JSON 代码块（用 \`\`\`json 包裹），字段如下：
{
  "productName": "产品名称（可暂定为「待定」）",
  "tagline": "一句话介绍",
  "targetUsers": "目标用户",
  "problem": "要解决的问题",
  "features": ["核心功能1", "核心功能2", "核心功能3"],
  "scenario": "使用场景",
  "interestArea": "兴趣领域摘要",
  "aiCapabilities": "AI 能力（如：文生文、文生图）",
  "userInput": "用户具体需要输入什么（必须具体，例如：一段文字描述、一张宠物照片）",
  "aiOutput": "AI 具体会输出什么（必须具体，例如：三条训练建议、图片说明文字）",
  "htmlScope": "单页 HTML 工具的实现范围",
  "prdComplete": false
}
5. JSON 外的对话文字要简短、有表情符号，适合小朋友阅读。
6. 只有当 productName、problem、userInput、aiOutput、aiCapabilities 都已具体明确时，才在对话中说「需求说明书可以定稿啦」，并将 JSON 中 "prdComplete" 设为 true。`;

export const PM_WIZARD_REVIEW_SYSTEM = `你是一名友善的 AI 产品经理导师，面向小学生。

小朋友刚完成了「作品卡」选择题（场景、用户、问题、AI 能力等），**请不要直接照搬选项生成完整需求说明书**。

你需要：
1. 先用 2～3 句话总结你理解到的产品想法。
2. 检查「用户需要输入什么」和「AI 会输出什么」是否足够具体；若不够清楚，**每次只问 1～2 个简单的反问**，帮助小朋友想明白。
3. 根据小朋友在对话中的补充，逐步完善需求；语气鼓励、不用专业术语。
4. 每轮回复末尾必须附带 JSON 代码块（\`\`\`json），字段：
{
  "productName": "...",
  "tagline": "...",
  "targetUsers": "...",
  "problem": "...",
  "features": ["...", "..."],
  "scenario": "...",
  "interestArea": "...",
  "aiCapabilities": "...",
  "userInput": "用户具体输入什么（必须具体）",
  "aiOutput": "AI 具体输出什么（必须具体）",
  "htmlScope": "单页 HTML 工具范围",
  "prdComplete": false
}
5. 只有当 productName、problem、userInput、aiOutput、aiCapabilities 都已具体明确时，才说「需求说明书可以定稿啦」，并设 "prdComplete": true。
6. JSON 外的文字要简短、有表情符号。`;

export function buildRequirementsFirstMessage(interest: string) {
  return `我的兴趣是：${interest.trim()}。请帮我一起想想，可以做什么有趣的小产品？`;
}

export function buildPitchPrompt(params: {
  prdText: string;
  appSummary: string;
  aiFlowSummary: string;
}) {
  return `你是一名帮助小学生准备产品路演的老师助理。请根据以下材料，写一份路演框架文本。

【需求说明书】
${params.prdText}

【小应用描述】
${params.appSummary}

【AI 流程说明】
${params.aiFlowSummary}

请严格按以下 5 个章节输出 Markdown（每章用 ## 标题）：
## 背景（场景）
## 目标
## 方法
## 应用效果
## 展望

要求：语言适合小学生演讲，每段 3～5 句话，积极正面。`;
}

export function buildPrdToFormPrompt(prdMarkdown: string, interest?: string) {
  const interestBlock = interest?.trim()
    ? `\n【同学兴趣（可作补充参考）】\n${interest.trim()}\n`
    : '';
  return `你是儿童 AI 产品课助教。根据以下「AI 产品需求说明书」，帮小朋友填好做小网页应用需要的字段。
${interestBlock}
【需求说明书】
${prdMarkdown}

请只输出一个 JSON 代码块（\`\`\`json），字段如下：
{
  "topic": "小应用主题（简短，如：宠物日记助手）",
  "audience": "给谁用",
  "scenario": "什么时候/在哪里用",
  "layoutItems": "页面上要有什么元素（用顿号或逗号分隔）",
  "clickTarget": "用户主要会点击什么按钮或区域",
  "feedback": "点击后页面会出现什么效果",
  "aiLabel": "AI 助手名字",
  "aiType": "text 或 image 或 video（只能是这三个英文值之一）",
  "aiInputDesc": "AI 接收什么输入",
  "aiOutputDesc": "AI 输出什么"
}

要求：语言适合小学生，每项 1～2 句，紧扣需求说明书，不要照抄原文。aiType 必须严格为 text、image 或 video 之一。`;
}

export function normalizePmAiType(raw?: string): 'text' | 'image' | 'video' {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return 'text';
  if (s === 'image' || s.includes('图') || s.includes('draw')) return 'image';
  if (s === 'video' || s.includes('视频') || s.includes('clip')) return 'video';
  return 'text';
}

/** 需求说明书是否有足够内容可供转译填表 */
export interface PmPrdAiPatch extends Partial<PmPrdFields> {
  prdComplete?: boolean;
}

/** 需求说明书核心字段是否已填写（含 AI 输入输出） */
export function isPrdFieldsComplete(prd: PmPrdFields): boolean {
  return Boolean(
    prd.productName?.trim()
    && prd.problem?.trim()
    && prd.targetUsers?.trim()
    && prd.userInput?.trim()
    && prd.aiOutput?.trim()
    && (prd.aiCapabilities?.trim() || (prd.features?.length ?? 0) > 0),
  );
}

/** 需求说明书是否已完善（AI 确认 + 字段齐全） */
export function isPrdComplete(prd: PmPrdFields, aiMarkedComplete?: boolean): boolean {
  return Boolean(aiMarkedComplete && isPrdFieldsComplete(prd));
}

export function isPrdMarkedCompleteInReply(
  patch: PmPrdAiPatch | null,
  replyText?: string,
): boolean {
  if (patch?.prdComplete === true) return true;
  return Boolean(replyText && /需求说明书可以定稿/.test(replyText));
}

/** 需求说明书是否有足够内容可供转译填表 */
export function hasPmPrdContent(prd: PmPrdFields, interest?: string): boolean {
  if (interest?.trim()) return true;
  return Boolean(
    prd.productName?.trim()
    || prd.tagline?.trim()
    || prd.targetUsers?.trim()
    || prd.problem?.trim()
    || prd.scenario?.trim()
    || (prd.features?.length ?? 0) > 0,
  );
}

export interface PmPrdToFormFields {
  topic?: string;
  audience?: string;
  scenario?: string;
  layoutItems?: string;
  clickTarget?: string;
  feedback?: string;
  aiLabel?: string;
  aiType?: 'text' | 'image' | 'video' | string;
  aiInputDesc?: string;
  aiOutputDesc?: string;
}

export function parseJsonBlock<T>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const jsonFence = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (jsonFence) {
    try {
      return JSON.parse(jsonFence[1].trim()) as T;
    } catch {
      /* try other strategies */
    }
  }

  const anyFence = trimmed.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  if (anyFence) {
    try {
      return JSON.parse(anyFence[1].trim()) as T;
    } catch {
      /* try other strategies */
    }
  }

  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      /* try other strategies */
    }
  }

  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]) as T;
    } catch {
      return null;
    }
  }

  return null;
}

export function parsePrdFromAiReply(text: string): PmPrdAiPatch | null {
  return parseJsonBlock<PmPrdAiPatch>(text);
}

export function parsePrdToFormReply(text: string): PmPrdToFormFields | null {
  return parseJsonBlock<PmPrdToFormFields>(text);
}

export function stripPrdJsonBlock(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, '').trim();
}

export interface PmPrdFields {
  productName: string;
  tagline: string;
  targetUsers: string;
  problem: string;
  features: string[];
  scenario: string;
  /** 选择题向导：兴趣领域摘要 */
  interestArea?: string;
  /** 选择题向导：AI 能力（如 文生文、文生图） */
  aiCapabilities?: string;
  /** 选择题向导：用户需要输入什么 */
  userInput?: string;
  /** 选择题向导：AI 会输出什么 */
  aiOutput?: string;
  /** 选择题向导：HTML 页面实现范围 */
  htmlScope?: string;
}

export const EMPTY_PRD: PmPrdFields = {
  productName: '',
  tagline: '',
  targetUsers: '',
  problem: '',
  features: [],
  scenario: '',
  interestArea: '',
  aiCapabilities: '',
  userInput: '',
  aiOutput: '',
  htmlScope: '',
};

export function mergePrd(current: PmPrdFields, patch: Partial<PmPrdFields> | null): PmPrdFields {
  if (!patch) return current;
  return {
    productName: patch.productName?.trim() || current.productName,
    tagline: patch.tagline?.trim() || current.tagline,
    targetUsers: patch.targetUsers?.trim() || current.targetUsers,
    problem: patch.problem?.trim() || current.problem,
    features: Array.isArray(patch.features) && patch.features.length ? patch.features : current.features,
    scenario: patch.scenario?.trim() || current.scenario,
    interestArea: patch.interestArea?.trim() || current.interestArea,
    aiCapabilities: patch.aiCapabilities?.trim() || current.aiCapabilities,
    userInput: patch.userInput?.trim() || current.userInput,
    aiOutput: patch.aiOutput?.trim() || current.aiOutput,
    htmlScope: patch.htmlScope?.trim() || current.htmlScope,
  };
}

export function prdToMarkdown(prd: PmPrdFields): string {
  const features = prd.features.length ? prd.features.map((f) => `- ${f}`).join('\n') : '- （待补充）';
  const extra = [
    prd.interestArea?.trim() ? `## 我感兴趣的领域\n${prd.interestArea}\n` : '',
    prd.aiCapabilities?.trim() ? `## AI 能力\n${prd.aiCapabilities}\n` : '',
    prd.userInput?.trim() ? `## 用户需要输入什么\n${prd.userInput}\n` : '',
    prd.aiOutput?.trim() ? `## AI 会输出什么\n${prd.aiOutput}\n` : '',
    prd.htmlScope?.trim() ? `## HTML 页面实现范围\n${prd.htmlScope}\n` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `# ${prd.productName || 'AI 产品需求说明书'}

## 一句话介绍
${prd.tagline || '（待补充）'}

## 目标用户
${prd.targetUsers || '（待补充）'}

## 要解决的问题
${prd.problem || '（待补充）'}

## 核心功能
${features}

## 使用场景
${prd.scenario || '（待补充）'}
${extra ? `\n${extra}` : ''}`;
}
