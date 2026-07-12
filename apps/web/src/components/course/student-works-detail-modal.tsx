'use client';

import { useEffect } from 'react';
import { resolveUploadPath } from '@/lib/upload-url';
import { cn } from '@/lib/cn';
import type { GameProgressRecord } from '@/lib/course-game-progress';
import { GAME_PROGRESS_LABELS, type TrackedCreationGame } from '@/lib/course-game-progress';
import { collectStudentWorks, type StudentWorkEntry } from '@/lib/student-works-detail';
import { showcaseFromProgress } from '@/lib/classroom-showcase';

function WorkMedia({ entry }: { entry: StudentWorkEntry }) {
  if (entry.url) {
    if (entry.isVideo) {
      return (
        <video
          src={resolveUploadPath(entry.url)}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-56 object-contain bg-black rounded-xl"
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolveUploadPath(entry.url)}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-full max-h-56 object-contain bg-slate-100 rounded-xl"
      />
    );
  }
  return null;
}

function WorkCard({
  entry,
  index,
  record,
  onPushShowcase,
  pushing,
}: {
  entry: StudentWorkEntry;
  index: number;
  record: GameProgressRecord;
  onPushShowcase?: (record: GameProgressRecord) => void;
  pushing?: boolean;
}) {
  const pushRecord: GameProgressRecord = {
    ...record,
    prompt: entry.prompt || record.prompt,
    imageUrls: entry.url && !entry.isVideo ? [entry.url] : record.imageUrls,
    videoUrl: entry.isVideo ? entry.url : undefined,
    thumbnailUrl: entry.url,
    text: entry.text || record.text,
    title: entry.title || record.title,
  };
  const canPush = record.status === 'done' && onPushShowcase && showcaseFromProgress(pushRecord);

  return (
    <article className="rounded-2xl border-2 border-orange-100 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-extrabold text-ink">
          {entry.themeLabel ? `${entry.themeLabel} · ` : ''}
          {entry.label || `作品 ${index + 1}`}
        </span>
        {entry.status === 'failed' && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">失败</span>
        )}
      </div>

      <WorkMedia entry={entry} />

      {entry.title && (
        <div className="text-sm font-extrabold text-violet-800">{entry.title}</div>
      )}

      {entry.text && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
          {entry.text}
        </p>
      )}

      {entry.prompt && (
        <p className="text-xs text-ink-soft leading-relaxed" title={entry.prompt}>
          💭 {entry.prompt}
        </p>
      )}

      {canPush && (
        <button
          type="button"
          disabled={pushing}
          onClick={() => onPushShowcase(pushRecord)}
          className="w-full kid-button-sm bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 shadow-sm hover:brightness-105 disabled:opacity-60"
        >
          {pushing ? '推送中…' : '🌟 推送给全班展示'}
        </button>
      )}
    </article>
  );
}

export function StudentWorksDetailModal({
  open,
  onClose,
  studentName,
  record,
  onPushShowcase,
  pushing,
}: {
  open: boolean;
  onClose: () => void;
  studentName: string;
  record: GameProgressRecord | null;
  onPushShowcase?: (record: GameProgressRecord) => void;
  pushing?: boolean;
}) {
  const works = collectStudentWorks(record);
  const gameLabel =
    record?.gameSlug && GAME_PROGRESS_LABELS[record.gameSlug as TrackedCreationGame]
      ? GAME_PROGRESS_LABELS[record.gameSlug as TrackedCreationGame]
      : record?.gameSlug;

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

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-3xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl border-2 border-orange-100 shadow-2xl flex flex-col overflow-hidden animate-pop">
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-orange-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold truncate">
              🧒 {studentName} 的全部作品
            </h2>
            <p className="text-xs text-ink-soft font-semibold mt-0.5">
              {gameLabel ? `${gameLabel} · ` : ''}共 {works.length} 件
              {record.roundCount != null && record.roundCount > 0 ? ` · 已创作 ${record.roundCount} 轮` : ''}
            </p>
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
          {works.length === 0 ? (
            <p className="text-sm text-ink-soft text-center py-8">这位同学还没有提交作品。</p>
          ) : (
            <div className={cn('grid gap-3', works.length > 1 ? 'sm:grid-cols-2' : '')}>
              {works.map((entry, i) => (
                <WorkCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  record={record}
                  onPushShowcase={onPushShowcase}
                  pushing={pushing}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
