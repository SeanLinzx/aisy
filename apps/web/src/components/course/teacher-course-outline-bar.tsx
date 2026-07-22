'use client';

import { COURSE_LESSONS, findGame, THEME_GRADIENT } from '@/lib/course-config';
import { cn } from '@/lib/cn';

/** 点一下就滚动到对应锚点，并短暂高亮一下，方便老师确认找对了地方 */
export function scrollToAndHighlight(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const nav = document.getElementById('teacher-sticky-nav');
  const offset = (nav?.offsetHeight ?? 152) + 12;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  el.classList.add('outline-highlight');
  setTimeout(() => el.classList.remove('outline-highlight'), 1600);
}

/**
 * 常驻的课程大纲导航条：置顶显示 6 节课，点课切换下方展开的任务区，
 * 点任务名切换老师控制台焦点（可与学生当前环节不同，推送后才同步给学生）。
 */
export function TeacherCourseOutlineBar({
  currentGameSlug,
  viewLessonSlug,
  viewGameSlug,
  onLessonSelect,
  onGameSelect,
  pad,
}: {
  currentGameSlug: string | null;
  viewLessonSlug: string;
  viewGameSlug: string | null;
  onLessonSelect: (lessonSlug: string) => void;
  onGameSelect: (gameSlug: string, lessonSlug: string) => void;
  pad?: boolean;
}) {
  const activeLesson = COURSE_LESSONS.find((l) => l.slug === viewLessonSlug) ?? COURSE_LESSONS[0];

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-bold text-ink-soft px-1">
        📚 课程大纲 · 点课/任务切换查看（推送后学生才同步到该环节）
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {COURSE_LESSONS.map((lesson) => {
          const on = lesson.slug === viewLessonSlug;
          const isLive = currentGameSlug ? lesson.games.some((g) => g.slug === currentGameSlug) : false;
          return (
            <button
              key={lesson.slug}
              type="button"
              onClick={() => {
                onLessonSelect(lesson.slug);
                scrollToAndHighlight(`lesson-${lesson.slug}`);
              }}
              className={cn(
                'shrink-0 rounded-xl border-2 px-2.5 py-1.5 text-left transition flex items-center gap-1.5',
                on ? 'border-brand bg-orange-50 ring-2 ring-brand/20' : 'border-orange-100 bg-white hover:border-orange-200',
                pad && 'py-2 px-3',
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-lg flex items-center justify-center text-[10px] text-white bg-gradient-to-br shrink-0',
                  THEME_GRADIENT[lesson.color],
                )}
              >
                {lesson.emoji}
              </span>
              <span className={cn('font-bold whitespace-nowrap', pad ? 'text-sm' : 'text-xs')}>
                第{lesson.index}课 · {lesson.title}
              </span>
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="学生正在此课" />}
            </button>
          );
        })}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
        {activeLesson.games.map((g) => {
          const live = currentGameSlug === g.slug;
          const viewing = viewGameSlug === g.slug;
          return (
            <button
              key={g.slug}
              type="button"
              onClick={() => {
                onGameSelect(g.slug, activeLesson.slug);
                scrollToAndHighlight(`game-${g.slug}`);
              }}
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold transition',
                viewing
                  ? 'border-brand bg-orange-50 text-brand ring-2 ring-brand/20'
                  : live
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-orange-100 bg-white/70 text-ink-soft hover:border-orange-200',
                pad && 'py-1.5 px-3 text-xs',
              )}
            >
              {g.emoji} {g.title}
              {live && !viewing && ' ·live'}
              {viewing && ' ·查看中'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
