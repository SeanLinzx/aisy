import type { GameProgressItem, GameProgressRecord } from '@/lib/course-game-progress';
import { DECORATE_ROOM_THEMES } from '@/lib/decorate-room-draft';
import { isVideoProgressRecord } from '@/lib/course-game-progress';

export interface StudentWorkEntry {
  id: string;
  url?: string;
  prompt?: string;
  text?: string;
  title?: string;
  label?: string;
  status?: string;
  isVideo?: boolean;
  themeLabel?: string;
}

function itemToEntry(item: GameProgressItem, index: number, themeLabel?: string): StudentWorkEntry {
  const url = item.url;
  return {
    id: `${themeLabel || 'work'}-${index}-${url || item.prompt || index}`,
    url,
    prompt: url ? item.prompt : undefined,
    text: !url && item.prompt ? item.prompt : undefined,
    label: item.label || `作品 ${index + 1}`,
    status: item.status,
    isVideo: !!url && (/\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes('/video')),
    themeLabel,
  };
}

function recordSnapshotToEntries(record: GameProgressRecord, themeLabel?: string): StudentWorkEntry[] {
  if (record.items?.length) {
    return record.items.map((item, i) => itemToEntry(item, i, themeLabel));
  }

  const entries: StudentWorkEntry[] = [];
  const urls = record.imageUrls?.length
    ? record.imageUrls
    : record.videoUrl
      ? [record.videoUrl]
      : record.thumbnailUrl
        ? [record.thumbnailUrl]
        : [];

  urls.forEach((url, i) => {
    entries.push({
      id: `${themeLabel || 'snap'}-${i}-${url}`,
      url,
      prompt: record.prompt,
      text: record.text,
      title: record.title,
      label: urls.length > 1 ? `第 ${i + 1} 张` : '最新作品',
      status: record.status,
      isVideo: isVideoProgressRecord(record) || /\.(mp4|webm|mov)(\?|$)/i.test(url),
      themeLabel,
    });
  });

  if (entries.length === 0 && record.text && record.status === 'done') {
    entries.push({
      id: `${themeLabel || 'text'}-${record.updatedAt}`,
      prompt: record.prompt,
      text: record.text,
      title: record.title,
      label: record.title || '文字作品',
      status: record.status,
      themeLabel,
    });
  }

  if (entries.length === 0 && record.summary && record.status !== 'idle') {
    entries.push({
      id: `${themeLabel || 'summary'}-${record.updatedAt}`,
      prompt: record.prompt,
      text: record.summary,
      label: record.summary,
      status: record.status,
      themeLabel,
    });
  }

  return entries;
}

/** 汇总某学生在当前环节上报过的全部作品内容 */
export function collectStudentWorks(record: GameProgressRecord | null | undefined): StudentWorkEntry[] {
  if (!record || record.status === 'idle') return [];

  if (record.gameSlug === 'decorate-room' && record.themes) {
    const all: StudentWorkEntry[] = [];
    for (const theme of DECORATE_ROOM_THEMES) {
      const tp = record.themes[theme.id];
      if (!tp || tp.status === 'idle') continue;
      const themeLabel = `${theme.emoji} ${theme.shortTitle}`;
      const sub: GameProgressRecord = {
        studentId: record.studentId,
        displayName: record.displayName,
        gameSlug: record.gameSlug,
        status: tp.status,
        prompt: tp.prompt,
        imageUrls: tp.imageUrls,
        thumbnailUrl: tp.thumbnailUrl,
        items: tp.items,
        roundCount: tp.roundCount,
        summary: tp.summary,
        error: tp.error,
        themeId: theme.id,
        updatedAt: record.updatedAt,
      };
      all.push(...recordSnapshotToEntries(sub, themeLabel));
    }
    return all;
  }

  return recordSnapshotToEntries(record);
}

export function countStudentWorks(record: GameProgressRecord | null | undefined): number {
  return collectStudentWorks(record).length;
}
