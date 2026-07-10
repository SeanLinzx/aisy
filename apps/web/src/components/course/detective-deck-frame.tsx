'use client';
import { useEffect, useRef } from 'react';
import { deckUrl } from '@/lib/course-deck';

interface DetectiveDeckFrameProps {
  mode: 'present' | 'follow';
  /** 1-based slide page；follow / 外部翻页时由父组件推送 */
  page?: number;
  className?: string;
  onPageChange?: (page: number, total?: number) => void;
}

/** 嵌入 AI 小侦探互动课件；present=老师控屏，follow=学生跟课 */
export function DetectiveDeckFrame({ mode, page, className, onPageChange }: DetectiveDeckFrameProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const syncedPage = useRef<number | null>(null);

  useEffect(() => {
    if (mode !== 'present' || !onPageChange) return;
    function onMessage(ev: MessageEvent) {
      const data = ev.data;
      if (!data || data.type !== 'aicamp-deck-page') return;
      if (typeof data.page !== 'number') return;
      syncedPage.current = data.page;
      onPageChange?.(data.page, data.total);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [mode, onPageChange]);

  useEffect(() => {
    if (!page || page < 1) return;
    if (syncedPage.current === page) return;
    syncedPage.current = page;
    ref.current?.contentWindow?.postMessage({ type: 'aicamp-deck-goto', page }, '*');
  }, [page]);

  function goto(delta: number) {
    const win = ref.current?.contentWindow;
    if (!win) return;
    const cur = syncedPage.current ?? page ?? 1;
    const next = Math.max(1, cur + delta);
    syncedPage.current = next;
    win.postMessage({ type: 'aicamp-deck-goto', page: next }, '*');
    onPageChange?.(next);
  }

  return (
    <div className={className}>
      {mode === 'present' && (
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <button type="button" onClick={() => goto(-1)} className="kid-button-sm bg-white border-2 border-orange-200">
            ⬅️ 上一页
          </button>
          <span className="tag">
            互动课件{page ? ` · 第 ${page} 页` : ''} · 也可在课件内用 ← → 或 📑 跳转
          </span>
          <button type="button" onClick={() => goto(1)} className="kid-button-sm bg-white border-2 border-orange-200">
            下一页 ➡️
          </button>
        </div>
      )}
      <iframe
        ref={ref}
        src={deckUrl(mode)}
        title="AI 小侦探互动课件"
        className="w-full rounded-2xl border-2 border-orange-100 bg-white"
        style={{ height: mode === 'follow' ? 'min(78vh, 900px)' : 'min(70vh, 820px)' }}
        allow="fullscreen"
      />
    </div>
  );
}
