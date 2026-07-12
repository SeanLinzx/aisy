'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { findGame } from '@/lib/course-config';
import { DetectiveDeckFrame } from '@/components/course/detective-deck-frame';
import { isDeckSlides } from '@/lib/course-deck';
import { PdfSinglePage } from '@/components/course/pdf-single-page';

interface ClassroomState {
  active: boolean;
  mode: 'game' | 'slides';
  currentGame: string | null;
  slides: { url: string; name: string; page: number; kind?: 'pdf' | 'deck' } | null;
}

export default function LiveSlidesPage() {
  const [state, setState] = useState<ClassroomState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await api.get('/course/classroom');
        if (alive) setState(r.data || null);
      } catch {
        if (alive) setState(null);
      } finally {
        if (alive) setLoaded(true);
      }
    }
    load();
    const t = setInterval(load, 2500);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const slides = state?.mode === 'slides' ? state.slides : null;
  const deck = slides && isDeckSlides(slides);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <span className="text-3xl">🎓</span>
        <div>
          <h1 className="font-display text-2xl font-extrabold">老师的课堂</h1>
          <p className="text-ink-soft text-sm font-semibold">跟着老师一起看课件、玩游戏吧！</p>
        </div>
      </header>

      {!loaded ? (
        <div className="kid-card text-sm text-ink-soft">加载中…</div>
      ) : deck ? (
        <div className="kid-card !p-3 md:!p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <div className="text-sm font-bold truncate">🕵️ {slides!.name}</div>
            <span className="tag shrink-0">第 {slides!.page} 页 · 跟课中</span>
          </div>
          <DetectiveDeckFrame mode="follow" page={slides!.page} />
          <p className="text-xs text-ink-soft py-3 text-center border-t border-orange-50 mt-3">
            老师翻页时，这里会自动跟着翻 📖
          </p>
        </div>
      ) : slides?.url ? (
        <div className="kid-card !p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-orange-100 bg-orange-50/60">
            <div className="text-sm font-bold truncate">📑 {slides.name}</div>
            <span className="tag shrink-0">第 {slides.page} 页</span>
          </div>
          <PdfSinglePage
            key={`${slides.url}-${slides.page}`}
            url={slides.url}
            page={slides.page}
            className="min-h-[70vh] px-2 py-4 md:px-6 md:py-6"
          />
          <p className="text-xs text-ink-soft py-3 text-center border-t border-orange-50">
            老师翻页时，这里会自动跟着翻 📖
          </p>
        </div>
      ) : state?.mode === 'game' && state.currentGame ? (
        <div className="kid-card-sky text-center py-10">
          <div className="text-5xl mb-3">🎮</div>
          <div className="font-extrabold text-lg">老师让大家去玩「{findGame(state.currentGame)?.game.title ?? '小游戏'}」啦！</div>
          <a href={`/student/course/g/${state.currentGame}`} className="kid-button-primary mt-4 inline-flex">▶️ 去玩游戏</a>
        </div>
      ) : (
        <div className="kid-card-orange text-center py-10">
          <div className="text-5xl mb-3">⏳</div>
          <div className="font-extrabold text-lg">等老师开始上课…</div>
          <p className="text-sm text-ink-soft mt-1">老师播放课件或推送游戏后，这里会自动显示（会自动刷新）。</p>
        </div>
      )}
    </div>
  );
}
