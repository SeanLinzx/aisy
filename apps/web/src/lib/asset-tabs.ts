import type { Locale } from '@/lib/i18n/types';
import { pickLocale } from '@/lib/i18n/localize';
import { webStudioHref } from '@/lib/web-studio-nav';

const ASSET_TABS_ZH = [
  { key: 'text' as const, label: '文字', emoji: '📝' },
  { key: 'image' as const, label: '图片', emoji: '🖼️' },
  { key: 'video' as const, label: '视频', emoji: '🎬' },
  { key: 'audio' as const, label: '音乐', emoji: '🎵' },
  { key: 'web' as const, label: '网页 / 交互', emoji: '🌐' },
];

const ASSET_TABS_EN = [
  { key: 'text' as const, label: 'Writing', emoji: '📝' },
  { key: 'image' as const, label: 'Images', emoji: '🖼️' },
  { key: 'video' as const, label: 'Videos', emoji: '🎬' },
  { key: 'audio' as const, label: 'Music', emoji: '🎵' },
  { key: 'web' as const, label: 'Web / Interactive', emoji: '🌐' },
];

/** @deprecated use getAssetTabs(locale) */
export const ASSET_TABS = ASSET_TABS_ZH;

export type AssetTabKey = (typeof ASSET_TABS_ZH)[number]['key'];

export function getAssetTabs(locale: Locale = 'zh') {
  return pickLocale(ASSET_TABS_ZH, ASSET_TABS_EN, locale);
}

const TAB_CREATE_LINK_ZH: Record<AssetTabKey, { href: string; label: string }> = {
  text: { href: '/student/text', label: '去生文' },
  image: { href: '/student/image', label: '去生图' },
  video: { href: '/student/video', label: '去生视频' },
  audio: { href: '/student/music', label: '去 AI 作曲' },
  web: { href: '/student/web', label: '去网页工作台' },
};

const TAB_CREATE_LINK_EN: Record<AssetTabKey, { href: string; label: string }> = {
  text: { href: '/student/text', label: 'Go write' },
  image: { href: '/student/image', label: 'Go draw' },
  video: { href: '/student/video', label: 'Go make video' },
  audio: { href: '/student/music', label: 'Go compose music' },
  web: { href: '/student/web', label: 'Go to Web Studio' },
};

export function getTabCreateLink(locale: Locale = 'zh') {
  return pickLocale(TAB_CREATE_LINK_ZH, TAB_CREATE_LINK_EN, locale);
}

/** @deprecated use getTabCreateLink(locale) */
export const TAB_CREATE_LINK = TAB_CREATE_LINK_ZH;

/** 四 tab 与后端 AssetType 的对应关系（poster/ppt/mixed 等归入主类） */
export const TAB_ASSET_TYPES: Record<AssetTabKey, string[]> = {
  text: ['text', 'ppt'],
  image: ['image', 'poster', 'mixed'],
  video: ['video'],
  audio: ['audio'],
  web: ['web'],
};

const DISPLAY_TYPE_ZH: Record<string, string> = {
  'work-card': '课程作品卡',
  'pm-prd': '需求说明书',
  'pm-pitch': '路演材料',
  'pm-application': 'AI 应用',
  'ux-improvement': '交互优化',
  interaction: '交互页',
  'voice-interaction': '配音交互',
  'creation-session': '创作页',
  portfolio: '作品集',
  'prompt-pair': '提示词',
  'decorate-room': '装修树',
  'memory-match': '侦探挑战',
  poster: '海报',
  ppt: 'PPT',
  mixed: '图文',
  free: '自由创作',
  'local-upload': '本地上传',
};

const DISPLAY_TYPE_EN: Record<string, string> = {
  'work-card': 'Work Card',
  'pm-prd': 'Product Requirements',
  'pm-pitch': 'Pitch Deck',
  'pm-application': 'AI App',
  'ux-improvement': 'UX Improvement',
  interaction: 'Interactive Page',
  'voice-interaction': 'Voice Interaction',
  'creation-session': 'Creation Page',
  portfolio: 'Portfolio',
  'prompt-pair': 'Prompt',
  'decorate-room': 'Room Design',
  'memory-match': 'Detective Challenge',
  poster: 'Poster',
  ppt: 'Slides',
  mixed: 'Image + Text',
  free: 'Free Create',
  'local-upload': 'Local Upload',
};

export function filterAssetsByTab<T extends { type: string }>(items: T[], tab: AssetTabKey): T[] {
  const types = new Set(TAB_ASSET_TYPES[tab]);
  return items.filter((a) => types.has(a.type));
}

export function parseAssetMeta(meta: unknown): Record<string, unknown> | null {
  if (!meta) return null;
  if (typeof meta === 'object') return meta as Record<string, unknown>;
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta);
    } catch {
      return null;
    }
  }
  return null;
}

export function assetDisplayType(asset: { type: string; meta?: unknown }, locale: Locale = 'zh'): string {
  const meta = parseAssetMeta(asset.meta);
  const map = locale === 'en' ? DISPLAY_TYPE_EN : DISPLAY_TYPE_ZH;
  if (meta?.kind === 'work-card') return map['work-card'];
  if (meta?.kind === 'pm-prd') return map['pm-prd'];
  if (meta?.kind === 'pm-pitch') return map['pm-pitch'];
  if (meta?.kind === 'pm-application') return map['pm-application'];
  if (meta?.kind === 'ux-improvement') return map['ux-improvement'];
  if (meta?.kind === 'interaction') return map.interaction;
  if (meta?.kind === 'voice-interaction') return map['voice-interaction'];
  if (meta?.kind === 'creation-session') return map['creation-session'];
  if (meta?.kind === 'portfolio') return map.portfolio;
  if (meta?.kind === 'prompt-pair') return map['prompt-pair'];
  if (meta?.kind === 'decorate-room') return map['decorate-room'];
  if (meta?.kind === 'memory-match') return map['memory-match'];
  if (asset.type === 'poster') return map.poster;
  if (asset.type === 'ppt') return map.ppt;
  if (asset.type === 'audio') return locale === 'en' ? 'Music' : '音乐';
  if (meta?.kind === 'mixed') return map.mixed;
  if (meta?.mode === 'free') return map.free;
  if (meta?.source === 'local-upload') return map['local-upload'];
  return asset.type;
}

export function isInteractiveWebAsset(asset: { type: string; meta?: unknown }): boolean {
  if (asset.type !== 'web') return false;
  const meta = parseAssetMeta(asset.meta);
  const kind = meta?.kind as string | undefined;
  return (
    kind === 'interaction' ||
    kind === 'ux-improvement' ||
    kind === 'voice-interaction' ||
    kind === 'creation-session' ||
    kind === 'memory-match'
  );
}

/**
 * 网页类素材如果有对应的「左预览 + 右对话框」编辑页（studio/课程页），返回站内编辑地址；
 * 否则返回 null，此时只能查看已发布的只读页面。
 */
export function webAssetEditorHref(asset: { type: string; meta?: unknown }): string | null {
  if (asset.type !== 'web') return null;
  const meta = parseAssetMeta(asset.meta);
  const kind = meta?.kind as string | undefined;
  const sourceGame = meta?.sourceGame as string | undefined;
  if (kind === 'portfolio') return '/studio/portfolio';
  if (kind === 'memory-match') return '/studio/memory-match';
  if (kind === 'web-page' && sourceGame === 'freeform-app') return '/studio/freeform-app';
  if (kind === 'web-page' && sourceGame === 'pm-single-app') return '/studio/pm-single-app';
  if (kind === 'web-page' && sourceGame === 'pm-workflow-app') return '/studio/pm-workflow-app';
  if (kind === 'interaction' && sourceGame === 'mini-interaction') return '/student/course/g/mini-interaction';
  const projectId = meta?.projectId as string | undefined;
  if (projectId) return webStudioHref(projectId, 'assets');
  return null;
}

export function isHiddenInLibrary(asset: { meta?: unknown }): boolean {
  const meta = parseAssetMeta(asset.meta);
  return meta?.hiddenInLibrary === true || meta?.kind === 'pm-application';
}
