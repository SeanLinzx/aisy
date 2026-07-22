'use client';

import { cn } from '@/lib/cn';
import { useCampSongAudio } from '@/hooks/use-camp-song-audio';
import type { CampSongState } from '@/lib/camp-song';

interface CampSongFabProps {
  active: boolean;
  campSong: CampSongState | null;
  busy: boolean;
  pad?: boolean;
  onStart: () => void;
  onStop: () => void;
  onSetSyncStudents: (sync: boolean) => void;
}

/** 老师端：播放营歌 + 控制学生端是否跟播 */
export function CampSongFab({
  active,
  campSong,
  busy,
  pad = false,
  onStart,
  onStop,
  onSetSyncStudents,
}: CampSongFabProps) {
  const playing = !!campSong?.active;
  const syncStudents = campSong?.syncStudents !== false;
  useCampSongAudio(playing, campSong?.startedAt ?? null);

  return (
    <div
      className={cn(
        'fixed z-40 flex flex-col items-end gap-2',
        pad ? 'top-20 right-4' : 'top-4 right-4',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border-2 bg-white px-3 py-2 shadow-pop-sm',
          syncStudents ? 'border-emerald-200' : 'border-orange-200',
        )}
      >
        <span className="text-[11px] font-bold text-ink-soft whitespace-nowrap">学生跟唱</span>
        <button
          type="button"
          role="switch"
          aria-checked={syncStudents}
          disabled={!active || busy || !playing}
          onClick={() => onSetSyncStudents(!syncStudents)}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors shrink-0',
            syncStudents ? 'bg-emerald-500' : 'bg-slate-300',
            (!active || busy) && 'opacity-50 cursor-not-allowed',
          )}
          title={syncStudents ? '学生端正在播放营歌，点击关闭' : '仅老师端播放，点击让学生一起听'}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
              syncStudents && 'translate-x-5',
            )}
          />
        </button>
      </div>

      <button
        type="button"
        onClick={playing ? onStop : onStart}
        disabled={!active || busy}
        title={
          !active
            ? '请先开始上课，再播放营歌'
            : playing
              ? '停止营歌'
              : '老师端播放营歌，可用开关控制学生是否跟唱'
        }
        aria-label={playing ? '停止营歌' : '播放营歌'}
        className={cn(
          'flex items-center gap-2 rounded-full border-2 font-extrabold shadow-pop transition-all',
          'active:scale-95',
          pad ? 'min-h-[52px] px-5 text-base' : 'min-h-[48px] px-4 text-sm',
          playing
            ? 'border-pink-300 bg-gradient-to-r from-pink-400 to-rose-500 text-white hover:brightness-105'
            : 'border-violet-300 bg-gradient-to-r from-violet-400 to-purple-500 text-white hover:brightness-105',
          (!active || busy) && 'opacity-60 cursor-not-allowed',
        )}
      >
        <span className="text-xl leading-none" aria-hidden>
          {playing ? '⏹️' : '▶️'}
        </span>
        <span className="whitespace-nowrap">{playing ? '停止营歌' : '播放营歌'}</span>
      </button>
    </div>
  );
}
