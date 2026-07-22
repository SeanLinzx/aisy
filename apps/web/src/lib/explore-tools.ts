import type { Locale } from '@/lib/i18n/types';

const CORE_PATHS = [
  '/student/text',
  '/student/image',
  '/student/video',
  '/student/mixed',
  '/student/course/g/freeform-app',
  '/studio/freeform-app',
  '/student/music',
  '/student/pm-creator',
] as const;

type ExploreTool = {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  card: string;
  bubble: string;
};

const EXPLORE_EXTRA_TOOLS_ZH: ExploreTool[] = [
  {
    href: '/student/poster',
    emoji: '🖼️',
    title: 'AI 海报',
    desc: '生成可下载的创意海报',
    card: 'kid-card-pink',
    bubble: 'bg-gradient-to-br from-rose-200 to-pink-300',
  },
  {
    href: '/student/ppt',
    emoji: '📊',
    title: 'AI PPT',
    desc: '快速生成演示文稿提纲',
    card: 'kid-card-mint',
    bubble: 'bg-gradient-to-br from-teal-200 to-cyan-300',
  },
];

const EXPLORE_EXTRA_TOOLS_EN: ExploreTool[] = [
  {
    href: '/student/poster',
    emoji: '🖼️',
    title: 'AI Poster',
    desc: 'Create downloadable creative posters',
    card: 'kid-card-pink',
    bubble: 'bg-gradient-to-br from-rose-200 to-pink-300',
  },
  {
    href: '/student/ppt',
    emoji: '📊',
    title: 'AI Slides',
    desc: 'Quick presentation outlines',
    card: 'kid-card-mint',
    bubble: 'bg-gradient-to-br from-teal-200 to-cyan-300',
  },
];

const EXPLORE_TOOLS_ZH: ExploreTool[] = [
  {
    href: '/student/text',
    emoji: '✍️',
    title: '生文',
    desc: '写故事、写报告、写文案',
    card: 'kid-card-orange',
    bubble: 'bg-gradient-to-br from-amber-200 to-orange-300',
  },
  {
    href: '/student/image',
    emoji: '🎨',
    title: '生图',
    desc: '关键词生图 + 自由生图（描述后直接生成）',
    card: 'kid-card-pink',
    bubble: 'bg-gradient-to-br from-pink-200 to-rose-300',
  },
  {
    href: '/student/video',
    emoji: '🎬',
    title: '生视频',
    desc: '模板生视频 + 自由生视频（无首帧或有首帧）',
    card: 'kid-card-purple',
    bubble: 'bg-gradient-to-br from-violet-200 to-fuchsia-300',
  },
  {
    href: '/student/mixed',
    emoji: '🧠',
    title: '图文理解',
    desc: '上传图片让 AI 看一看',
    card: 'kid-card-mint',
    bubble: 'bg-gradient-to-br from-emerald-200 to-teal-300',
  },
  {
    href: '/student/pm-creator',
    emoji: '💼',
    title: 'AI 应用创作者',
    desc: '需求说明书 → 小应用 → 路演材料，三步完成 AI 作品',
    card: 'kid-card-purple',
    bubble: 'bg-gradient-to-br from-violet-200 to-purple-300',
  },
  {
    href: '/student/course/g/freeform-app',
    emoji: '🪄',
    title: '做自己的 AI 小应用',
    desc: '自己选题！填空说清楚场景、布局、交互三件事，AI 帮你做出一个真正能玩的小应用。',
    card: 'kid-card-sky',
    bubble: 'bg-gradient-to-br from-indigo-200 to-purple-300',
  },
  {
    href: '/student/music',
    emoji: '🎵',
    title: 'AI 作曲',
    desc: '输入主题写歌词，再生成专属音乐',
    card: 'kid-card-purple',
    bubble: 'bg-gradient-to-br from-indigo-200 to-violet-300',
  },
];

const EXPLORE_TOOLS_EN: ExploreTool[] = [
  {
    href: '/student/text',
    emoji: '✍️',
    title: 'Writing',
    desc: 'Stories, reports, and copy',
    card: 'kid-card-orange',
    bubble: 'bg-gradient-to-br from-amber-200 to-orange-300',
  },
  {
    href: '/student/image',
    emoji: '🎨',
    title: 'Images',
    desc: 'Keyword images + free drawing from descriptions',
    card: 'kid-card-pink',
    bubble: 'bg-gradient-to-br from-pink-200 to-rose-300',
  },
  {
    href: '/student/video',
    emoji: '🎬',
    title: 'Videos',
    desc: 'Template videos + free video (with or without first frame)',
    card: 'kid-card-purple',
    bubble: 'bg-gradient-to-br from-violet-200 to-fuchsia-300',
  },
  {
    href: '/student/mixed',
    emoji: '🧠',
    title: 'Image Understanding',
    desc: 'Upload a picture and let AI look at it',
    card: 'kid-card-mint',
    bubble: 'bg-gradient-to-br from-emerald-200 to-teal-300',
  },
  {
    href: '/student/pm-creator',
    emoji: '💼',
    title: 'AI App Creator',
    desc: 'Requirements → mini app → pitch deck in three steps',
    card: 'kid-card-purple',
    bubble: 'bg-gradient-to-br from-violet-200 to-purple-300',
  },
  {
    href: '/student/course/g/freeform-app',
    emoji: '🪄',
    title: 'Build Your Own AI App',
    desc: 'Pick your own topic! Describe scene, layout, and interaction — AI builds a playable app!',
    card: 'kid-card-sky',
    bubble: 'bg-gradient-to-br from-indigo-200 to-purple-300',
  },
  {
    href: '/student/music',
    emoji: '🎵',
    title: 'AI Music',
    desc: 'Enter a theme for lyrics, then generate your song',
    card: 'kid-card-purple',
    bubble: 'bg-gradient-to-br from-indigo-200 to-violet-300',
  },
];

/** @deprecated use getExploreExtraTools(locale) */
export const EXPLORE_EXTRA_TOOLS = EXPLORE_EXTRA_TOOLS_ZH;
/** @deprecated use getExploreTools(locale) */
export const EXPLORE_TOOLS = EXPLORE_TOOLS_ZH;

export const EXPLORE_TOOL_PATHS = [
  ...CORE_PATHS,
  ...EXPLORE_EXTRA_TOOLS_ZH.map((t) => t.href),
] as const;

export function getExploreTools(locale: Locale = 'zh'): ExploreTool[] {
  return locale === 'en' ? EXPLORE_TOOLS_EN : EXPLORE_TOOLS_ZH;
}

export function getExploreExtraTools(locale: Locale = 'zh'): ExploreTool[] {
  return locale === 'en' ? EXPLORE_EXTRA_TOOLS_EN : EXPLORE_EXTRA_TOOLS_ZH;
}

export { CORE_PATHS as EXPLORE_CORE_TOOL_PATHS };
