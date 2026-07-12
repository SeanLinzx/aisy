'use client';

import { useEffect, useState } from 'react';
import { ClassroomShowcaseView } from '@/components/course/classroom-showcase-view';
import type { ClassroomShowcase } from '@/lib/classroom-showcase';
import { cn } from '@/lib/cn';

/** 老师推送作品时，学生右侧可最小化的浮窗 */
export function ClassroomShowcasePopup({ showcase }: { showcase: ClassroomShowcase }) {
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
        aria-label="展开同学作品"
      >
        <span className="text-lg">🌟</span>
        <span className="text-[10px] font-extrabold [writing-mode:vertical-rl]">同学作品</span>
      </button>
    );
  }

  return (
    <aside
      className={cn(
        'fixed z-50 flex flex-col',
        'right-3 top-20 bottom-24 w-[min(100vw-1.5rem,22rem)]',
        'rounded-2xl border-2 border-amber-200 bg-white/98 shadow-pop backdrop-blur',
      )}
      aria-label={`${showcase.displayName} 的作品展示`}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl shrink-0">
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-amber-800 truncate">🌟 老师分享的作品</div>
          <div className="text-[10px] font-semibold text-ink-soft truncate">{showcase.displayName}</div>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="shrink-0 text-[11px] font-bold bg-white border border-amber-200 text-amber-700 rounded-full px-2.5 py-1 hover:bg-amber-50 transition"
          title="最小化，继续做自己的任务"
        >
          － 收起
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        <ClassroomShowcaseView showcase={showcase} variant="popup" />
      </div>

      <footer className="shrink-0 px-3 py-2 border-t border-amber-100 text-[10px] text-center font-semibold text-ink-soft">
        可以继续做自己的任务，随时点开欣赏 👏
      </footer>
    </aside>
  );
}
