// 课程模式（7 节课闯关）配置 —— 纯数据，不含 React，便于在 server / client 组件复用。
// 13 个小游戏对应 PDF《20260713 苏外 AI 训练营》课程规划。

import type { Locale } from '@/lib/i18n/types';
import { COURSE_LESSONS_EN } from '@/lib/i18n/course-lessons-en';

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
  /** 第几节课（1-7） */
  index: number;
  title: string;
  subtitle: string;
  emoji: string;
  goal: string;
  color: ThemeColor;
  games: CourseGame[];
  /** 课节页顶部独立主打入口（对应 games 里某个 slug） */
  featuredSlug?: string;
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
      { slug: 'digit-detective', num: 14, title: '手写数字识别', emoji: '✍️', desc: '在屏幕上写数字，看看 AI 能不能认出来！', status: 'playable' },
      { slug: 'pose-play', num: 15, title: '姿势识别挑战', emoji: '📷', desc: '对着摄像头做动作，体验 AI 的「眼睛」！', status: 'playable' },
      { slug: 'turing-test', num: 2, title: '图灵测试小游戏', emoji: '🤖', desc: '猜猜哪些回答是 AI、哪些是小朋友写的。', status: 'playable' },
      { slug: 'work-card-1', num: 13, title: '作品卡 1.0', emoji: '📇', desc: '写下今天的发现（回顾版）。', status: 'playable' },
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
      { slug: 'free-image', num: 5, title: '自由生图', emoji: '✨', desc: '用自己的话描述想画什么，直接让 AI 画出来。', status: 'playable' },
      { slug: 'decorate-room', num: 6, title: '给奶龙装修房间', emoji: '🐉', desc: '一句话一句话地把奶龙的房间装修起来。', status: 'playable' },
    ],
    tools: [
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
      { slug: 'clue-card-detective', num: 17, title: 'AI 线索卡大侦探', emoji: '🕵️', desc: '一边是常驻的线索卡，一边是被 AI 篡改的课文，对照线索卡点出写错的地方。', status: 'playable' },
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
      { slug: 'video-detective', num: 6, title: 'AI 视频识别', emoji: '🎞️', desc: '看老师大屏上的视频，在电脑上选答案；老师能实时看到全班选项。', status: 'playable' },
      { slug: 'ai-director', num: 7, title: 'AI 小导演', emoji: '🎬', desc: '三步完成短片：剧本创作 → 分镜创作 → 视频创作，每步可一键导入上一步成果。', status: 'playable' },
      { slug: 'video-studio', num: 8, title: '自由生视频', emoji: '✨', desc: '无首帧、有首帧或首尾帧自由生视频，填写描述后直接生成。', status: 'playable' },
    ],
    tools: [
      {
        href: '/student/course/g/ai-director',
        title: 'AI 小导演',
        emoji: '🎬',
        desc: '剧本 → 分镜 → 视频三步流水线，每步可一键导入。',
      },
      {
        href: '/student/course/g/video-studio',
        title: '自由生视频工作台',
        emoji: '✨',
        desc: '无首帧、有首帧或首尾帧自由生视频，作品自动同步到老师看板。',
      },
    ],
  },
  {
    slug: 'lesson4',
    index: 5,
    title: 'AI 与交互',
    subtitle: 'AI 网页积木课',
    emoji: '🧱',
    goal: '理解「内容」和「应用」的区别，学会用场景、布局、交互三件事描述一个小应用，并亲手优化小侦探·记忆力挑战、用选择题设计翻牌游戏、做出 AI 作品集和自己的小应用。',
    color: 'purple',
    games: [
      { slug: 'cancel-subscription', num: 9, title: '来取消续费吧', emoji: '💳', desc: '黄金会员页面里找「取消续费」，再点「确认取消」！', status: 'playable' },
      { slug: 'layout-arrange', num: 10, title: '摆一摆侦探游戏布局', emoji: '🧩', desc: '把游戏标题、计时器、卡牌区、按钮、查看提示、成绩这 6 个零件拖到合适的位置，摆完点「提交检查」，AI 会给你小建议。', status: 'playable' },
      { slug: 'mini-interaction', num: 11, title: '做一个小交互', emoji: '👆', desc: '下拉选「点哪里 + 单击/双击/右键/拖拽 + 效果」，可一条一条叠加交互。', status: 'playable' },
      { slug: 'memory-match', num: 12, title: '小侦探·记忆力挑战', emoji: '🕵️', desc: '每人默认有一份可玩的两关翻牌小游戏，可直接进「小游戏优化」改细节、试玩或打开游戏网页。', status: 'playable' },
      { slug: 'memory-match-create', num: 13, title: '设计你的侦探翻牌游戏', emoji: '🎨', desc: '分四步做选择题：选场景、布局、交互和难度，AI 按你的选择生成见习/线索/王牌侦探三关翻牌游戏，生成后可继续优化。', status: 'playable' },
      { slug: 'portfolio', num: 14, title: 'AI 作品集', emoji: '🖼️', desc: '选作品 + 填空说清楚布局、交互，一键生成包含全部选中作品的作品展示页。', status: 'playable' },
      { slug: 'freeform-app', num: 15, title: '做自己的 AI 小应用', emoji: '🪄', desc: '自己选题！填空说清楚场景、布局、交互三件事，AI 帮你做出一个真正能玩的小应用。', status: 'playable' },
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
      { slug: 'work-card', num: 16, title: '作品卡 2.0', emoji: '📇', desc: '我学会了什么？我未来想做什么？写下来说说看。', status: 'playable' },
      { slug: 'detective-summary', num: 17, title: '大侦探总结分享', emoji: '🕵️', desc: 'AI 幻觉、智慧之盾、AI 伦理思辨……选出你的答案，讲讲你的收获，老师能实时看到。', status: 'playable' },
    ],
  },
  {
    slug: 'lesson-pm',
    index: 7,
    title: 'AI 产品经理',
    subtitle: '从想法到小应用路演',
    emoji: '💼',
    goal: '从兴趣出发挖掘产品需求，用「AI 应用创作者」完成需求说明书、小应用与路演材料；也可单独练习各环节。',
    color: 'yellow',
    featuredSlug: 'pm-creator',
    games: [
      {
        slug: 'pm-creator',
        num: 0,
        title: 'AI 应用创作者',
        emoji: '💼',
        desc: '三步一气呵成：需求说明书 → 小应用 → 路演材料。每步可保存，下一步会自动读取并用 AI 转译上一步内容。',
        status: 'playable',
      },
      { slug: 'pm-requirements', num: 18, title: '问题挖掘与需求说明书撰写', emoji: '📝', desc: '用选择题向导或 AI 对话完成作品卡，撰写 AI 产品需求说明书。', status: 'playable' },
      { slug: 'pm-prompt-test', num: 19, title: 'AI 系统提示词测试', emoji: '🧪', desc: '同一任务换不同 AI 人设和画风，在有趣案例里对比生文、生图差异。', status: 'playable' },
      { slug: 'pm-single-app', num: 20, title: '单 AI 小应用', emoji: '🪄', desc: '填空描述场景、布局、交互，配置一个 AI，生成可迭代的小应用。', status: 'playable' },
      { slug: 'pm-workflow-app', num: 21, title: 'AI 工作流小应用', emoji: '🔗', desc: '用 DAG 设计多个 AI 组成工作流，生成可串联调用的小应用。', status: 'playable' },
      { slug: 'pm-pitch', num: 22, title: 'AI 小应用路演材料准备', emoji: '🎤', desc: '导入需求说明书和小应用，生成背景、目标、方法、应用效果、展望五段路演框架。', status: 'playable' },
    ],
    tools: [
      {
        href: '/student/pm-applications',
        title: '我的 AI 应用',
        emoji: '💼',
        desc: '查看已保存的完整三步作品，继续编辑或新建下一个 AI 产品。',
      },
    ],
  },
];

export function getCourseLessons(locale: Locale = 'zh'): CourseLesson[] {
  return locale === 'en' ? COURSE_LESSONS_EN : COURSE_LESSONS;
}

export function getLesson(slug: string, locale: Locale = 'zh'): CourseLesson | undefined {
  return getCourseLessons(locale).find((l) => l.slug === slug);
}

export function findGame(slug: string, locale: Locale = 'zh'): { lesson: CourseLesson; game: CourseGame } | undefined {
  for (const lesson of getCourseLessons(locale)) {
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
export function flatGames(locale: Locale = 'zh'): FlatGame[] {
  const out: FlatGame[] = [];
  for (const lesson of getCourseLessons(locale)) for (const game of lesson.games) out.push({ game, lesson });
  return out;
}

/** 取某个游戏的上一个 / 下一个游戏（跨课连续） */
export function getAdjacentGames(slug: string, locale: Locale = 'zh'): { prev: FlatGame | null; next: FlatGame | null } {
  const flat = flatGames(locale);
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
