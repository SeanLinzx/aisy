import type { PmPrdFields } from '@/lib/pm-prompts';

export type PmRequirementsInputMode = 'wizard' | 'chat';

export interface PmPrdWizardAnswers {
  scene: string;
  interestTag: string;
  extraInterest: string;
  targetUser: string;
  problem: string;
  problemDetail: string;
  solutionDirection: string;
  aiCapabilities: string[];
  productNameChoice: string;
}

export const EMPTY_WIZARD_ANSWERS: PmPrdWizardAnswers = {
  scene: '',
  interestTag: '',
  extraInterest: '',
  targetUser: '',
  problem: '',
  problemDetail: '',
  solutionDirection: '',
  aiCapabilities: [],
  productNameChoice: '',
};

export const PRD_WIZARD_SCENES = ['篮球', '宠物', '学习', '生活', '游戏'] as const;

export const PRD_INTEREST_BY_SCENE: Record<string, string[]> = {
  篮球: ['投篮', '运球', '比赛', '训练', '篮球明星'],
  宠物: ['猫咪', '狗狗', '宠物心情', '宠物照顾', '宠物游戏'],
  学习: ['英语', '数学', '阅读', '错题', '学习计划'],
  生活: ['时间安排', '购物选择', '生活记录', '整理物品', '健康习惯'],
  游戏: ['游戏规则', '游戏角色', '游戏关卡', '游戏挑战', '游戏故事'],
};

export const PRD_TARGET_USERS = [
  '我自己',
  '我的同学',
  '想学习篮球的小朋友',
  '宠物主人',
  '正在学习的同学',
  '喜欢玩游戏的小朋友',
  '我的家人',
] as const;

export const PRD_PROBLEMS_BY_SCENE: Record<string, string[]> = {
  篮球: ['不知道每天练什么', '动作做得不标准', '训练没有记录', '不会设计篮球挑战'],
  宠物: ['看不懂宠物的心情', '不知道怎样照顾宠物', '想记录宠物的日常', '不会给宠物设计小游戏'],
  学习: ['单词容易忘记', '错题不会分析', '不知道如何安排复习', '学习内容太无聊'],
  生活: ['总是忘记重要事情', '不知道应该怎样选择', '做事情的步骤太复杂', '想记录自己的生活'],
  游戏: ['看不懂游戏规则', '不知道下一步做什么', '游戏挑战不够有趣', '想设计自己的游戏关卡'],
};

export const PRD_SOLUTION_DIRECTIONS = [
  '给出建议',
  '制定计划',
  '生成文字',
  '生成图片',
  '修改图片',
  '看懂图片',
] as const;

export const PRD_AI_CAPABILITIES = [
  { id: 'text-to-text', label: '文生文', desc: '输入文字，AI 生成文字' },
  { id: 'text-to-image', label: '文生图', desc: '输入文字，AI 生成图片' },
  { id: 'image-edit', label: '图文生图', desc: '上传图片并输入要求，AI 生成修改后的图片' },
  { id: 'image-to-text', label: '图生文', desc: '上传图片，AI 生成图片描述或文字信息' },
] as const;

const BROAD_PROBLEM_RE = /所有人|所有问题|一切|全部|任何.*问题|帮助所有人/;

export function isBroadProblem(text: string): boolean {
  return BROAD_PROBLEM_RE.test(text.trim());
}

/** 根据场景、问题与解决方向推荐 AI 能力 */
export function recommendAiCapabilities(answers: Pick<PmPrdWizardAnswers, 'scene' | 'problem' | 'solutionDirection'>): string[] {
  const { problem, solutionDirection } = answers;
  const rec = new Set<string>();

  if (solutionDirection === '制定计划' || solutionDirection === '给出建议' || solutionDirection === '生成文字') {
    rec.add('text-to-text');
  }
  if (solutionDirection === '生成图片') {
    rec.add('text-to-image');
  }
  if (solutionDirection === '修改图片') {
    rec.add('image-edit');
  }
  if (solutionDirection === '看懂图片') {
    rec.add('image-to-text');
  }

  if (problem.includes('错题') || problem.includes('看懂')) rec.add('image-to-text');
  if (problem.includes('海报') || problem.includes('图片')) rec.add('text-to-image');
  if (problem.includes('记录') || problem.includes('计划') || problem.includes('练什么') || problem.includes('复习')) {
    rec.add('text-to-text');
  }
  if (problem.includes('设计') && answers.scene === '游戏') rec.add('text-to-text');

  if (rec.size === 0) rec.add('text-to-text');
  return [...rec];
}

function primaryCapability(ids: string[]): string {
  const order = ['text-to-text', 'text-to-image', 'image-edit', 'image-to-text'];
  return order.find((id) => ids.includes(id)) ?? 'text-to-text';
}

function capabilityLabels(ids: string[]): string {
  const map = new Map(PRD_AI_CAPABILITIES.map((c) => [c.id, c.label]));
  return ids.map((id) => map.get(id as typeof PRD_AI_CAPABILITIES[number]['id']) ?? id).join('、');
}

function buildUserInput(answers: PmPrdWizardAnswers, mainCap: string): string {
  const extra = answers.extraInterest.trim() ? `、${answers.extraInterest.trim()}` : '';
  const interest = `${answers.interestTag}${extra}`;

  switch (mainCap) {
    case 'text-to-image':
      return `与「${interest}」相关的文字描述（例如想要的画面、风格或主题）`;
    case 'image-edit':
      return `一张与「${answers.scene}」相关的图片，以及希望 AI 怎样修改（如换背景、加装饰）`;
    case 'image-to-text':
      return `一张与「${answers.problem}」相关的图片（如错题照片、宠物照片）`;
    default:
      if (answers.scene === '篮球') return '训练时间和想提高的篮球技能';
      if (answers.scene === '宠物') return '宠物的情况或想记录/了解的内容';
      if (answers.scene === '学习') return '学习内容或想复习/分析的内容';
      if (answers.scene === '生活') return '想安排、选择或记录的生活事项';
      return `与「${interest}」相关的文字信息`;
  }
}

function buildAiOutput(answers: PmPrdWizardAnswers, mainCap: string): string {
  switch (answers.solutionDirection) {
    case '制定计划':
      return `一份简单可执行的${answers.scene}相关计划`;
    case '给出建议':
      return '清晰、友好的建议或步骤说明';
    case '生成图片':
      return '符合描述的图片结果';
    case '修改图片':
      return '修改后的图片';
    case '看懂图片':
      return '对图片内容的文字说明或分析';
    default:
      break;
  }
  if (mainCap === 'text-to-image') return 'AI 生成的图片';
  if (mainCap === 'image-to-text') return 'AI 对图片的文字解读';
  if (answers.problem.includes('单词')) return '帮助记忆单词的内容（如故事、例句或练习）';
  if (answers.problem.includes('错题')) return '错题分析与讲解';
  return `帮助解决「${answers.problem}」的 AI 结果`;
}

function buildFeatures(answers: PmPrdWizardAnswers, mainCap: string): string[] {
  const features: string[] = [];
  features.push(`输入${buildUserInput(answers, mainCap).slice(0, 12)}…`);
  if (answers.solutionDirection === '制定计划') features.push('一键生成计划');
  else if (answers.solutionDirection === '生成图片') features.push('一键生成图片');
  else if (answers.solutionDirection === '修改图片') features.push('上传图片并修改');
  else if (answers.solutionDirection === '看懂图片') features.push('上传图片并解读');
  else features.push('点击生成 AI 结果');
  features.push('不满意可以重新生成');
  return features.slice(0, 3);
}

function buildTagline(answers: PmPrdWizardAnswers, productName: string): string {
  return `一个帮助${answers.targetUser}${answers.solutionDirection === '制定计划' ? '制定' : '解决'}「${answers.problem}」的 AI 小工具。`;
}

function scenePrefix(scene: string): string {
  const map: Record<string, string> = {
    篮球: '篮球',
    宠物: '宠物',
    学习: '学习',
    生活: '生活',
    游戏: '游戏',
  };
  return map[scene] ?? scene;
}

function suffixForSolution(dir: string): string {
  const map: Record<string, string> = {
    给出建议: '小顾问',
    制定计划: '小教练',
    生成文字: '小故事机',
    生成图片: '小画家',
    修改图片: '修图助手',
    看懂图片: '看懂助手',
  };
  return map[dir] ?? '小助手';
}

/** 自动生成 3 个产品名称供选择 */
export function suggestProductNames(answers: PmPrdWizardAnswers): string[] {
  if (!answers.scene || !answers.problem) return [];
  const prefix = scenePrefix(answers.scene);
  const suffix = suffixForSolution(answers.solutionDirection || '给出建议');
  const names = new Set<string>();
  names.add(`${prefix}${suffix}`);
  if (answers.interestTag) names.add(`${answers.interestTag}${suffix}`);
  if (answers.problem.length <= 8) names.add(`${answers.problem.slice(0, 6)}小帮手`);
  names.add(`我的${prefix}AI小工具`);
  return [...names].slice(0, 3);
}

export function buildInterestSummary(answers: PmPrdWizardAnswers): string {
  const parts = [answers.scene, answers.interestTag].filter(Boolean);
  if (answers.extraInterest.trim()) parts.push(answers.extraInterest.trim());
  return parts.join(' · ');
}

export function buildProblemSummary(answers: PmPrdWizardAnswers): string {
  const base = answers.problemDetail.trim() || answers.problem;
  return answers.problemDetail.trim() ? `${answers.problem}（${answers.problemDetail.trim()}）` : base;
}

export function wizardStepComplete(answers: PmPrdWizardAnswers, step: number): boolean {
  switch (step) {
    case 1:
      return Boolean(answers.scene && answers.interestTag);
    case 2:
      return Boolean(answers.targetUser && answers.problem && !isBroadProblem(buildProblemSummary(answers)));
    case 3:
      return Boolean(answers.solutionDirection && (answers.aiCapabilities.length > 0 || recommendAiCapabilities(answers).length > 0));
    case 4:
      return Boolean(answers.productNameChoice.trim() || suggestProductNames(answers)[0]);
    default:
      return false;
  }
}

export function buildWizardReviewFirstMessage(answers: PmPrdWizardAnswers): string {
  const caps = answers.aiCapabilities.length
    ? answers.aiCapabilities
    : recommendAiCapabilities(answers);
  const capLabels = capabilityLabels(caps);
  const problemText = buildProblemSummary(answers);
  const interestSummary = buildInterestSummary(answers);
  const name = answers.productNameChoice.trim() || suggestProductNames(answers)[0] || '待定';

  return `我完成了作品卡选择题，请帮我分析并完善需求说明书。如果「用户输入什么」「AI 输出什么」还不够清楚，请继续反问我。

【作品卡答案】
- 场景：${answers.scene}
- 兴趣：${interestSummary}
- 目标用户：${answers.targetUser}
- 要解决的问题：${problemText}
- 希望 AI 怎样帮助：${answers.solutionDirection}
- 选用的 AI 能力：${capLabels}
- 产品名称想法：${name}`;
}

export function buildHtmlPromptFromPrd(prd: PmPrdFields): string {
  return `请根据以下 AI 产品作品卡，制作一个简单的单页 HTML 工具。

【产品名称】${prd.productName}
【一句话介绍】${prd.tagline}
【目标用户】${prd.targetUsers}
【要解决的问题】${prd.problem}
【使用场景】${prd.scenario}
【AI 能力】${prd.aiCapabilities || '文生文'}
【用户输入】${prd.userInput || '文字描述'}
【AI 输出】${prd.aiOutput || 'AI 生成结果'}
【核心功能】
${(prd.features.length ? prd.features : ['输入', '生成', '重新生成']).map((f) => `- ${f}`).join('\n')}

要求：
1. 只实现一个主要任务和最多三个核心功能。
2. 页面包含：输入区域、生成按钮、结果展示区域。
3. 适合 6–12 岁小朋友使用，中文大字、界面简洁活泼。
4. 若需要 AI，使用 __AI_CAMP__ 运行时，不要写假数据。`;
}
