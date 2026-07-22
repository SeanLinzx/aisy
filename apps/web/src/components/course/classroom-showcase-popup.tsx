'use client';

import { useEffect, useState } from 'react';
import { ClassroomShowcaseView } from '@/components/course/classroom-showcase-view';
import type { ClassroomShowcase } from '@/lib/classroom-showcase';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/contexts/language-context';

/** 老师推送作品时，学生默认看到大弹窗，可右上角收起后继续自己的任务 */
export function ClassroomShowcasePopup({ showcase }: { showcase: ClassroomShowcase }) {
  const { tx } = useLanguage();
  const [minimized, setMinimized] = useState(false);
  const showcaseKey = `${showcase.studentId}-${showcase.pushedAt}`;

  useEffect(() => {
    setMinimized(false);
  }, [showcaseKey]);

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 rounded-l-2xl bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-pop px-2.5 py-4 hover:brightness-105 transition"
        aria-label={tx('展开同学作品')}
      >
        <span className="text-lg">🌟</span>
        <span className="text-[10px] font-extrabold [writing-mode:vertical-rl]">{tx('同学作品')}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-auto"
        aria-label={tx('收起作品弹窗')}
        onClick={() => setMinimized(true)}
      />

      <aside
        className={cn(
          'relative pointer-events-auto flex flex-col w-full',
          'max-w-[min(100%,42rem)] max-h-[min(100%,88vh)]',
          'rounded-3xl border-2 border-amber-200 bg-white shadow-2xl',
        )}
        aria-label={`${showcase.displayName} ${tx('的作品展示')}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-3xl shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-extrabold text-amber-800">{tx('🌟 老师分享的作品')}</div>
            <div className="text-xs sm:text-sm font-semibold text-ink-soft truncate mt-0.5">{showcase.displayName}</div>
            <p className="text-[11px] sm:text-xs font-bold text-amber-700/90 mt-2 leading-relaxed">
              {tx('👆 想继续做自己的任务？点右上角「收起」，弹窗会变小，随时可以再点开欣赏')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="shrink-0 flex flex-col items-center gap-0.5 rounded-2xl bg-white border-2 border-amber-300 text-amber-800 px-3 py-2 hover:bg-amber-50 transition shadow-sm"
            title={tx('收起，继续做自己的任务')}
          >
            <span className="text-base leading-none">✕</span>
            <span className="text-[10px] font-extrabold leading-tight">{tx('收起')}</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
          <ClassroomShowcaseView showcase={showcase} variant="popup" />
        </div>

        <footer className="shrink-0 px-4 py-3 border-t border-amber-100 text-xs text-center font-semibold text-ink-soft bg-amber-50/50 rounded-b-3xl">
          {tx('欣赏完可以点右上角「收起」，继续完成你自己的创作 ✨')}
        </footer>
      </aside>
    </div>
  );
}
