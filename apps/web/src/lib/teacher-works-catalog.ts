import { COURSE_LESSONS, findGame, type CourseGame, type CourseLesson } from '@/lib/course-config';
import {
  GAME_PROGRESS_LABELS,
  TRACKED_CREATION_GAMES,
  VIDEO_CREATION_GAMES,
  type GameProgressRecord,
  type GameProgressSession,
  type TrackedCreationGame,
} from '@/lib/course-game-progress';

export interface WorksLessonGroup {
  lesson: CourseLesson;
  /** 该课下可在看板查看的创作游戏 */
  games: CourseGame[];
  /** 第 4 课视频类：多个 slug 合并为一个入口 */
  videoBundle?: {
    slugs: TrackedCreationGame[];
    label: string;
  };
}

/** 有实时作品看板的课程分组（按课序） */
export function buildWorksLessonGroups(): WorksLessonGroup[] {
  const map = new Map<string, WorksLessonGroup>();

  for (const slug of TRACKED_CREATION_GAMES) {
    if (
      (VIDEO_CREATION_GAMES as readonly string[]).includes(slug)
      && slug !== 'frame-video'
      && slug !== 'ai-director'
    ) continue;
    const found = findGame(slug);
    if (!found) continue;
    const key = found.lesson.slug;
    if (!map.has(key)) map.set(key, { lesson: found.lesson, games: [] });
    const g = map.get(key)!;
    if (!g.games.some((x) => x.slug === found.game.slug)) g.games.push(found.game);
  }

  const lesson3 = COURSE_LESSONS.find((l) => l.slug === 'lesson3');
  if (lesson3) {
    const g = map.get('lesson3');
    if (g) {
      const quiz = lesson3.games.find((x) => x.slug === 'video-detective');
      if (quiz && !g.games.some((x) => x.slug === quiz.slug)) {
        g.games.unshift(quiz);
      }
      const director = lesson3.games.find((x) => x.slug === 'ai-director');
      if (director && !g.games.some((x) => x.slug === director.slug)) {
        g.games.push(director);
      }
      g.videoBundle = {
        slugs: ['frame-video', 'video-studio', 'video-free'],
        label: '自由生视频（含首尾帧）',
      };
    }
  }

  return [...map.values()].sort((a, b) => a.lesson.index - b.lesson.index);
}

export function lessonHasSummary(lessonSlug: string) {
  return lessonSlug === 'lesson5';
}

export function countRecordsForSlugs(
  session: GameProgressSession | null | undefined,
  slugs: string[],
): { done: number; generating: number; failed: number; total: number } {
  const wanted = new Set(slugs);
  const records = Object.values(session?.records || {}).filter((r) => wanted.has(r.gameSlug));
  return {
    done: records.filter((r) => r.status === 'done').length,
    generating: records.filter((r) => r.status === 'generating').length,
    failed: records.filter((r) => r.status === 'failed').length,
    total: records.length,
  };
}

export function resolveDefaultWorksSelection(
  currentGame: string | null,
  groups: WorksLessonGroup[],
): { lessonSlug: string; gameKey: string } {
  if (currentGame === 'detective-summary') {
    return { lessonSlug: 'lesson5', gameKey: 'detective-summary' };
  }
  if (currentGame === 'video-detective') {
    return { lessonSlug: 'lesson3', gameKey: 'video-detective' };
  }

  if (currentGame) {
    const found = findGame(currentGame);
    if (found) {
      const group = groups.find((g) => g.lesson.slug === found.lesson.slug);
      if (group) {
        if (
          (VIDEO_CREATION_GAMES as readonly string[]).includes(currentGame)
          && currentGame !== 'ai-director'
        ) {
          return { lessonSlug: group.lesson.slug, gameKey: '__video_bundle__' };
        }
        return { lessonSlug: group.lesson.slug, gameKey: currentGame };
      }
    }
  }

  const first = groups[0];
  if (!first) return { lessonSlug: 'lesson2', gameKey: 'keyword-image' };
  return { lessonSlug: first.lesson.slug, gameKey: first.games[0]?.slug || '__video_bundle__' };
}

export function gameKeyToSlugs(group: WorksLessonGroup, gameKey: string): TrackedCreationGame[] {
  if (gameKey === '__video_bundle__' && group.videoBundle) return group.videoBundle.slugs;
  if (TRACKED_CREATION_GAMES.includes(gameKey as TrackedCreationGame)) return [gameKey as TrackedCreationGame];
  return [];
}

export function gameKeyLabel(group: WorksLessonGroup, gameKey: string): string {
  if (gameKey === '__video_bundle__') return group.videoBundle?.label || 'AI 生视频';
  if (gameKey === 'detective-summary') return '大侦探总结分享';
  const g = group.games.find((x) => x.slug === gameKey);
  return g?.title || GAME_PROGRESS_LABELS[gameKey as TrackedCreationGame] || gameKey;
}

export function pickPreviewRecords(
  session: GameProgressSession | null | undefined,
  slugs: string[],
  limit = 3,
): GameProgressRecord[] {
  const wanted = new Set(slugs);
  return Object.values(session?.records || {})
    .filter((r) => wanted.has(r.gameSlug) && r.status !== 'idle')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}
