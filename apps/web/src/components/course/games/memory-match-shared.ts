import { api } from '@/lib/api';
import { persistWebAsset } from '@/lib/persist-web-asset';
import { splitInlineWebParts } from '@/lib/merge-web-html';
import type { ChoiceQuestionSpec } from '@/components/course/choice-question';

export { mergeWebHtml } from '@/lib/merge-web-html';

export interface MemoryMatchForm {
  sceneAudience: string;
  sceneTiming: string;
  layoutTheme: string;
  layoutColor: string;
  interactionFlip: string;
  interactionFeedback: string;
  level1Cards: string;
  level2Cards: string;
  level3Cards: string;
  flipLimitMode: string;
  timeLimitMode: string;
}

/** 统一游戏文案 —— 全站（课程说明、生成提示词、修改提示词）都必须使用同一套名字，避免每处名字不一样 */
export const MEMORY_MATCH_TITLE = '小侦探·记忆力挑战';
export const MEMORY_MATCH_SUBTITLE = '翻开线索卡，找出相同的侦探Emoji！';
export const MEMORY_MATCH_DESC = '课程 · 小侦探记忆力挑战翻牌配对游戏';
export const MEMORY_MATCH_LEADERBOARD_TITLE = '侦探记忆力排行榜';
export const MEMORY_MATCH_RANKING_RULE = '翻牌次数越少、完成时间越短，排名越高。';
/** 卡牌正面统一使用这 8 个侦探线索 emoji（正好覆盖第三关 8 对的需求） */
export const MEMORY_MATCH_CLUE_EMOJIS = ['🔍', '🗝️', '👣', '🔦', '📷', '🧤', '🔒', '🧩'];
export const MEMORY_MATCH_LEVELS = [
  { label: '见习侦探', cards: 8 },
  { label: '线索侦探', cards: 12 },
  { label: '王牌侦探', cards: 16 },
] as const;

export const SCENE_QUESTIONS: ChoiceQuestionSpec[] = [
  {
    key: 'sceneAudience',
    question: '🕹️ 这个小侦探记忆力挑战主要给谁玩？',
    options: [
      { value: '自己一个人挑战自己', label: '🧍 自己挑战自己' },
      { value: '和同学比赛谁是最强王牌侦探', label: '🤝 和同学比赛' },
      { value: '全家人一起玩', label: '👨‍👩‍👧 全家人一起玩' },
    ],
  },
  {
    key: 'sceneTiming',
    question: '⏰ 什么时候玩？',
    options: [
      { value: '课堂上闯关比赛', label: '🏫 课堂闯关比赛' },
      { value: '课后自己练习记忆力', label: '📚 课后练习' },
      { value: '周末和朋友一起玩', label: '🎉 周末和朋友玩' },
    ],
  },
];

export const LAYOUT_QUESTIONS: ChoiceQuestionSpec[] = [
  {
    key: 'layoutTheme',
    question: '🖼️ 卡背（没翻开时）显示什么符号？',
    options: [
      { value: '大号问号 ❓', label: '❓ 大号问号' },
      { value: '放大镜图案 🔍', label: '🔍 放大镜图案' },
      { value: '神秘锁头图案 🔒', label: '🔒 神秘锁头图案' },
    ],
  },
  {
    key: 'layoutColor',
    question: '🎨 整体配色风格？',
    options: [
      { value: '清新蓝绿的侦探黑板风', label: '🟢 侦探黑板风' },
      { value: '复古牛皮纸侦探风', label: '📜 复古牛皮纸风' },
      { value: '明亮活泼的卡通侦探风', label: '🌈 明亮活泼风' },
    ],
  },
];

export const INTERACTION_QUESTIONS: ChoiceQuestionSpec[] = [
  {
    key: 'interactionFlip',
    question: '👆 怎么翻牌？',
    options: [
      { value: '单击卡片翻开', label: '🖱️ 单击翻开' },
      { value: '双击卡片翻开', label: '🖱️🖱️ 双击翻开' },
    ],
  },
  {
    key: 'interactionFeedback',
    question: '✨ 找到相同线索、配对成功时有什么反馈？',
    options: [
      { value: '卡片发光并播放清脆音效', label: '💡 发光+音效' },
      { value: '卡片跳动一下并弹出放大镜星光特效', label: '🔍 放大镜星光' },
      { value: '卡片渐渐消失并显示侦探徽章加分特效', label: '🏅 侦探徽章加分' },
    ],
  },
];

/** 每一关的卡片数量可以自己选，标签（见习/线索/王牌侦探）不变，张数可以调 */
export const LEVEL_QUESTIONS: ChoiceQuestionSpec[] = [
  {
    key: 'level1Cards',
    question: '🃏 第一关｜见习侦探要几张牌？',
    options: [
      { value: '6', label: '6 张（3 对，更简单）' },
      { value: '8', label: '8 张（4 对，标准）' },
      { value: '10', label: '10 张（5 对，更难）' },
    ],
  },
  {
    key: 'level2Cards',
    question: '🃏 第二关｜线索侦探要几张牌？',
    options: [
      { value: '10', label: '10 张（5 对，更简单）' },
      { value: '12', label: '12 张（6 对，标准）' },
      { value: '14', label: '14 张（7 对，更难）' },
    ],
  },
  {
    key: 'level3Cards',
    question: '🃏 第三关｜王牌侦探要几张牌？',
    options: [
      { value: '14', label: '14 张（7 对，更简单）' },
      { value: '16', label: '16 张（8 对，标准）' },
      { value: '18', label: '18 张（9 对，更难）' },
    ],
  },
];

/** 翻牌次数、时间限制也可以自己设定，不选就是不限制 */
export const CHALLENGE_QUESTIONS: ChoiceQuestionSpec[] = [
  {
    key: 'flipLimitMode',
    question: '🔢 要不要限制翻牌次数？',
    options: [
      { value: 'none', label: '🆓 不限次数' },
      { value: 'tight', label: '🔥 正好够用（配对数×2）' },
      { value: 'loose', label: '😊 比较宽松（配对数×3）' },
    ],
  },
  {
    key: 'timeLimitMode',
    question: '⏰ 要不要限制每关时间？',
    options: [
      { value: 'none', label: '🆓 不限时间' },
      { value: '60', label: '⏱️ 每关 60 秒' },
      { value: '90', label: '⏱️ 每关 90 秒' },
      { value: '120', label: '⏱️ 每关 120 秒' },
    ],
  },
];

export const ALL_QUESTIONS: ChoiceQuestionSpec[] = [
  ...SCENE_QUESTIONS,
  ...LAYOUT_QUESTIONS,
  ...INTERACTION_QUESTIONS,
  ...LEVEL_QUESTIONS,
  ...CHALLENGE_QUESTIONS,
];

export const DEFAULT_FORM: MemoryMatchForm = {
  sceneAudience: SCENE_QUESTIONS[0].options[0].value,
  sceneTiming: SCENE_QUESTIONS[1].options[0].value,
  layoutTheme: LAYOUT_QUESTIONS[0].options[0].value,
  layoutColor: LAYOUT_QUESTIONS[1].options[0].value,
  interactionFlip: INTERACTION_QUESTIONS[0].options[0].value,
  interactionFeedback: INTERACTION_QUESTIONS[1].options[0].value,
  level1Cards: String(MEMORY_MATCH_LEVELS[0].cards),
  level2Cards: String(MEMORY_MATCH_LEVELS[1].cards),
  level3Cards: String(MEMORY_MATCH_LEVELS[2].cards),
  flipLimitMode: 'none',
  timeLimitMode: 'none',
};

function labelFor(questions: ChoiceQuestionSpec[], key: string, value: string): string {
  const q = questions.find((qq) => qq.key === key);
  const opt = q?.options.find((o) => o.value === value);
  return opt?.label || value;
}

/** 把关卡张数字符串解析为合法偶数（最少 4 张），解析失败时用默认值兜底 */
function parseCardCount(value: string, fallback: number): number {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 4) return fallback;
  return n % 2 === 0 ? n : n + 1;
}

function flipLimitLine(mode: string, pairs: number): string {
  switch (mode) {
    case 'none':
      return '不限制翻牌次数';
    case 'tight':
      return `目标翻牌次数为 ${pairs * 2} 次，超过也不强制失败，只在页面上温和提示「翻牌次数已超出目标，要不要重新挑战试试更快完成？」`;
    case 'loose':
      return `目标翻牌次数为 ${pairs * 3} 次，超过也不强制失败，只在页面上温和提示可以再挑战一次`;
    default:
      return mode || '不限制翻牌次数';
  }
}

function timeLimitLine(mode: string): string {
  switch (mode) {
    case 'none':
      return '不限制时间';
    case '60':
      return '每关限时 60 秒，超时不强制中断，只在页面上温和提示「时间到啦，要不要重新挑战一次？」并提供「重新挑战本关」按钮';
    case '90':
      return '每关限时 90 秒，超时不强制中断，只在页面上温和提示「时间到啦，要不要重新挑战一次？」并提供「重新挑战本关」按钮';
    case '120':
      return '每关限时 120 秒，超时不强制中断，只在页面上温和提示「时间到啦，要不要重新挑战一次？」并提供「重新挑战本关」按钮';
    default:
      return mode || '不限制时间';
  }
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

function formFromMeta(meta: Record<string, unknown>): MemoryMatchForm {
  const str = (key: keyof MemoryMatchForm, fallback: string) =>
    typeof meta[key] === 'string' ? (meta[key] as string) : fallback;
  return {
    sceneAudience: str('sceneAudience', DEFAULT_FORM.sceneAudience),
    sceneTiming: str('sceneTiming', DEFAULT_FORM.sceneTiming),
    layoutTheme: str('layoutTheme', DEFAULT_FORM.layoutTheme),
    layoutColor: str('layoutColor', DEFAULT_FORM.layoutColor),
    interactionFlip: str('interactionFlip', DEFAULT_FORM.interactionFlip),
    interactionFeedback: str('interactionFeedback', DEFAULT_FORM.interactionFeedback),
    level1Cards: str('level1Cards', DEFAULT_FORM.level1Cards),
    level2Cards: str('level2Cards', DEFAULT_FORM.level2Cards),
    level3Cards: str('level3Cards', DEFAULT_FORM.level3Cards),
    flipLimitMode: str('flipLimitMode', DEFAULT_FORM.flipLimitMode),
    timeLimitMode: str('timeLimitMode', DEFAULT_FORM.timeLimitMode),
  };
}

export function buildMemoryMatchSummary(form: MemoryMatchForm): string {
  return `${form.sceneAudience} · ${form.sceneTiming} · 卡背：${form.layoutTheme} · ${form.layoutColor} · ${form.interactionFlip} · 配对反馈：${form.interactionFeedback} · 关卡张数：${form.level1Cards}/${form.level2Cards}/${form.level3Cards} · 翻牌限制：${labelFor(CHALLENGE_QUESTIONS, 'flipLimitMode', form.flipLimitMode)} · 时间限制：${labelFor(CHALLENGE_QUESTIONS, 'timeLimitMode', form.timeLimitMode)}`;
}

export function buildMemoryMatchPrompt(form: MemoryMatchForm): string {
  const [lv1, lv2, lv3] = MEMORY_MATCH_LEVELS;
  const cards1 = parseCardCount(form.level1Cards, lv1.cards);
  const cards2 = parseCardCount(form.level2Cards, lv2.cards);
  const cards3 = parseCardCount(form.level3Cards, lv3.cards);
  const pairs1 = cards1 / 2;
  const pairs2 = cards2 / 2;
  const pairs3 = cards3 / 2;
  const maxPairs = Math.max(pairs1, pairs2, pairs3);
  const emojiNote =
    maxPairs > MEMORY_MATCH_CLUE_EMOJIS.length
      ? `卡牌正面优先使用下面这 8 个侦探线索 emoji：${MEMORY_MATCH_CLUE_EMOJIS.join(' ')}；如果某一关配对数超过 8，再自己补充 1-2 个风格一致的侦探主题 emoji（如 🚔🕵️‍♀️📜💼等），确保每一关都有足够不重复的图案。`
      : `卡牌正面（翻开后）只能使用下面这 8 个侦探线索 emoji，不要替换成其他图案：${MEMORY_MATCH_CLUE_EMOJIS.join(' ')}`;

  return `请帮小学生制作一个侦探主题的记忆力翻牌配对小游戏网页（单文件 HTML，含内联 CSS 和 JavaScript）。

【固定游戏文案 —— 必须原样使用，不能替换成别的说法】
- 游戏名称（页面主标题）：${MEMORY_MATCH_TITLE}
- 玩法说明（副标题，固定紧跟在主标题下方）：${MEMORY_MATCH_SUBTITLE}
- 三个关卡名称（名称固定，张数按下面【关卡设置】里的数字来）：
  - 第一关｜${lv1.label}
  - 第二关｜${lv2.label}
  - 第三关｜${lv3.label}
- 最终成绩页标题：${MEMORY_MATCH_LEADERBOARD_TITLE}
- 排名规则说明文案：${MEMORY_MATCH_RANKING_RULE}

【场景】
- 主要给谁玩：${form.sceneAudience}
- 什么时候玩：${form.sceneTiming}

【布局】
- 卡背（没翻开时）符号：${form.layoutTheme}
- 整体配色风格：${form.layoutColor}
- ${emojiNote}

【交互】
- 翻牌操作：${form.interactionFlip}
- 配对成功反馈：${form.interactionFeedback}

【关卡设置 —— 小朋友自己选的，必须按这个来，不能用别的张数】
- 第一关｜${lv1.label}：共 ${cards1} 张卡片（${pairs1} 对），翻牌次数限制：${flipLimitLine(form.flipLimitMode, pairs1)}
- 第二关｜${lv2.label}：共 ${cards2} 张卡片（${pairs2} 对），翻牌次数限制：${flipLimitLine(form.flipLimitMode, pairs2)}
- 第三关｜${lv3.label}：共 ${cards3} 张卡片（${pairs3} 对），翻牌次数限制：${flipLimitLine(form.flipLimitMode, pairs3)}
- 每关时间限制：${timeLimitLine(form.timeLimitMode)}

【游戏玩法规则 —— 必须严格实现，不能简化】
1. 开始界面：显示「${MEMORY_MATCH_TITLE}」主标题和「${MEMORY_MATCH_SUBTITLE}」副标题，有一个输入框让玩家输入自己的侦探昵称，输入后点击「开始挑战」进入第一关。若没填昵称，默认叫「无名侦探」。
2. 一共 3 关，按顺序闯关，每关开始时都要明确显示关卡名称、本关卡片数、翻牌次数目标和时间限制（若有），并重新洗牌打乱卡片顺序，严格按上面【关卡设置】的张数、翻牌次数限制、时间限制执行。
3. 每关规则：
   - 所有卡片初始背面朝上，统一显示${form.layoutTheme}；玩家${form.interactionFlip.includes('双击') ? '双击' : '单击'}卡片将其翻开，露出正面的线索 emoji。
   - 一次最多同时翻开 2 张未配对的卡片；若 emoji 相同则配对成功（${form.interactionFeedback}），两张卡片保持翻开状态且不可再点击；若不同，短暂展示后（约 0.8 秒）自动翻回背面，其间禁止再点其他卡片，避免手速太快导致判断出错。
   - 翻开卡片要用 CSS 实现翻牌动画效果（例如 3D 翻转 transform）。
   - 页面顶部状态栏要实时显示：当前关卡名称、⏱️用时（若有时间限制，用倒计时展示）、翻牌次数（若有次数目标，展示「已翻 x / 目标 y」）、配对进度。
   - 记录本关「翻牌次数」（每翻开一张算 1 次）和「用时」（从本关第一次翻牌开始计时，到全部配对完成为止，单位秒，精确到 0.1 秒）。
   - 若设置了翻牌次数限制或时间限制且被超出，按上面【关卡设置】里描述的方式温和提示，并提供「重新挑战本关」按钮，不要粗暴弹窗或强制跳走。
   - 全部卡片配对完成后，显示本关战绩（翻牌次数、用时），并提供「进入下一关」按钮（第三关完成后按钮改为「查看侦探成绩」）。
4. 三关全部完成后进入结算页，标题固定为「${MEMORY_MATCH_LEADERBOARD_TITLE}」：
   - 显示三关合计的「总翻牌次数」和「总用时」。
   - 综合分 = 总翻牌次数 * 2 + 总用时（秒），数值越小成绩越好；页面上要用一句话展示排名规则：「${MEMORY_MATCH_RANKING_RULE}」。
   - 把本次成绩（侦探昵称、总翻牌次数、总用时、综合分、完成时间）加入排行榜，数据保存在浏览器 localStorage 里（键名用 memoryMatchLeaderboard），下次打开页面时读取历史记录并继续累加，不会清空。
   - 排行榜按综合分从小到大排序，展示前 10 名并高亮显示本次玩家所在的行，前三名可以用 🥇🥈🥉 标记。
   - 提供「再玩一次」按钮，点击后清空当前进度、回到开始界面重新挑战（排行榜历史记录不清空）。
5. 页面要有小侦探主题的装饰元素（如放大镜 🔍、侦探帽 🕵、线索纸等），配色采用「${form.layoutColor}」。页面顶部或侧边要有小小的关卡指示，随时能看到当前进度。

【视觉与技术要求】
1. 儿童友好、色彩明亮活泼，不要使用外部图片/网络资源。
2. 必须用 JavaScript 真实实现上述全部玩法（洗牌算法、翻牌判断、计时器、倒计时、次数统计、关卡切换、排行榜、localStorage 读写），不能只是静态展示。
3. 输出单文件 HTML（含内联 CSS 和 JS）。
4. 只输出 HTML 代码本身，不要使用 Markdown 代码块包裹。`;
}

export function buildMemoryMatchIterationPrompt(html: string, instruction: string): string {
  return `这是我当前的「${MEMORY_MATCH_TITLE}」翻牌配对游戏 HTML：
${html}

【小朋友的修改意见】
${instruction.trim()}

要求：
1. 按修改意见调整，但必须保留下面这些固定文案和玩法，除非修改意见明确要求更改：
   - 游戏名称「${MEMORY_MATCH_TITLE}」和副标题「${MEMORY_MATCH_SUBTITLE}」
   - 三关命名「见习侦探 / 线索侦探 / 王牌侦探」（各关张数、翻牌次数限制、时间限制如果修改意见里提到就按新的来，没提到就保持原样）
   - 结算页标题「${MEMORY_MATCH_LEADERBOARD_TITLE}」，以及翻牌次数与用时统计、排名规则说明
2. 输出完整单文件 HTML（含内联 CSS 和 JavaScript），可直接运行。
3. 只输出 HTML 代码，不要 Markdown 代码块。`;
}

export async function persistMemoryMatch(params: {
  htmlContent: string;
  form: MemoryMatchForm;
  projectId: string | null;
  assetId: string | null;
}): Promise<{ projectId: string; slug: string; url: string; assetId: string }> {
  const { htmlContent, form, projectId, assetId } = params;
  const parts = splitInlineWebParts(htmlContent);
  const summary = buildMemoryMatchSummary(form);
  return persistWebAsset({
    title: MEMORY_MATCH_TITLE,
    html: parts.html || htmlContent,
    css: parts.css || undefined,
    js: parts.js || undefined,
    summary,
    prompt: summary,
    description: MEMORY_MATCH_DESC,
    projectId,
    assetId,
    meta: { kind: 'memory-match', sourceGame: 'memory-match', ...form },
  });
}

export async function loadMemoryMatchState() {
  const [assetsRes, projectsRes] = await Promise.all([api.get('/assets'), api.get('/web-projects')]);
  const all = assetsRes.data || [];
  const asset = all.find((a: { meta?: unknown }) => parseMeta(a.meta).kind === 'memory-match');
  const meta = asset ? parseMeta((asset as { meta?: unknown }).meta) : {};

  let projectId = typeof meta.projectId === 'string' ? meta.projectId : null;
  let slug = typeof meta.slug === 'string' ? meta.slug : null;
  const myProjects = projectsRes.data || [];
  if (projectId && !myProjects.some((p: { id: string }) => p.id === projectId)) {
    projectId = null;
    slug = null;
  }

  return {
    assetId: asset?.id ?? null,
    projectId,
    slug,
    html: asset?.content || '',
    form: asset ? formFromMeta(meta) : DEFAULT_FORM,
    hasSaved: !!asset?.content,
  };
}
