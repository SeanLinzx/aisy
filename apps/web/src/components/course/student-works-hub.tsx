'use client';

import { useEffect, useMemo, useState } from 'react';
import { COURSE_LESSONS, THEME_GRADIENT } from '@/lib/course-config';
import { GameProgressTeacherPanel } from '@/components/course/game-progress-teacher-panel';
import { SummaryTeacherPanel } from '@/components/course/summary-teacher-panel';
import { StudentWorksModal } from '@/components/course/student-works-modal';
import type { GameProgressRecord, GameProgressSession } from '@/lib/course-game-progress';
import type { SummarySession, SummaryStudentRecord } from '@/lib/detective-summary';
import {
  buildWorksLessonGroups,
  countRecordsForSlugs,
  gameKeyLabel,
  gameKeyToSlugs,
  lessonHasSummary,
  resolveDefaultWorksSelection,
} from '@/lib/teacher-works-catalog';
import { cn } from '@/lib/cn';

interface StudentOption {
  id: string;
  displayName: string;
  username: string;
}

export function StudentWorksHub({
  active,
  currentGame,
  students,
  rosterIds,
  gameProgress,
  summary,
  onPushShowcase,
  onPushSummary,
  pushingStudentId,
}: {
  active: boolean;
  currentGame: string | null;
  students: StudentOption[];
  rosterIds: string[];
  gameProgress: GameProgressSession | null;
  summary: SummarySession | null;
  onPushShowcase?: (record: GameProgressRecord) => void;
  onPushSummary?: (record: SummaryStudentRecord) => void;
  pushingStudentId?: string | null;
}) {
  const groups = useMemo(() => buildWorksLessonGroups(), []);
  const lesson5 = COURSE_LESSONS.find((l) => l.slug === 'lesson5');

  const [lessonSlug, setLessonSlug] = useState('lesson2');
  const [gameKey, setGameKey] = useState('keyword-image');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!active) return;
    const next = resolveDefaultWorksSelection(currentGame, groups);
    setLessonSlug(next.lessonSlug);
    setGameKey(next.gameKey);
  }, [active, currentGame, groups]);

  const currentGroup = lessonSlug === 'lesson5'
    ? undefined
    : groups.find((g) => g.lesson.slug === lessonSlug) ?? groups[0];
  const isSummary = gameKey === 'detective-summary';

  const gameOptions = useMemo(() => {
    if (lessonSlug === 'lesson5') {
      return [{ key: 'detective-summary', emoji: '🕵️', label: '大侦探总结分享' }];
    }
    if (!currentGroup) return [];
    const opts: Array<{ key: string; emoji: string; label: string }> = currentGroup.games.map((g) => ({
      key: g.slug,
      emoji: g.emoji,
      label: g.title,
    }));
    if (currentGroup.videoBundle) {
      opts.push({ key: '__video_bundle__', emoji: '🎬', label: currentGroup.videoBundle.label });
    }
    if (lessonHasSummary(currentGroup.lesson.slug)) {
      opts.push({ key: 'detective-summary', emoji: '🕵️', label: '大侦探总结分享' });
    }
    return opts;
  }, [currentGroup, lessonSlug]);

  const slugs = currentGroup && !isSummary ? gameKeyToSlugs(currentGroup, gameKey) : [];
  const stats = countRecordsForSlugs(gameProgress, slugs);
  const summaryDone = Object.values(summary?.records || {}).filter((r) => r.done).length;
  const summaryTotal = Object.values(summary?.records || {}).length;

  const panelTitle = isSummary
    ? '大侦探总结分享'
    : currentGroup
      ? gameKeyLabel(currentGroup, gameKey)
      : '学生作品';
  const followingCurrent =
    (currentGame === 'detective-summary' && isSummary) ||
    (!!currentGame && !isSummary && slugs.includes(currentGame as never));

  if (!active) return null;

  return (
    <>
      <div className="kid-card space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-bold">📚 学生作品看板</div>
            <div className="text-xs text-ink-soft mt-0.5">
              按课程与游戏分类查看，避免所有作品堆在一起。默认跟随你正在推送的课堂活动。
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="kid-button-sm bg-white border-2 border-sky-200 text-sky-700 shrink-0"
          >
            🔍 全屏查看
          </button>
        </div>

        {/* 按课程切换 */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {groups.map((g) => {
            const on = g.lesson.slug === lessonSlug;
            return (
              <button
                key={g.lesson.slug}
                type="button"
                onClick={() => {
                  setLessonSlug(g.lesson.slug);
                  const firstKey = g.games[0]?.slug || (g.videoBundle ? '__video_bundle__' : 'keyword-image');
                  setGameKey(firstKey);
                }}
                className={cn(
                  'shrink-0 rounded-2xl border-2 px-3 py-2 text-left transition min-w-[120px]',
                  on ? 'border-brand bg-orange-50 ring-2 ring-brand/20' : 'border-orange-100 bg-white hover:border-orange-200',
                )}
              >
                <div className="text-[10px] font-bold text-ink-soft">第 {g.lesson.index} 课</div>
                <div className="text-sm font-extrabold flex items-center gap-1">
                  <span>{g.lesson.emoji}</span>
                  <span className="truncate">{g.lesson.title}</span>
                </div>
              </button>
            );
          })}
          {lesson5 && (
            <button
              type="button"
              onClick={() => {
                setLessonSlug('lesson5');
                setGameKey('detective-summary');
              }}
              className={cn(
                'shrink-0 rounded-2xl border-2 px-3 py-2 text-left transition min-w-[120px]',
                lessonSlug === 'lesson5'
                  ? 'border-brand bg-orange-50 ring-2 ring-brand/20'
                  : 'border-orange-100 bg-white hover:border-orange-200',
              )}
            >
              <div className="text-[10px] font-bold text-ink-soft">第 {lesson5.index} 课</div>
              <div className="text-sm font-extrabold flex items-center gap-1">
                <span>{lesson5.emoji}</span>
                <span className="truncate">{lesson5.title}</span>
              </div>
            </button>
          )}
        </div>

        {/* 按游戏切换 */}
        <div className="flex flex-wrap gap-2">
          {gameOptions.map((opt) => {
            const on = opt.key === gameKey;
            const optSlugs = currentGroup ? gameKeyToSlugs(currentGroup, opt.key) : [];
            const c = opt.key === 'detective-summary'
              ? { done: summaryDone, generating: summaryTotal - summaryDone, failed: 0, total: summaryTotal }
              : countRecordsForSlugs(gameProgress, optSlugs);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setGameKey(opt.key)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-sm font-bold transition flex items-center gap-2',
                  on ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-orange-100 bg-white text-ink-soft hover:border-orange-200',
                )}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
                {c.done > 0 && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5">{c.done}✓</span>
                )}
                {c.generating > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">{c.generating}…</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 当前选中摘要 */}
        <div className={cn(
          'rounded-2xl border-2 px-4 py-3 flex flex-wrap items-center justify-between gap-2',
          followingCurrent ? 'border-emerald-200 bg-emerald-50/80' : 'border-orange-100 bg-orange-50/50',
        )}>
          <div className="text-sm font-bold">
            {followingCurrent && <span className="text-emerald-700 mr-1">● 课堂进行中 ·</span>}
            <span className="inline-flex items-center gap-1.5">
              {currentGroup ? (
                <span className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center text-sm text-white bg-gradient-to-br',
                  THEME_GRADIENT[currentGroup.lesson.color],
                )}>
                  {currentGroup.lesson.emoji}
                </span>
              ) : lesson5 ? (
                <span className={cn(
                  'w-7 h-7 rounded-xl flex items-center justify-center text-sm text-white bg-gradient-to-br',
                  THEME_GRADIENT[lesson5.color],
                )}>
                  {lesson5.emoji}
                </span>
              ) : null}
              {panelTitle}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            {isSummary ? (
              <>
                <span className="tag">已提交 {summaryDone}</span>
                <span className="tag bg-amber-50 text-amber-700 border-amber-200">作答中 {Math.max(0, summaryTotal - summaryDone)}</span>
              </>
            ) : (
              <>
                <span className="tag">参与 {rosterIds.length || students.length} 人</span>
                <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">完成 {stats.done}</span>
                <span className="tag bg-amber-50 text-amber-700 border-amber-200">生成中 {stats.generating}</span>
                {stats.failed > 0 && <span className="tag bg-rose-50 text-rose-700 border-rose-200">失败 {stats.failed}</span>}
              </>
            )}
          </div>
        </div>

        {/* 内联预览（仅当前选中游戏，不再堆叠多个看板） */}
        <div className="rounded-2xl border-2 border-dashed border-orange-100 bg-white/60 p-1">
          {isSummary ? (
            <SummaryTeacherPanel
              students={students}
              rosterIds={rosterIds}
              session={summary}
              onPushShowcase={onPushSummary}
              pushingStudentId={pushingStudentId}
            />
          ) : slugs.length > 0 ? (
            <GameProgressTeacherPanel
              gameSlug={slugs.length === 1 ? slugs[0] : undefined}
              gameSlugs={slugs.length > 1 ? slugs : undefined}
              panelTitle={panelTitle}
              students={students}
              rosterIds={rosterIds}
              session={gameProgress}
              onPushShowcase={onPushShowcase}
              pushingStudentId={pushingStudentId}
              wrapCard={false}
              maxGridHeight="max-h-[50vh]"
            />
          ) : (
            <p className="text-sm text-ink-soft text-center py-8">请选择上方的课程与游戏查看作品。</p>
          )}
        </div>
      </div>

      <StudentWorksModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={panelTitle}
        subtitle={
          currentGroup
            ? `第 ${currentGroup.lesson.index} 课 · ${currentGroup.lesson.title}`
            : lesson5
              ? `第 ${lesson5.index} 课 · ${lesson5.title}`
              : undefined
        }
        mode={isSummary ? 'summary' : 'creation'}
        gameSlug={slugs.length === 1 ? slugs[0] : undefined}
        gameSlugs={slugs.length > 1 ? slugs : undefined}
        students={students}
        rosterIds={rosterIds}
        session={gameProgress}
        summarySession={summary}
        onPushShowcase={onPushShowcase}
        onPushSummary={onPushSummary}
        pushingStudentId={pushingStudentId}
      />
    </>
  );
}
