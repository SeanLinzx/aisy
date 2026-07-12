'use client';

import type { ReactNode } from 'react';
import type { CourseGame } from '@/lib/course-config';
import { cn } from '@/lib/cn';

export function gamePushLabel(current: boolean, isStandby: boolean, isPlaceholder?: boolean, compact?: boolean) {
  if (isPlaceholder) return compact ? '🚧' : '🚧 暂未开放';
  if (current) return compact ? '📲 推送' : '📲 再次推送';
  if (isStandby) return compact ? '▶️ 启动' : '▶️ 启动环节';
  return compact ? '🎮 推送' : '🎮 推送给学生';
}

/**
 * 每个游戏模块的老师控制台：标题 / 说明 / 推送按钮。
 * 当前环节的实时看板通过 children 嵌入，不再单独置顶。
 */
export function GameConsoleCard({
  game,
  current,
  isStandby = false,
  busy,
  onPush,
  disabled,
  footnote,
  compact,
  children,
}: {
  game: CourseGame;
  current: boolean;
  isStandby?: boolean;
  busy: boolean;
  onPush: () => void;
  disabled?: boolean;
  footnote?: string;
  compact?: boolean;
  children?: ReactNode;
}) {
  const isPlaceholder = game.status === 'placeholder';
  const pushLabel = gamePushLabel(current, isStandby, isPlaceholder, compact);
  const pushClass = cn(
    'kid-button-sm shrink-0',
    compact ? '!py-1.5 !px-2.5 text-[11px]' : '!py-2 !px-3.5 text-xs',
    current
      ? 'bg-white border-2 border-emerald-200 text-emerald-700'
      : isStandby
        ? 'kid-button-primary !shadow-md ring-2 ring-emerald-300/50'
        : 'kid-button-primary',
  );

  if (compact && !current) {
    return (
      <div
        id={`game-${game.slug}`}
        className={cn(
          'flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2',
          isStandby ? 'border-violet-200 bg-violet-50/40' : 'border-orange-100 bg-white',
        )}
        style={{ scrollMarginTop: 'var(--teacher-sticky-top, 9.5rem)' }}
      >
        <div className="min-w-0 flex items-center gap-2 text-sm font-bold truncate">
          <span>{game.emoji}</span>
          <span className="truncate">{game.title}</span>
        </div>
        <button type="button" onClick={onPush} disabled={busy || disabled || isPlaceholder} className={pushClass}>
          {pushLabel}
        </button>
      </div>
    );
  }

  return (
    <div
      id={`game-${game.slug}`}
      className={cn(
        'rounded-2xl border-2 transition',
        current
          ? 'border-brand bg-orange-50/50 ring-2 ring-brand/20'
          : isStandby
            ? 'border-violet-100 bg-white'
            : 'border-orange-100 bg-white',
      )}
      style={{ scrollMarginTop: 'var(--teacher-sticky-top, 9.5rem)' }}
    >
      <div className="flex items-start justify-between flex-wrap gap-2 px-4 py-3 border-b border-orange-100/80">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold flex items-center gap-1.5 flex-wrap">
            <span>{game.emoji}</span>
            <span>{game.title}</span>
            {current && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                ● 学生在这里
              </span>
            )}
            {isStandby && !current && (
              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                待启动
              </span>
            )}
            {isPlaceholder && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">开发中</span>
            )}
          </div>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed max-w-xl">{game.desc}</p>
        </div>
        <button type="button" onClick={onPush} disabled={busy || disabled || isPlaceholder} className={pushClass}>
          {pushLabel}
        </button>
      </div>

      {(children || footnote) && (
        <div className="p-4 space-y-3">
          {children}
          {footnote && <p className="text-[11px] text-ink-soft bg-orange-50/60 rounded-xl px-3 py-2">{footnote}</p>}
        </div>
      )}
    </div>
  );
}
