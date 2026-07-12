'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import {
  GAME_PROGRESS_LABELS,
  mergeProgressRecordsByStudent,
  isVideoProgressRecord,
  resolveDecorateRoomThemeRecord,
  type GameProgressRecord,
  type GameProgressSession,
  type TrackedCreationGame,
} from '@/lib/course-game-progress';
import { DECORATE_ROOM_THEMES } from '@/lib/decorate-room-draft';
import { showcaseFromProgress } from '@/lib/classroom-showcase';
import { cn } from '@/lib/cn';
import { countStudentWorks } from '@/lib/student-works-detail';
import { StudentWorksDetailModal } from '@/components/course/student-works-detail-modal';

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
        preload="metadata"
        className="w-full max-h-36 object-contain bg-black"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveUploadPath(url)}
      alt=""
      loading="lazy"
      decoding="async"
      className="w-full max-h-36 object-cover"
    />
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

const StudentProgressCard = memo(function StudentProgressCard({
  record,
  onPushShowcase,
  onEndShowcase,
  pushing,
  isShowcasing,
  hideGameLabel,
}: {
  record: GameProgressRecord | null;
  onPushShowcase?: (record: GameProgressRecord) => void;
  onEndShowcase?: () => void;
  pushing?: boolean;
  isShowcasing?: boolean;
  hideGameLabel?: boolean;
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
          {!hideGameLabel && record.gameSlug && (
            <span className="text-[10px] font-bold text-sky-600 truncate max-w-[72px]" title={GAME_PROGRESS_LABELS[record.gameSlug as TrackedCreationGame] || record.gameSlug}>
              {GAME_PROGRESS_LABELS[record.gameSlug as TrackedCreationGame] || record.gameSlug}
            </span>
          )}
          {record.roundCount != null && record.roundCount > 0 && (
            <span className="text-[10px] font-bold text-violet-600">{record.roundCount} 轮</span>
          )}
        </div>
      </div>

      {record.status === 'generating' && record.gameSlug !== 'acrostic-poem' && record.gameSlug !== 'spot-diff' && record.gameSlug !== 'clue-card-detective' && (
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

      {record.status === 'generating' && !thumb && record.gameSlug === 'spot-diff' && (
        <div className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-4 flex flex-col items-center justify-center text-xs font-bold text-sky-700 min-h-[100px] gap-1">
          <span className="text-2xl">🧐</span>
          <span>{record.summary || '找不同进行中…'}</span>
          {record.roundCount != null && record.roundCount > 0 && (
            <span className="text-[10px] font-bold text-violet-600">第 {record.roundCount} 关</span>
          )}
        </div>
      )}

      {record.status === 'generating' && !thumb && record.gameSlug === 'clue-card-detective' && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-4 flex flex-col items-center justify-center text-xs font-bold text-amber-800 min-h-[100px] gap-1.5">
          <span className="text-2xl">🕵️</span>
          <span>{record.summary || '侦探进行中…'}</span>
          {record.roundCount != null && record.roundCount > 0 && (
            <div className="flex gap-0.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full border',
                    i < record.roundCount! ? 'bg-emerald-400 border-emerald-500' : 'bg-white border-amber-200',
                  )}
                />
              ))}
            </div>
          )}
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

      {/* spot-diff 生成中已在上方专属卡片展示过 summary，这里不再重复渲染 */}
      {record.summary && !record.text && !(record.status === 'generating' && (record.gameSlug === 'spot-diff' || record.gameSlug === 'clue-card-detective')) && (
        <p className="text-[10px] font-bold text-violet-600">{record.summary}</p>
      )}

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
                  <img src={resolveUploadPath(item.url)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                )}
              </div>
            ) : null,
          )}
          {record.items.length > 4 && (
            <div className="w-12 h-12 rounded-lg shrink-0 border border-dashed border-orange-200 bg-orange-50 flex items-center justify-center text-[10px] font-bold text-orange-600">
              +{record.items.length - 4}
            </div>
          )}
        </div>
      )}

      {record.status === 'done' && onPushShowcase && showcaseFromProgress(record) && (
        isShowcasing && onEndShowcase ? (
          <button
            type="button"
            disabled={pushing}
            onClick={onEndShowcase}
            className="w-full kid-button-sm bg-white border-2 border-amber-300 text-amber-800 shadow-sm hover:bg-amber-50 disabled:opacity-60"
          >
            {pushing ? '处理中…' : '✋ 结束推送'}
          </button>
        ) : (
          <button
            type="button"
            disabled={pushing}
            onClick={() => onPushShowcase(record)}
            className="w-full kid-button-sm bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 shadow-sm hover:brightness-105 disabled:opacity-60"
          >
            {pushing ? '推送中…' : '🌟 推送给全班展示'}
          </button>
        )
      )}
    </div>
  );
});

const DecorateRoomStudentCard = memo(function DecorateRoomStudentCard({
  record,
  onPushShowcase,
  onEndShowcase,
  pushing,
  isShowcasing,
}: {
  record: GameProgressRecord;
  onPushShowcase?: (record: GameProgressRecord) => void;
  onEndShowcase?: () => void;
  pushing?: boolean;
  isShowcasing?: boolean;
}) {
  const [themeId, setThemeId] = useState(record.themeId || DECORATE_ROOM_THEMES[0].id);

  const displayRecord = useMemo(() => {
    if (record.themes) return resolveDecorateRoomThemeRecord(record, themeId);
    const defaultTheme = record.themeId || DECORATE_ROOM_THEMES[0].id;
    if (themeId === defaultTheme) return record;
    return {
      ...record,
      status: 'idle' as const,
      prompt: undefined,
      imageUrls: undefined,
      thumbnailUrl: undefined,
      items: undefined,
      roundCount: undefined,
      summary: undefined,
      error: undefined,
      themeId,
    };
  }, [record, themeId]);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1 flex-wrap">
        {DECORATE_ROOM_THEMES.map((t) => {
          const tp = record.themes?.[t.id];
          const isActive = t.id === themeId;
          const isGenerating = tp?.status === 'generating';
          const hasDone = tp?.status === 'done';
          const isLegacyActive = !record.themes && t.id === (record.themeId || DECORATE_ROOM_THEMES[0].id) && record.status !== 'idle';
          return (
            <button
              key={t.id}
              type="button"
              title={t.title}
              onClick={() => setThemeId(t.id)}
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full border transition',
                isActive
                  ? 'bg-brand text-white border-brand'
                  : hasDone || isLegacyActive
                    ? 'bg-white text-ink border-orange-200 hover:border-brand'
                    : 'bg-white/80 text-ink-soft border-orange-100 hover:border-orange-200',
              )}
            >
              {t.emoji} {t.shortTitle}
              {isGenerating && <span className="ml-0.5">🪄</span>}
            </button>
          );
        })}
      </div>
      <StudentProgressCard
        record={displayRecord}
        onPushShowcase={onPushShowcase}
        onEndShowcase={onEndShowcase}
        pushing={pushing}
        isShowcasing={isShowcasing}
        hideGameLabel
      />
    </div>
  );
});

export function GameProgressTeacherPanel({
  gameSlug,
  gameSlugs,
  panelTitle,
  students,
  rosterIds,
  session,
  onPushShowcase,
  onEndShowcase,
  pushingStudentId,
  activeShowcaseStudentId,
  wrapCard = true,
  maxGridHeight = 'max-h-[70vh]',
  hideHeader = false,
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
  /** 结束当前作品推送 */
  onEndShowcase?: () => void;
  pushingStudentId?: string | null;
  /** 正在全班展示的学生 id */
  activeShowcaseStudentId?: string | null;
  /** 是否包裹 kid-card 外框（嵌入作品中心时为 false） */
  wrapCard?: boolean;
  maxGridHeight?: string;
  /** 嵌入学生作品看板时隐藏重复标题行 */
  hideHeader?: boolean;
}) {
  const slugs = gameSlugs?.length ? gameSlugs : gameSlug ? [gameSlug] : [];
  const external = session !== undefined;
  const [polled, setPolled] = useState<GameProgressSession | null>(null);
  const [detailStudent, setDetailStudent] = useState<StudentOption | null>(null);

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

  const panelHint =
    slugs.length === 1 && (slugs[0] === 'clue-card-detective' || slugs[0] === 'spot-diff')
      ? '学生每找出一处错误会自动同步到这里（约 3 秒刷新）'
      : '学生每生成一张图 / 一段视频 / 一首诗会自动同步到这里（约 3 秒刷新）';

  const progressLabel =
    slugs.length === 1 && (slugs[0] === 'clue-card-detective' || slugs[0] === 'spot-diff')
      ? '进行中'
      : '生成中';

  const isDecorateRoomPanel = slugs.length === 1 && slugs[0] === 'decorate-room';

  if (slugs.length === 0) return null;

  const inner = (
    <>
      {!hideHeader && (
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-bold">📡 实时创作看板 · {title}</div>
          <div className="text-xs text-ink-soft mt-0.5">{panelHint}</div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="tag">参与 {roster.length} 人</span>
          <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">完成 {done}</span>
          <span className="tag bg-amber-50 text-amber-700 border-amber-200">{progressLabel} {generating}</span>
          {failed > 0 && <span className="tag bg-rose-50 text-rose-700 border-rose-200">失败 {failed}</span>}
        </div>
      </div>
      )}

      {roster.length === 0 ? (
        <p className="text-sm text-ink-soft">还没有学生账号。</p>
      ) : (
        <div className={cn('grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1', maxGridHeight)}>
          {roster.map((s) => {
            const record = recordsByStudent.get(s.id) ?? null;
            const workCount = countStudentWorks(record);
            const hasWorks = workCount > 0 || (record && record.status !== 'idle');
            return (
            <div key={s.id}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => hasWorks && setDetailStudent(s)}
                  disabled={!hasWorks}
                  className={cn(
                    'text-sm font-extrabold truncate text-left',
                    hasWorks
                      ? 'text-ink hover:text-brand hover:underline underline-offset-2 cursor-pointer'
                      : 'text-ink-soft cursor-default',
                  )}
                  title={hasWorks ? `查看 ${s.displayName} 的全部作品` : undefined}
                >
                  {s.displayName}
                </button>
                {hasWorks && (
                  <button
                    type="button"
                    onClick={() => setDetailStudent(s)}
                    className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                  >
                    {workCount > 1 ? `📂 ${workCount} 件` : '📂 查看'}
                  </button>
                )}
              </div>
              {isDecorateRoomPanel ? (
                <DecorateRoomStudentCard
                  record={
                    record?.gameSlug === 'decorate-room'
                      ? record
                      : {
                          studentId: s.id,
                          displayName: s.displayName,
                          gameSlug: 'decorate-room',
                          status: 'idle',
                          updatedAt: 0,
                        }
                  }
                  onPushShowcase={onPushShowcase}
                  onEndShowcase={onEndShowcase}
                  pushing={pushingStudentId === s.id}
                  isShowcasing={activeShowcaseStudentId === s.id}
                />
              ) : (
                <StudentProgressCard
                  record={record}
                  onPushShowcase={onPushShowcase}
                  onEndShowcase={onEndShowcase}
                  pushing={pushingStudentId === s.id}
                  isShowcasing={activeShowcaseStudentId === s.id}
                />
              )}
            </div>
            );
          })}
        </div>
      )}

      {records.length === 0 && roster.length > 0 && (
        <p className="text-sm text-ink-soft">
          {slugs[0] === 'clue-card-detective' || slugs[0] === 'spot-diff'
            ? '还没有同学开始找错，等他们点出第一处错误后这里会显示进度。'
            : '还没有同学提交作品，等他们开始生成后这里会出现预览。'}
        </p>
      )}
    </>
  );

  if (!wrapCard) {
    return (
      <>
        <div className="space-y-4 p-3">{inner}</div>
        <StudentWorksDetailModal
          open={!!detailStudent}
          onClose={() => setDetailStudent(null)}
          studentName={detailStudent?.displayName || ''}
          record={detailStudent ? recordsByStudent.get(detailStudent.id) ?? null : null}
          onPushShowcase={onPushShowcase}
          pushing={!!detailStudent && pushingStudentId === detailStudent.id}
        />
      </>
    );
  }

  return (
    <>
    <div className="kid-card-sky space-y-4">
      {inner}
    </div>
    <StudentWorksDetailModal
      open={!!detailStudent}
      onClose={() => setDetailStudent(null)}
      studentName={detailStudent?.displayName || ''}
      record={detailStudent ? recordsByStudent.get(detailStudent.id) ?? null : null}
      onPushShowcase={onPushShowcase}
      pushing={!!detailStudent && pushingStudentId === detailStudent.id}
    />
    </>
  );
}
