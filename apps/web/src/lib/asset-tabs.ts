export const ASSET_TABS = [
  { key: 'text', label: '文字', emoji: '📝' },
  { key: 'image', label: '图片', emoji: '🖼️' },
  { key: 'video', label: '视频', emoji: '🎬' },
  { key: 'web', label: '网页 / 交互', emoji: '🌐' },
] as const;

export type AssetTabKey = (typeof ASSET_TABS)[number]['key'];

/** 四 tab 与后端 AssetType 的对应关系（poster/ppt/mixed 等归入主类） */
export const TAB_ASSET_TYPES: Record<AssetTabKey, string[]> = {
  text: ['text', 'ppt'],
  image: ['image', 'poster', 'mixed'],
  video: ['video'],
  web: ['web'],
};

export const TAB_CREATE_LINK: Record<AssetTabKey, { href: string; label: string }> = {
  text: { href: '/student/text', label: '去生文' },
  image: { href: '/student/image', label: '去生图' },
  video: { href: '/student/video', label: '去生视频' },
  web: { href: '/student/web', label: '去网页工作台' },
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

export function assetDisplayType(asset: { type: string; meta?: unknown }): string {
  const meta = parseAssetMeta(asset.meta);
  if (meta?.kind === 'ux-improvement') return '交互优化';
  if (meta?.kind === 'interaction') return '交互页';
  if (meta?.kind === 'voice-interaction') return '配音交互';
  if (meta?.kind === 'creation-session') return '创作页';
  if (meta?.kind === 'portfolio') return '作品集';
  if (meta?.kind === 'prompt-pair') return '提示词';
  if (meta?.kind === 'decorate-room') return '装修树';
  if (meta?.kind === 'memory-match') return '侦探挑战';
  if (asset.type === 'poster') return '海报';
  if (asset.type === 'ppt') return 'PPT';
  if (meta?.kind === 'mixed') return '图文';
  if (meta?.mode === 'free') return '自由创作';
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

export function isHiddenInLibrary(asset: { meta?: unknown }): boolean {
  const meta = parseAssetMeta(asset.meta);
  return meta?.hiddenInLibrary === true;
}
