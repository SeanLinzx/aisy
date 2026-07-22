'use client';

import { cn } from '@/lib/cn';

/** 老师端：控制课件是否同步到学生屏幕 */
export function SlidesSyncToggle({
  syncToStudents,
  busy,
  disabled,
  onChange,
  className,
}: {
  syncToStudents: boolean;
  busy?: boolean;
  disabled?: boolean;
  onChange: (sync: boolean) => void;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 cursor-pointer select-none transition',
        syncToStudents
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : 'border-orange-200 bg-orange-50 text-orange-800',
        (busy || disabled) && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={syncToStudents}
        disabled={busy || disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={cn(
          'relative w-9 h-5 rounded-full shrink-0 transition-colors',
          syncToStudents ? 'bg-emerald-500' : 'bg-slate-300',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            syncToStudents && 'translate-x-4',
          )}
        />
      </span>
      <span className="text-xs font-extrabold whitespace-nowrap">
        {syncToStudents ? '📡 学生同步中' : '📡 仅老师播放'}
      </span>
    </label>
  );
}
