import { api } from '@/lib/api';

export interface RoomNode {
  id: string;
  parentId: string | null;
  request: string;
  url: string;
}

export interface DecorateRoomThemeDraft {
  nodes: RoomNode[];
  currentId: string;
  savedAssetId?: string | null;
  nodeSeq?: number;
}

export interface DecorateRoomDraft {
  version: 1;
  themes: Record<string, DecorateRoomThemeDraft>;
  activeThemeId: string;
  updatedAt: number;
}

export const DECORATE_ROOM_THEMES = [
  { id: 'nailong', title: '奶龙的房间', emoji: '🐉', shortTitle: '奶龙' },
  { id: 'ultraman', title: '奥特曼的房间', emoji: '🦸', shortTitle: '奥特曼' },
  { id: 'princess', title: '小公主的房间', emoji: '👑', shortTitle: '小公主' },
] as const;

export type DecorateRoomThemeId = (typeof DECORATE_ROOM_THEMES)[number]['id'];

const GAME_SLUG = 'decorate-room';

export async function loadDecorateRoomDraft(): Promise<DecorateRoomDraft | null> {
  try {
    const r = await api.get('/course/game-draft', { params: { game: GAME_SLUG } });
    return (r.data as DecorateRoomDraft | null) || null;
  } catch {
    return null;
  }
}

export async function saveDecorateRoomThemeDraft(
  themeId: string,
  theme: DecorateRoomThemeDraft,
  activeThemeId?: string,
): Promise<void> {
  try {
    await api.put('/course/game-draft', {
      gameSlug: GAME_SLUG,
      themeId,
      theme,
      activeThemeId,
    });
  } catch {
    /* 草稿保存失败不打断游戏 */
  }
}

export function restoreNodeSeq(nodes: RoomNode[]) {
  let max = 0;
  for (const n of nodes) {
    const m = /^n(\d+)$/.exec(n.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}
