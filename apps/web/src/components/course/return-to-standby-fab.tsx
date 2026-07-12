'use client';

import { cn } from '@/lib/cn';

interface ReturnToStandbyFabProps {
  /** 是否正在上课 */
  active: boolean;
  /** 学生是否已在待机（看课件） */
  isStandby: boolean;
  busy: boolean;
  /** 是否已上传/播放课件 */
  hasSlides: boolean;
  onReturn: () => void;
  pad?: boolean;
}

/** 老师端右下角常驻：待机中显示状态；上课环节时一键回到课件待机 */
export function ReturnToStandbyFab({
  active,
  isStandby,
  busy,
  hasSlides,
  onReturn,
  pad = false,
}: ReturnToStandbyFabProps) {
  if (!active) return null;

  const title = isStandby
    ? '全班正在待机看课件，在上方选择环节并点击「启动环节」'
    : hasSlides
      ? '停止当前环节，让学生回到黑板看课件'
      : '停止当前环节；请先上传或播放课件，学生才能看到黑板内容';

  return (
    <button
      type="button"
      onClick={onReturn}
      disabled={busy || isStandby}
      title={title}
      aria-label={isStandby ? '待机中' : '回到待机状态'}
      className={cn(
        'fixed right-4 z-50 flex items-center gap-2 rounded-full border-2 font-extrabold shadow-pop transition-all',
        'active:scale-95',
        pad ? 'bottom-24 min-h-[52px] px-5 text-base' : 'bottom-6 min-h-[48px] px-4 text-sm',
        isStandby
          ? 'border-violet-300 bg-violet-100 text-violet-800 cursor-default shadow-violet-200/50'
          : 'border-orange-300 bg-gradient-to-r from-orange-400 to-brand text-white hover:brightness-105 hover:shadow-lg disabled:opacity-70',
      )}
    >
      <span className="text-xl leading-none" aria-hidden>
        📺
      </span>
      <span className="whitespace-nowrap">{isStandby ? '📺 待机中 · 可启动环节' : '回到待机状态'}</span>
      {isStandby && (
        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse shrink-0" aria-hidden />
      )}
    </button>
  );
}
