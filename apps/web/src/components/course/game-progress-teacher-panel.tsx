'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import {
  GAME_PROGRESS_LABELS,
  mergeProgressRecordsByStudent,
  isVideoProgressRecord,
  type GameProgressRecord,
  type GameProgressSession,
  type TrackedCreationGame,
} from '@/lib/course-game-progress';
import { showcaseFromProgress } from '@/lib/classroom-showcase';
import { cn } from '@/lib/cn';

interface StudentOption {
  id: string;
  displayName: string;
  username: string;
}

function isVideoMediaUrl(url?: string) {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes('/video') || url.includes('videoUrl');
}

function ProgressMediaPreview({ record, url }: { record: GameProgressRecord; url: string }) {
  const isVideo = isVideoProgressRecord(record) || isVideoMediaUrl(url);
  if (isVideo) {
    return (
      <video
        src={resolveUploadPath(url)}
        controls
        playsInline
        className="w-full max-h-36 object-contain bg-black"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolveUploadPath(url)} alt="" className="w-full max-h-36 object-cover" />
  );
}

function statusLabel(status: GameProgressRecord['status']) {
  switch (status) {
    case 'generating':
      return { text: '生成中…', className: 'bg-amber-100 text-amber-700' };
    case 'done':
      return { text: '已完成', className: 'bg-emerald-100 text-emerald-700' };
    case 'failed':
      return { text: '失败', className: 'bg-rose-100 text-rose-700' };
    default:
      return { text: '未开始', className: 'bg-slate-100 text-slate-500' };
  }
}

function StudentProgressCard({
  record,
  onPushShowcase,
  pushing,
}: {
  record: GameProgressRecord | null;
  onPushShowcase?: (record: GameProgressRecord) => void;
  pushing?: boolean;
}) {
  if (!record || record.status === 'idle') {
    return (
      <div className="rounded-2xl border-2 border-dashed border-orange-100 bg-white/70 p-3 min-h-[140px] flex flex-col items-center justify-center text-center">
        <span className="text-2xl opacity-40">⏳</span>
        <span className="text-xs font-bold text-ink-soft mt-1">还没开始</span>
      </div>
    );
  }

  const st = statusLabel(record.status);
  const thumb = record.thumbnailUrl || record.videoUrl || record.imageUrls?.[0];

  return (
    <div className="rounded-2xl border-2 border-orange-100 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.className}`}>{st.text}</span>
        <div className="flex items-center gap-1">
          {record.gameSlug && (
            <span className="text-[10px] font-bold text-sky-600 truncate max-w-[72px]" title={GAME_PROGRESS_LABELS[record.gameSlug as TrackedCreationGame] || record.gameSlug}>
              {GAME_PROGRESS_LABELS[record.gameSlug as TrackedCreationGame] || record.gameSlug}
            </span>
          )}
          {record.roundCount != null && record.roundCount > 0 && (
            <span className="text-[10px] font-bold text-violet-600">{record.roundCount} 轮</span>
          )}
        </div>
      </div>

      {record.status === 'generating' && (
        <div className="aspect-video rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 animate-pulse">
          AI 正在创作…
        </div>
      )}

      {record.status === 'failed' && (
        <div className="text-xs text-rose-600 bg-rose-50 rounded-xl px-2 py-2">{record.error || '生成失败'}</div>
      )}

      {record.status === 'generating' && !thumb && record.gameSlug === 'acrostic-poem' && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-4 flex items-center justify-center text-xs font-bold text-amber-700 animate-pulse min-h-[100px]">
          AI 正在写诗…
        </div>
      )}

      {thumb && record.status !== 'generating' && (
        <div className="rounded-xl overflow-hidden border border-orange-50 bg-slate-100">
          <ProgressMediaPreview record={record} url={thumb} />
        </div>
      )}

      {record.text && record.status === 'done' && (
        <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-2 space-y-1">
          {record.title && (
            <div className="text-xs font-extrabold text-violet-800">{record.title}</div>
          )}
          <p className="text-[11px] leading-relaxed whitespace-pre-wrap line-clamp-8 text-ink">
            {record.text}
          </p>
        </div>
      )}

      {record.prompt && !record.text && (
        <p className="text-[11px] text-ink-soft line-clamp-2 leading-relaxed" title={record.prompt}>
          {record.prompt}
        </p>
      )}

      {record.prompt && record.text && (
        <p className="text-[10px] text-ink-soft line-clamp-1" title={record.prompt}>
          {record.prompt}
        </p>
      )}

      {record.summary && !record.text && <p className="text-[10px] font-bold text-violet-600">{record.summary}</p>}

      {record.items && record.items.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {record.items.slice(-4).map((item, i) =>
            item.url ? (
              <div
                key={`${item.url}-${i}`}
                className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-orange-100 bg-black"
                title={item.label || item.prompt}
              >
                {isVideoMediaUrl(item.url) ? (
                  <video src={resolveUploadPath(item.url)} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveUploadPath(item.url)} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            ) : null,
          )}
        </div>
      )}

      {record.status === 'done' && onPushShowcase && showcaseFromProgress(record) && (
        <button
          type="button"
          disabled={pushing}
          onClick={() => onPushShowcase(record)}
          className="w-full kid-button-sm bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 shadow-sm hover:brightness-105 disabled:opacity-60"
        >
          {pushing ? '推送中…' : '🌟 推送给全班展示'}
        </button>
      )}
    </div>
  );
}

export function GameProgressTeacherPanel({
  gameSlug,
  gameSlugs,
  panelTitle,
  students,
  rosterIds,
  session,
  onPushShowcase,
  pushingStudentId,
  wrapCard = true,
  maxGridHeight = 'max-h-[70vh]',
}: {
  gameSlug?: TrackedCreationGame;
  /** 合并多个来源（如第 4 课全部视频创作） */
  gameSlugs?: TrackedCreationGame[];
  panelTitle?: string;
  students: StudentOption[];
  /** 课堂参与学生 id；空 = 全班 */
  rosterIds: string[];
  /** 由中控台聚合轮询注入的进度数据；提供后本组件不再自行轮询 */
  session?: GameProgressSession | null;
  /** 老师推送优秀作品到全班 */
  onPushShowcase?: (record: GameProgressRecord) => void;
  pushingStudentId?: string | null;
  /** 是否包裹 kid-card 外框（嵌入作品中心时为 false） */
  wrapCard?: boolean;
  maxGridHeight?: string;
}) {
  const slugs = gameSlugs?.length ? gameSlugs : gameSlug ? [gameSlug] : [];
  const external = session !== undefined;
  const [polled, setPolled] = useState<GameProgressSession | null>(null);

  const roster = useMemo(() => {
    const list = rosterIds.length > 0 ? students.filter((s) => rosterIds.includes(s.id)) : students;
    return list;
  }, [students, rosterIds]);

  useEffect(() => {
    if (external || slugs.length === 0) return;
    let alive = true;
    async function load() {
      try {
        const r = await api.get('/course/game-progress', { params: { game: slugs.join(',') } });
        if (alive) setPolled((r.data as GameProgressSession | null) || null);
      } catch {
        if (alive) setPolled(null);
      }
    }
    load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [external, slugs.join(',')]);

  const recordsByStudent = useMemo(() => {
    const src = external ? session : polled;
    const wanted = new Set<string>(slugs);
    const filtered: Record<string, GameProgressRecord> = {};
    for (const [key, rec] of Object.entries(src?.records || {})) {
      if (wanted.size === 0 || wanted.has(rec.gameSlug)) filtered[key] = rec;
    }
    return mergeProgressRecordsByStudent([filtered]);
  }, [external, session, polled, slugs.join(',')]);

  const records = Array.from(recordsByStudent.values());
  const done = records.filter((r) => r.status === 'done').length;
  const generating = records.filter((r) => r.status === 'generating').length;
  const failed = records.filter((r) => r.status === 'failed').length;

  const title =
    panelTitle ||
    (slugs.length === 1 ? GAME_PROGRESS_LABELS[slugs[0]] : slugs.length > 1 ? 'AI 生视频' : '创作看板');

  if (slugs.length === 0) return null;

  const inner = (
    <>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-bold">📡 实时创作看板 · {title}</div>
          <div className="text-xs text-ink-soft mt-0.5">学生每生成一张图 / 一段视频 / 一首诗会自动同步到这里（约 3 秒刷新）</div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="tag">参与 {roster.length} 人</span>
          <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">完成 {done}</span>
          <span className="tag bg-amber-50 text-amber-700 border-amber-200">生成中 {generating}</span>
          {failed > 0 && <span className="tag bg-rose-50 text-rose-700 border-rose-200">失败 {failed}</span>}
        </div>
      </div>

      {roster.length === 0 ? (
        <p className="text-sm text-ink-soft">还没有学生账号。</p>
      ) : (
        <div className={cn('grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1', maxGridHeight)}>
          {roster.map((s) => (
            <div key={s.id}>
              <div className="text-sm font-extrabold mb-1.5 truncate">{s.displayName}</div>
              <StudentProgressCard
                record={recordsByStudent.get(s.id) ?? null}
                onPushShowcase={onPushShowcase}
                pushing={pushingStudentId === s.id}
              />
            </div>
          ))}
        </div>
      )}

      {records.length === 0 && roster.length > 0 && (
        <p className="text-sm text-ink-soft">还没有同学提交作品，等他们开始生成后这里会出现预览。</p>
      )}
    </>
  );

  if (!wrapCard) {
    return <div className="space-y-4 p-3">{inner}</div>;
  }

  return (
    <div className="kid-card-sky space-y-4">
      {inner}
    </div>
  );
}
