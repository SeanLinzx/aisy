import {
  GAME_PROGRESS_LABELS,
  type GameProgressRecord,
  type TrackedCreationGame,
} from '@/lib/course-game-progress';
import { DECORATE_ROOM_THEMES } from '@/lib/decorate-room-draft';
import {
  SUMMARY_QUESTIONS,
  type SummaryStudentRecord,
} from '@/lib/detective-summary';

export interface ClassroomShowcase {
  studentId: string;
  displayName: string;
  gameSlug?: string;
  gameTitle?: string;
  title?: string;
  prompt?: string;
  imageUrls?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  text?: string;
  summary?: string;
  source: 'game-progress' | 'summary';
  pushedAt: number;
}

export function showcaseFromProgress(record: GameProgressRecord): ClassroomShowcase | null {
  if (record.status !== 'done') return null;
  const hasMedia =
    !!record.videoUrl ||
    !!record.thumbnailUrl ||
    (record.imageUrls?.length ?? 0) > 0 ||
    (record.items?.length ?? 0) > 0;
  const hasText = !!record.prompt || !!record.summary || !!record.text;
  if (!hasMedia && !hasText) return null;

  return {
    studentId: record.studentId,
    displayName: record.displayName,
    gameSlug: record.gameSlug,
    gameTitle: GAME_PROGRESS_LABELS[record.gameSlug as TrackedCreationGame] || record.gameSlug,
    title: record.title || (record.themeId
      ? DECORATE_ROOM_THEMES.find((t) => t.id === record.themeId)?.title
      : undefined),
    prompt: record.prompt,
    imageUrls: record.imageUrls,
    videoUrl: record.videoUrl,
    thumbnailUrl: record.thumbnailUrl,
    text: record.text,
    summary: record.summary || record.title,
    source: 'game-progress',
    pushedAt: Date.now(),
  };
}

/** 从总结分享答题记录构造展示内容（优先分享题文字） */
export function showcaseFromSummary(record: SummaryStudentRecord): ClassroomShowcase | null {
  const shareQ = SUMMARY_QUESTIONS.find((q) => q.id === 'share');
  const shareAnswer = shareQ ? record.answers[shareQ.id] : undefined;
  const shareText = shareAnswer?.text?.trim();
  const shareLabel = shareAnswer?.optionLabel || shareQ?.options.find((o) => o.id === shareAnswer?.optionId)?.label;

  const debateQ = SUMMARY_QUESTIONS.find((q) => q.id === 'debate');
  const debateAnswer = debateQ ? record.answers[debateQ.id] : undefined;
  const debateText = debateAnswer?.text?.trim();
  const debateLabel = debateAnswer?.optionLabel || debateQ?.options.find((o) => o.id === debateAnswer?.optionId)?.label;

  const text = shareText || debateText;
  const title = shareLabel || debateLabel;
  if (!text && !title) return null;

  return {
    studentId: record.studentId,
    displayName: record.displayName,
    gameTitle: '大侦探总结分享',
    title: title || '我的分享',
    text: text || title,
    source: 'summary',
    pushedAt: Date.now(),
  };
}

export function isVideoShowcaseUrl(url?: string) {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes('/video') || url.includes('videoUrl');
}
