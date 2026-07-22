'use client';
import { findGame } from '@/lib/course-config';
import { DetectiveDeckFrame } from '@/components/course/detective-deck-frame';
import { isDeckSlides } from '@/lib/course-deck';
import { PdfSinglePage } from '@/components/course/pdf-single-page';
import { slidesSyncToStudents } from '@/lib/classroom-sync';
import { useStudentClassroomLock } from '@/contexts/student-classroom-context';
import { useLanguage } from '@/contexts/language-context';

export default function LiveSlidesPage() {
  const { tx } = useLanguage();
  const { state, loaded } = useStudentClassroomLock();

  const slides = state?.mode === 'slides' ? state.slides : null;
  const deck = slides && isDeckSlides(slides);
  const synced = slidesSyncToStudents(slides);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <span className="text-3xl">🎓</span>
        <div>
          <h1 className="font-display text-2xl font-extrabold">{tx('老师的课堂')}</h1>
          <p className="text-ink-soft text-sm font-semibold">{tx('跟着老师一起看课件、玩游戏吧！')}</p>
        </div>
      </header>

      {!loaded ? (
        <div className="kid-card text-sm text-ink-soft">{tx('加载中…')}</div>
      ) : deck && synced ? (
        <div className="kid-card !p-3 md:!p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div className="text-sm font-bold truncate">🕵️ {slides!.name}</div>
            <span className="tag shrink-0">{tx('第')} {slides!.page} {tx('页 · 跟课中')}</span>
          </div>
          <DetectiveDeckFrame mode="follow" page={slides!.page} />
          <p className="text-xs text-ink-soft py-3 text-center border-t border-orange-50 mt-3">
            {tx('老师翻页时，这里会自动跟着翻 📖')}
          </p>
        </div>
      ) : slides?.url && synced ? (
        <div className="kid-card !p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-orange-100 bg-orange-50/60">
            <div className="text-sm font-bold truncate">📑 {slides.name}</div>
            <span className="tag shrink-0">{tx('第')} {slides.page} {tx('页')}</span>
          </div>
          <PdfSinglePage
            key={`${slides.url}-${slides.page}`}
            url={slides.url}
            page={slides.page}
            className="min-h-[70vh] px-2 py-4 md:px-6 md:py-6"
          />
          <p className="text-xs text-ink-soft py-3 text-center border-t border-orange-50">
            {tx('老师翻页时，这里会自动跟着翻 📖')}
          </p>
        </div>
      ) : state?.mode === 'game' && state.currentGame ? (
        <div className="kid-card-sky text-center py-10">
          <div className="text-5xl mb-3">🎮</div>
          <div className="font-extrabold text-lg">{tx('老师让大家去玩「')}{findGame(state.currentGame)?.game.title ?? tx('小游戏')}{tx('」啦！')}</div>
          <a href={`/student/course/g/${state.currentGame}`} className="kid-button-primary mt-4 inline-flex">{tx('▶️ 去玩游戏')}</a>
        </div>
      ) : (
        <div className="kid-card-orange text-center py-10">
          <div className="text-5xl mb-3">⏳</div>
          <div className="font-extrabold text-lg">{tx('等老师开始上课…')}</div>
          <p className="text-sm text-ink-soft mt-1">{tx('老师播放课件或推送游戏后，这里会自动显示。')}</p>
        </div>
      )}
    </div>
  );
}
