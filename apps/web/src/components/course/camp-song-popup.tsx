'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { CAMP_SONG_LYRICS } from '@/lib/camp-song';
import { useCampSongAudio } from '@/hooks/use-camp-song-audio';
import type { CampSongState } from '@/lib/camp-song';
import { useLanguage } from '@/contexts/language-context';

/** 老师播放营歌时，学生端弹出歌词（可收起） */
export function CampSongPopup({ campSong }: { campSong: CampSongState }) {
  const { tx } = useLanguage();
  const [minimized, setMinimized] = useState(false);
  const sessionKey = String(campSong.startedAt);

  useEffect(() => {
    setMinimized(false);
  }, [sessionKey]);

  useCampSongAudio(campSong.active, campSong.startedAt);

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed right-0 top-[38%] -translate-y-1/2 z-50 flex flex-col items-center gap-1 rounded-l-2xl bg-gradient-to-b from-violet-400 to-purple-500 text-white shadow-pop px-2.5 py-4 hover:brightness-105 transition"
        aria-label={tx('展开营歌歌词')}
      >
        <span className="text-lg">🎵</span>
        <span className="text-[10px] font-extrabold [writing-mode:vertical-rl]">{tx('营歌')}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[45] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
      <button
        type="button"
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px] pointer-events-auto"
        aria-label={tx('收起营歌弹窗')}
        onClick={() => setMinimized(true)}
      />

      <aside
        className={cn(
          'relative pointer-events-auto flex flex-col w-full',
          'max-w-[min(100%,36rem)] max-h-[min(100%,80vh)]',
          'rounded-3xl border-2 border-violet-200 bg-white shadow-2xl',
        )}
        aria-label={tx('营歌歌词')}
        role="dialog"
        aria-modal="false"
      >
        <header className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 rounded-t-3xl shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-extrabold text-violet-800">{tx('🎵 营歌时间')}</div>
            <p className="text-[11px] sm:text-xs font-bold text-violet-700/90 mt-2 leading-relaxed">
              {tx('跟着歌词一起唱吧！想继续做任务？点右上角「收起」，营歌会继续播放')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="shrink-0 flex flex-col items-center gap-0.5 rounded-2xl bg-white border-2 border-violet-300 text-violet-800 px-3 py-2 hover:bg-violet-50 transition shadow-sm"
            title={tx('收起，继续自己的任务')}
          >
            <span className="text-base leading-none">✕</span>
            <span className="text-[10px] font-extrabold leading-tight">{tx('收起')}</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          <pre className="whitespace-pre-wrap text-sm sm:text-base font-semibold text-ink leading-relaxed text-center font-sans">
            {CAMP_SONG_LYRICS}
          </pre>
        </div>

        <footer className="shrink-0 px-4 py-3 border-t border-violet-100 text-xs text-center font-semibold text-ink-soft bg-violet-50/50 rounded-b-3xl">
          {tx('🎶 营歌正在播放中 · 收起后仍可随时点开歌词')}
        </footer>
      </aside>
    </div>
  );
}
