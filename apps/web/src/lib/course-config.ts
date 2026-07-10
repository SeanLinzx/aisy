// 课程模式（6 节课闯关）配置 —— 纯数据，不含 React，便于在 server / client 组件复用。
// 13 个小游戏对应 PDF《20260713 苏外 AI 训练营》课程规划。

export type GameStatus = 'playable' | 'placeholder';

export interface CourseGame {
  /** 路由 slug：/student/course/g/<slug> */
  slug: string;
  /** 用户需求中的功能编号（1-13） */
  num: number;
  title: string;
  emoji: string;
  desc: string;
  status: GameStatus;
}

export type ThemeColor = 'orange' | 'pink' | 'sky' | 'mint' | 'purple' | 'yellow';

export interface CourseTool {
  href: string;
  title: string;
  emoji: string;
  desc: string;
}

export interface CourseLesson {
  /** 路由 slug：/student/course/<slug> */
  slug: string;
  /** 第几节课（1-6） */
  index: number;
  title: string;
  subtitle: string;
  emoji: string;
  goal: string;
  color: ThemeColor;
  games: CourseGame[];
  /** 课程内直达的探索创作工具（生图/生视频等） */
  tools?: CourseTool[];
}

export const COURSE_LESSONS: CourseLesson[] = [
  {
    slug: 'lesson1',
    index: 1,
    title: 'AI 生活大探秘',
    subtitle: 'AI 侦探入营',
    emoji: '🕵️',
    goal: '理解 AI 的「眼睛、耳朵、大脑」，发现生活里的 AI，并完成作品卡 1.0。',
    color: 'orange',
    games: [
      { slug: 'group-grab', num: 0, title: '抢组分队', emoji: '👯', desc: '老师设置多个小组名称，大家在电脑上抢想去的小组，满员后自动调剂。', status: 'playable' },
      { slug: 'find-ai', num: 1, title: 'AI 助手在哪里', emoji: '🔍', desc: '在校园 / 家庭 / 公共场景里找出哪些是 AI。', status: 'playable' },
      { slug: 'turing-test', num: 2, title: '图灵测试小游戏', emoji: '🤖', desc: '猜猜哪些回答是 AI、哪些是小朋友写的。', status: 'playable' },
      { slug: 'work-card-1', num: 13, title: '作品卡 1.0', emoji: '📇', desc: '用语音记录今天的发现（回顾版）。', status: 'playable' },
    ],
    tools: [
      {
        href: '/student/course/deck/lesson1',
        title: 'AI 小侦探互动课件',
        emoji: '🕵️',
        desc: '跟着老师一起闯关：线索、测验、碎片收集，完整第一节课演示。',
      },
    ],
  },
  {
    slug: 'lesson2',
    index: 2,
    title: 'AI 生图',
    subtitle: '神笔马良 AI 工坊',
    emoji: '🎨',
    goal: '把脑海里的画面变成生图提示词，完成一次 AI 生图并迭代。',
    color: 'pink',
    games: [
      { slug: 'spot-diff', num: 3, title: 'AI 图片找不同', emoji: '🧐', desc: '找出两张 AI 图片的不同，再看看提示词差在哪。', status: 'playable' },
      { slug: 'keyword-image', num: 4, title: '关键词生图', emoji: '🧩', desc: '点选关键词，组合出提示词来生成图片。', status: 'playable' },
      { slug: 'decorate-room', num: 5, title: '给奶龙装修房间', emoji: '🐉', desc: '一句话一句话地把奶龙的房间装修起来。', status: 'playable' },
    ],
    tools: [
      {
        href: '/student/image?mode=free&from=course&lesson=lesson2',
        title: '自由生图',
        emoji: '✨',
        desc: '说出想法 → AI 优化提示词 → 生图并保存完整创作记录。',
      },
      {
        href: '/student/image?mode=guided&from=course&lesson=lesson2',
        title: 'AI 画图工作台',
        emoji: '🎨',
        desc: '用关键词或提示词直接生图，作品自动存入素材库。',
      },
    ],
  },
  {
    slug: 'lesson-text',
    index: 3,
    title: 'AI 生文',
    subtitle: '故事魔法师',
    emoji: '✍️',
    goal: '用填空卡片搭好故事骨架，写藏头诗，再让 AI 把文字变成统一画风的绘本。',
    color: 'yellow',
    games: [
      { slug: 'story-fill', num: 14, title: '填空编故事', emoji: '📝', desc: '为每个场景填写时间、地点、人物和事件，AI 串成完整童话。', status: 'playable' },
      { slug: 'acrostic-poem', num: 16, title: '生成藏头诗', emoji: '🎋', desc: '输入一串藏头字，说明想表达的意向，AI 帮你写一首藏头诗。', status: 'playable' },
      { slug: 'picture-book', num: 15, title: '绘本生成', emoji: '📚', desc: '逐页生成插图，统一画风与角色，第二页起参考第一页保持一致。', status: 'playable' },
    ],
    tools: [
      {
        href: '/student/text?from=course&lesson=lesson-text',
        title: 'AI 写文字',
        emoji: '✍️',
        desc: '自由输入想法，让 AI 帮你写故事、诗歌或说明文，并保存到素材库。',
      },
    ],
  },
  {
    slug: 'lesson3',
    index: 4,
    title: 'AI 生视频',
    subtitle: '小小 AI 导演',
    emoji: '🎬',
    goal: '学会用故事板描述视频，完成一轮视频生成与迭代。',
    color: 'sky',
    games: [
      { slug: 'video-detective', num: 6, title: 'AI 视频大侦探', emoji: '🎞️', desc: '看一看，哪些视频是 AI 生成的？', status: 'playable' },
      { slug: 'keyframe-order', num: 7, title: '关键帧排序', emoji: '🔢', desc: '把关键帧出现的顺序排对（选择题）。', status: 'placeholder' },
      { slug: 'frame-video', num: 8, title: '首尾帧生视频', emoji: '🪄', desc: '给首帧和尾帧，描述中间发生的事，生成视频。', status: 'playable' },
    ],
    tools: [
      {
        href: '/student/video?mode=free&from=course&lesson=lesson3',
        title: '自由生视频',
        emoji: '✨',
        desc: '说出想法 → AI 优化提示词 → 生视频并保存完整创作网页。',
      },
      {
        href: '/student/video?mode=guided&from=course&lesson=lesson3',
        title: '视频生成工作台',
        emoji: '🎬',
        desc: '填写描述提交异步任务，完成后视频存入素材库。',
      },
    ],
  },
  {
    slug: 'lesson4',
    index: 5,
    title: 'AI 与交互',
    subtitle: 'AI 网页积木课',
    emoji: '🧱',
    goal: '理解「内容」和「应用」的区别，学会用场景、布局、交互三件事描述一个小应用，并亲手做出小侦探·记忆力挑战、AI 作品集和自己的小应用。',
    color: 'purple',
    games: [
      { slug: 'cancel-subscription', num: 9, title: '来取消续费吧', emoji: '💳', desc: '黄金会员页面里找「取消续费」，再点「确认取消」！', status: 'playable' },
      { slug: 'layout-arrange', num: 10, title: '摆一摆页面布局', emoji: '🧩', desc: '把标题、按钮、内容、反馈这些零件拖到合适的位置，学会摆布局。', status: 'playable' },
      { slug: 'mini-interaction', num: 11, title: '做一个小交互', emoji: '👆', desc: '下拉选「点哪里 + 单击/双击/右键/拖拽 + 效果」，可一条一条叠加交互。', status: 'playable' },
      { slug: 'memory-match', num: 12, title: '小侦探·记忆力挑战', emoji: '🕵️', desc: '翻开线索卡，找出相同的侦探Emoji！做选择题定好场景、布局、交互，还能自己设定每关卡片数量、翻牌次数和时间限制，AI 生成见习/线索/王牌侦探三关翻牌游戏，登上侦探记忆力排行榜。', status: 'playable' },
      { slug: 'portfolio', num: 13, title: 'AI 作品集', emoji: '🖼️', desc: '选作品 + 填空说清楚场景、布局、交互三件事，一键生成我的作品展示页。', status: 'playable' },
      { slug: 'freeform-app', num: 14, title: '做自己的 AI 小应用', emoji: '🪄', desc: '自己选题！填空说清楚场景、布局、交互三件事，AI 帮你做出一个真正能玩的小应用。', status: 'playable' },
    ],
  },
  {
    slug: 'lesson5',
    index: 6,
    title: 'AI 创客打磨与巡演',
    subtitle: '打磨作品，总结分享',
    emoji: '🚀',
    goal: '回顾这学期做过的 AI 作品，完成作品卡 2.0，并分享自己的收获与思考。',
    color: 'mint',
    games: [
      { slug: 'work-card', num: 15, title: '作品卡 2.0', emoji: '📇', desc: '我学会了什么？我未来想做什么？用语音说说看。', status: 'playable' },
      { slug: 'detective-summary', num: 16, title: '大侦探总结分享', emoji: '🕵️', desc: 'AI 幻觉、智慧之盾、AI 伦理思辨……选出你的答案，讲讲你的收获，老师能实时看到。', status: 'playable' },
    ],
  },
];

export function getLesson(slug: string): CourseLesson | undefined {
  return COURSE_LESSONS.find((l) => l.slug === slug);
}

export function findGame(slug: string): { lesson: CourseLesson; game: CourseGame } | undefined {
  for (const lesson of COURSE_LESSONS) {
    const game = lesson.games.find((g) => g.slug === slug);
    if (game) return { lesson, game };
  }
  return undefined;
}

export interface FlatGame {
  game: CourseGame;
  lesson: CourseLesson;
}

/** 把所有课的游戏拉平成一个顺序列表 */
export function flatGames(): FlatGame[] {
  const out: FlatGame[] = [];
  for (const lesson of COURSE_LESSONS) for (const game of lesson.games) out.push({ game, lesson });
  return out;
}

/** 取某个游戏的上一个 / 下一个游戏（跨课连续） */
export function getAdjacentGames(slug: string): { prev: FlatGame | null; next: FlatGame | null } {
  const flat = flatGames();
  const idx = flat.findIndex((f) => f.game.slug === slug);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

export const THEME_GRADIENT: Record<ThemeColor, string> = {
  orange: 'from-orange-400 to-brand',
  pink: 'from-pink-400 to-rose-500',
  sky: 'from-sky-400 to-blue-500',
  mint: 'from-emerald-400 to-teal-500',
  purple: 'from-violet-500 to-fuchsia-500',
  yellow: 'from-amber-400 to-orange-500',
};

export const THEME_CARD: Record<ThemeColor, string> = {
  orange: 'kid-card-orange',
  pink: 'kid-card-pink',
  sky: 'kid-card-sky',
  mint: 'kid-card-mint',
  purple: 'kid-card-purple',
  yellow: 'kid-card-yellow',
};
