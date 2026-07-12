'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { isPadMode } from '@/lib/pad-mode';
import { useMyGroupScore } from '@/hooks/use-my-group-score';

interface StudentScoreFabProps {
  /** 底部课堂跟随条是否显示（需抬高 FAB 避免遮挡） */
  classroomBar?: boolean;
}

/** 学生端右下角悬浮窗：查看本组与全班小组积分，加分时有庆祝动画 */
export function StudentScoreFab({ classroomBar = false }: StudentScoreFabProps) {
  const pad = isPadMode();
  const { data, gain, clearGain } = useMyGroupScore(4000);
  const [open, setOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (!gain) return;
    setCelebrating(true);
    const t = setTimeout(() => {
      setCelebrating(false);
      clearGain();
    }, 2200);
    return () => clearTimeout(t);
  }, [gain, clearGain]);

  const points = data?.myGroup?.points ?? 0;
  const hasGroup = !!data?.myGroup;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="关闭积分面板"
          className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed right-4 z-[60] flex flex-col items-end gap-2',
          pad ? (classroomBar ? 'bottom-32' : 'bottom-24') : classroomBar ? 'bottom-20' : 'bottom-6',
        )}
      >
        {open && (
          <div className="w-[min(100vw-2rem,22rem)] rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-white to-amber-50 shadow-2xl p-4 animate-pop origin-bottom-right">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="font-display font-extrabold text-lg flex items-center gap-2">
                <span>🏆</span> 小组积分
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-white border-2 border-orange-100 text-sm font-bold hover:bg-orange-50"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            {!hasGroup ? (
              <p className="text-sm text-ink-soft leading-relaxed">
                老师分组后，这里会显示你们小组的积分和排名哦～
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white border-2 border-amber-200 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-ink-soft">我的小组</div>
                    <div className="font-extrabold truncate flex items-center gap-1.5">
                      <span>👯</span> {data!.myGroup!.name}
                    </div>
                    <div className="text-xs font-bold text-violet-700 mt-0.5">
                      第 {data!.rank ?? '—'} / {data!.totalGroups} 名
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="text-3xl font-display font-extrabold text-brand">{points}</div>
                    <div className="text-[10px] font-bold text-ink-soft">积分</div>
                  </div>
                </div>

                {data!.leaderboard.length > 1 && (
                  <div>
                    <div className="text-xs font-bold text-ink-soft mb-1.5">全班排行榜</div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                      {data!.leaderboard.map((g, i) => {
                        const mine = g.id === data!.myGroup!.id;
                        return (
                          <div
                            key={g.id}
                            className={cn(
                              'flex items-center justify-between rounded-xl px-3 py-2 text-sm',
                              mine
                                ? 'bg-amber-100 border-2 border-amber-300 font-bold'
                                : 'bg-white/90 border border-orange-100',
                            )}
                          >
                            <span className="truncate">
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {g.name}
                              {mine && ' · 我们'}
                            </span>
                            <span className="font-extrabold text-brand shrink-0 ml-2">{g.points}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="relative">
          {celebrating && gain && (
            <>
              <span
                key={`delta-${gain.at}`}
                className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 text-lg font-extrabold text-emerald-600 animate-score-float whitespace-nowrap"
              >
                +{gain.delta} 🎉
              </span>
              <span
                key={`spark-${gain.at}`}
                className="pointer-events-none absolute -top-1 -right-1 text-xl animate-sparkle"
                aria-hidden
              >
                ✨
              </span>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? '收起积分面板' : '查看小组积分'}
            aria-expanded={open}
            className={cn(
              'relative flex items-center gap-2 rounded-full border-2 font-extrabold shadow-pop transition-all active:scale-95',
              pad ? 'min-h-[52px] px-5 text-base' : 'min-h-[48px] px-4 text-sm',
              celebrating
                ? 'border-amber-400 bg-gradient-to-r from-amber-300 to-yellow-300 text-amber-900 animate-score-bounce ring-4 ring-amber-200/80'
                : open
                  ? 'border-amber-400 bg-amber-100 text-amber-900'
                  : 'border-amber-300 bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:brightness-105',
            )}
          >
            <span className="text-xl leading-none" aria-hidden>
              🏆
            </span>
            <span className="whitespace-nowrap">{hasGroup ? `${points} 分` : '积分'}</span>
            {celebrating && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
