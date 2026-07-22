'use client';

import { useLanguage } from '@/contexts/language-context';

interface ClassroomBarProps {
  included: boolean;
  label: string;
  isAway: boolean;
  returnToClass: () => void;
}

/** 上课中底部悬浮条 */
export function ClassroomBar({
  included,
  locked,
  label,
  isAway,
  returnToClass,
}: ClassroomBarProps & { locked?: boolean }) {
  const { t, tx } = useLanguage();
  if (!included) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full bg-gradient-to-r from-violet-600 to-sky-600 text-white shadow-pop px-5 py-3 max-w-[min(100vw-2rem,36rem)]">
      <span className="text-sm font-bold truncate">
        {locked ? t('classroom.locked', '🔒 上课锁定：') : t('classroom.active', '🎓 正在上课：')}
        {label}
      </span>
      {isAway ? (
        <button
          type="button"
          onClick={returnToClass}
          className="shrink-0 text-xs font-bold bg-white/95 text-violet-700 rounded-full px-3 py-1.5 hover:bg-white transition"
        >
          {t('classroom.return', '↩️ 回到课堂')}
        </button>
      ) : (
        <span className="shrink-0 text-[11px] font-semibold bg-white/20 rounded-full px-2.5 py-1">
          {locked ? t('classroom.following', '跟随老师') : tx('跟课中')}
        </span>
      )}
    </div>
  );
}
