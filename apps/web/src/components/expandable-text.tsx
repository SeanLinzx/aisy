'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

const CLAMP_CLASS = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  6: 'line-clamp-6',
  8: 'line-clamp-8',
} as const;

type ClampLines = keyof typeof CLAMP_CLASS;

/** 文字素材：默认截断，点击在弹窗中查看可滚动全文 */
export function ExpandableText({
  text,
  lines = 3,
  className,
  expandLabel = '点击展开全文 →',
  modalTitle,
}: {
  text: string;
  lines?: ClampLines;
  className?: string;
  expandLabel?: string;
  modalTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const isLong = useMemo(() => text.length > 60 || text.split('\n').length > lines, [text, lines]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!isLong) {
    return <p className={cn('whitespace-pre-wrap', className)}>{text}</p>;
  }

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/55"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={modalTitle || '全文'}
          >
            <div
              className="bg-white rounded-3xl border-2 border-orange-100 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-orange-50 shrink-0">
                <div className="min-w-0">
                  <div className="font-extrabold text-base text-slate-800 truncate">
                    {modalTitle || '全文内容'}
                  </div>
                  <p className="text-[11px] text-ink-soft mt-0.5">可上下滑动阅读完整内容</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 shrink-0 rounded-full bg-orange-50 border border-orange-100 text-slate-600 hover:bg-orange-100 font-bold"
                  aria-label="关闭"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{text}</p>
              </div>
              <div className="px-5 py-3 border-t border-orange-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="kid-button-primary w-full !py-2.5 text-sm"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={className}>
      <p className={cn('whitespace-pre-wrap', CLAMP_CLASS[lines])}>{text}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-brand font-bold text-[10px] hover:underline"
      >
        {expandLabel}
      </button>
      {modal}
    </div>
  );
}
