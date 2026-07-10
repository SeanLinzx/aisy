const CORE_PATHS = [
  '/student/text',
  '/student/image',
  '/student/video',
  '/student/mixed',
  '/student/web',
] as const;

export const EXPLORE_EXTRA_TOOLS: Array<{
  href: string;
  emoji: string;
  title: string;
  desc: string;
  card: string;
  bubble: string;
}> = [
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
  {
    href: '/student/music',
    emoji: '🎵',
    title: 'AI 作曲',
    desc: '输入歌词，五维调节，生成专属音乐',
    card: 'kid-card-purple',
    bubble: 'bg-gradient-to-br from-indigo-200 to-violet-300',
  },
];

export const EXPLORE_TOOL_PATHS = [
  ...CORE_PATHS,
  ...EXPLORE_EXTRA_TOOLS.map((t) => t.href),
] as const;

export const EXPLORE_TOOLS: Array<{
  href: string;
  emoji: string;
  title: string;
  desc: string;
  card: string;
  bubble: string;
}> = [
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
    desc: '关键词生图 + 自由生图（AI 优化提示词）',
    card: 'kid-card-pink',
    bubble: 'bg-gradient-to-br from-pink-200 to-rose-300',
  },
  {
    href: '/student/video',
    emoji: '🎬',
    title: '生视频',
    desc: '模板生视频 + 自由生视频（AI 优化提示词）',
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
    href: '/student/web',
    emoji: '🌐',
    title: '网页工作台',
    desc: '一句话生成你的网页',
    card: 'kid-card-sky',
    bubble: 'bg-gradient-to-br from-sky-200 to-blue-300',
  },
];

export { CORE_PATHS as EXPLORE_CORE_TOOL_PATHS };
