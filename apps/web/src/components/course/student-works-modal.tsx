'use client';

import { useEffect } from 'react';
import { GameProgressTeacherPanel } from '@/components/course/game-progress-teacher-panel';
import { SummaryTeacherPanel } from '@/components/course/summary-teacher-panel';
import { VideoRecognitionTeacherPanel } from '@/components/course/video-recognition-teacher-panel';
import type { GameProgressRecord } from '@/lib/course-game-progress';
import type { SummaryStudentRecord } from '@/lib/detective-summary';
import type { TrackedCreationGame } from '@/lib/course-game-progress';

interface StudentOption {
  id: string;
  displayName: string;
  username: string;
}

export function StudentWorksModal({
  open,
  onClose,
  title,
  subtitle,
  mode,
  gameSlug,
  gameSlugs,
  students,
  rosterIds,
  session,
  summarySession,
  videoRecognitionSession,
  onPushShowcase,
  onPushSummary,
  pushingStudentId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  mode: 'creation' | 'summary' | 'video-recognition';
  gameSlug?: TrackedCreationGame;
  gameSlugs?: TrackedCreationGame[];
  students: StudentOption[];
  rosterIds: string[];
  session?: import('@/lib/course-game-progress').GameProgressSession | null;
  summarySession?: import('@/lib/detective-summary').SummarySession | null;
  videoRecognitionSession?: import('@/lib/video-recognition').VideoRecognitionSession | null;
  onPushShowcase?: (record: GameProgressRecord) => void;
  onPushSummary?: (record: SummaryStudentRecord) => void;
  pushingStudentId?: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-5xl max-h-[92vh] sm:max-h-[88vh] bg-white rounded-t-3xl sm:rounded-3xl border-2 border-orange-100 shadow-2xl flex flex-col overflow-hidden animate-pop">
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-sky-50">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold truncate">{title}</h2>
            {subtitle && <p className="text-xs text-ink-soft font-semibold mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 kid-button-sm bg-white border-2 border-orange-200 text-ink-soft min-h-[40px] px-4"
          >
            ✕ 关闭
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {mode === 'summary' ? (
            <SummaryTeacherPanel
              students={students}
              rosterIds={rosterIds}
              session={summarySession}
              onPushShowcase={onPushSummary}
              pushingStudentId={pushingStudentId}
            />
          ) : mode === 'video-recognition' ? (
            <VideoRecognitionTeacherPanel
              students={students}
              rosterIds={rosterIds}
              session={videoRecognitionSession}
            />
          ) : (
            <GameProgressTeacherPanel
              gameSlug={gameSlug}
              gameSlugs={gameSlugs}
              panelTitle={title}
              students={students}
              rosterIds={rosterIds}
              session={session}
              onPushShowcase={onPushShowcase}
              pushingStudentId={pushingStudentId}
              wrapCard={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
