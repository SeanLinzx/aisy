'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { isPadMode } from '@/lib/pad-mode';
import { useClassroomActive } from '@/hooks/use-classroom-active';
import { GroupScoreboardPanel } from '@/components/course/group-scoreboard-panel';

interface TeacherScoreFabProps {
  /** 是否与「回到待机」FAB 同屏（课堂控制台页），需抬高避免重叠 */
  stackedWithStandby?: boolean;
}

/** 老师端右下角悬浮窗：上课期间快捷为各小组加分 */
export function TeacherScoreFab({ stackedWithStandby }: TeacherScoreFabProps) {
  const pathname = usePathname();
  const pad = isPadMode();
  const active = useClassroomActive(3000);
  const stacked = stackedWithStandby ?? pathname.startsWith('/teacher/classroom');
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!active) {
      setOpen(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const r = await api.get('/classes');
        if (!alive) return;
        const list = r.data || [];
        setClasses(list);
        if (list[0]?.id) setClassId((prev) => prev || list[0].id);
      } catch {
        if (alive) setClasses([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  if (!active) return null;

  const bottomClass = pad
    ? stacked
      ? 'bottom-40'
      : 'bottom-24'
    : stacked
      ? 'bottom-28'
      : 'bottom-6';

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="关闭加分面板"
          className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      <div className={cn('fixed right-4 z-[60] flex flex-col items-end gap-2', bottomClass)}>
        {open && (
          <div className="w-[min(100vw-2rem,26rem)] max-h-[min(70vh,32rem)] overflow-y-auto rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50 shadow-2xl p-4 animate-pop origin-bottom-right">
            <div className="flex items-center justify-between gap-2 mb-3 sticky top-0 bg-gradient-to-br from-white to-emerald-50 pb-2">
              <div className="font-display font-extrabold text-lg flex items-center gap-2">
                <span>⚡</span> 快捷加分
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

            {classes.length > 1 && (
              <label className="block text-xs font-bold text-ink-soft mb-2">
                选择班级
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="mt-1 w-full kid-input !py-2 !text-sm"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <GroupScoreboardPanel classId={classId} compact title="各小组积分" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? '收起加分面板' : '快捷为小组加分'}
          aria-expanded={open}
          className={cn(
            'flex items-center gap-2 rounded-full border-2 font-extrabold shadow-pop transition-all active:scale-95',
            pad ? 'min-h-[52px] px-5 text-base' : 'min-h-[48px] px-4 text-sm',
            open
              ? 'border-emerald-400 bg-emerald-100 text-emerald-800'
              : 'border-emerald-300 bg-gradient-to-r from-emerald-400 to-teal-500 text-white hover:brightness-105',
          )}
        >
          <span className="text-xl leading-none" aria-hidden>
            ⚡
          </span>
          <span className="whitespace-nowrap">{open ? '收起加分' : '快捷加分'}</span>
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0" aria-hidden />
        </button>
      </div>
    </>
  );
}
