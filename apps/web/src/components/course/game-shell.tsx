'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { findGame, getAdjacentGames } from '@/lib/course-config';
import { useStudentClassroomLock } from '@/contexts/student-classroom-context';
import { useLanguage } from '@/contexts/language-context';

/**
 * 小游戏统一外壳：醒目的返回入口 + 标题 + 目标说明 + 底部「下一个游戏」入口。
 */
export function GameShell({ slug, children }: { slug: string; children: ReactNode }) {
  const { locked } = useStudentClassroomLock();
  const { t, locale } = useLanguage();
  const found = findGame(slug, locale);
  const lesson = found?.lesson;
  const game = found?.game;
  const { prev, next } = getAdjacentGames(slug, locale);

  return (
    <div className="space-y-5 w-full max-w-none">
      {!locked && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/student/course"
            className="kid-button-primary !px-4 !py-2.5 text-sm"
          >
            {t('game.backToMap', '🏠 返回课程地图')}
          </Link>
          {lesson && (
            <Link
              href={`/student/course/${lesson.slug}`}
              className="kid-button-ghost !px-4 !py-2.5 text-sm"
            >
              {locale === 'en'
                ? `⬅️ ${t('game.backToLesson', '返回第')}${lesson.index}`
                : `⬅️ 返回第${lesson.index}课`}
            </Link>
          )}
        </div>
      )}

      {locked && (
        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-800">
          {t('game.lockedHint', '🔒 上课中，请完成老师布置的这一步，不要离开当前页面。')}
        </div>
      )}

      <header className="flex items-start gap-3">
        <span className="text-4xl">{game?.emoji ?? '🎮'}</span>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">{game?.title ?? t('game.defaultTitle', '小游戏')}</h1>
          {game?.desc && <p className="text-ink-soft mt-1 text-sm font-semibold">{game.desc}</p>}
        </div>
      </header>

      {children}

      {!locked && (
      <div className="pt-2 border-t-2 border-dashed border-orange-100 flex items-center justify-between gap-3 flex-wrap">
        {prev ? (
          <Link href={`/student/course/g/${prev.game.slug}`} className="kid-button-ghost !px-4 !py-3">
            <span className="text-lg">{prev.game.emoji}</span>
            <span className="text-left leading-tight">
              <span className="block text-[11px] text-ink-soft">{t('game.prev', '上一个')}</span>
              <span className="block text-sm font-bold">{prev.game.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link href={`/student/course/g/${next.game.slug}`} className="kid-button-primary !px-5 !py-3">
            <span className="text-right leading-tight">
              <span className="block text-[11px] text-white/80">{t('game.next', '下一个游戏')}</span>
              <span className="block text-sm font-extrabold">{next.game.title}</span>
            </span>
            <span className="text-lg">{next.game.emoji} →</span>
          </Link>
        ) : (
          <Link href="/student/course" className="kid-button-mint !px-5 !py-3">
            {t('game.allDone', '🎉 全部玩完啦 · 回到课程地图')}
          </Link>
        )}
      </div>
      )}
    </div>
  );
}
