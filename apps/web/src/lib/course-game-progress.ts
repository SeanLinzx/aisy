/** 老师可在课堂控制台实时查看进度的创作类小游戏 */
export const TRACKED_CREATION_GAMES = [
  'keyword-image',
  'decorate-room',
  'frame-video',
  'video-guided',
  'video-free',
  'picture-book',
  'acrostic-poem',
  'story-fill',
] as const;

export type TrackedCreationGame = (typeof TRACKED_CREATION_GAMES)[number];

/** 第 4 课 · AI 生视频：所有会产出视频的上报来源 */
export const VIDEO_CREATION_GAMES = ['frame-video', 'video-guided', 'video-free'] as const;

export type VideoCreationGame = (typeof VIDEO_CREATION_GAMES)[number];

export type GameProgressStatus = 'idle' | 'generating' | 'done' | 'failed';

export interface GameProgressItem {
  url?: string;
  prompt?: string;
  label?: string;
  status?: string;
}

export interface GameProgressRecord {
  studentId: string;
  displayName: string;
  gameSlug: string;
  status: GameProgressStatus;
  title?: string;
  text?: string;
  prompt?: string;
  imageUrls?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  items?: GameProgressItem[];
  roundCount?: number;
  summary?: string;
  error?: string;
  updatedAt: number;
}

export interface GameProgressSession {
  id: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  records: Record<string, GameProgressRecord>;
}

export interface GameProgressReportPayload {
  gameSlug: string;
  displayName?: string;
  status: GameProgressStatus;
  title?: string;
  text?: string;
  prompt?: string;
  imageUrls?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  items?: GameProgressItem[];
  roundCount?: number;
  summary?: string;
  error?: string;
}

export function isTrackedCreationGame(slug: string | null | undefined): slug is TrackedCreationGame {
  return !!slug && (TRACKED_CREATION_GAMES as readonly string[]).includes(slug);
}

export function isVideoCreationGame(slug: string | null | undefined): slug is VideoCreationGame {
  return !!slug && (VIDEO_CREATION_GAMES as readonly string[]).includes(slug);
}

export function isVideoProgressRecord(record: GameProgressRecord | null | undefined): boolean {
  return !!record?.videoUrl || isVideoCreationGame(record?.gameSlug);
}

export function mergeProgressRecordsByStudent(
  recordsList: Array<Record<string, GameProgressRecord>>,
): Map<string, GameProgressRecord> {
  const map = new Map<string, GameProgressRecord>();
  for (const records of recordsList) {
    for (const rec of Object.values(records)) {
      const prev = map.get(rec.studentId);
      if (!prev || rec.updatedAt >= prev.updatedAt) map.set(rec.studentId, rec);
    }
  }
  return map;
}

export function gameProgressRecordKey(studentId: string, gameSlug: string) {
  return `${studentId}:${gameSlug}`;
}

export const GAME_PROGRESS_LABELS: Record<TrackedCreationGame, string> = {
  'keyword-image': '关键词生图',
  'decorate-room': '奶龙装修房间',
  'frame-video': '首尾帧生视频',
  'video-guided': '模板生视频',
  'video-free': '自由生视频',
  'picture-book': '绘本生成',
  'acrostic-poem': '藏头诗',
  'story-fill': '填空编故事',
};
