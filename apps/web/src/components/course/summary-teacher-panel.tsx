'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  SUMMARY_QUESTIONS,
  summaryQuizScore,
  type SummarySession,
  type SummaryStudentRecord,
} from '@/lib/detective-summary';
import { showcaseFromSummary } from '@/lib/classroom-showcase';

function OptionBar({ label, count, total, highlight }: { label: string; count: number; total: number; highlight?: boolean }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`truncate ${highlight ? 'font-bold text-emerald-700' : 'text-ink-soft'}`}>{label}</span>
        <span className="font-bold shrink-0">{count} 人 · {pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${highlight ? 'bg-emerald-400' : 'bg-sky-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StudentDetail({
  record,
  onPushShowcase,
  onEndShowcase,
  pushing,
  isShowcasing,
}: {
  record: SummaryStudentRecord;
  onPushShowcase?: (record: SummaryStudentRecord) => void;
  onEndShowcase?: () => void;
  pushing?: boolean;
  isShowcasing?: boolean;
}) {
  const score = summaryQuizScore(record.answers);
  return (
    <div className="rounded-xl border-2 border-orange-100 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-extrabold text-sm">{record.displayName}</span>
        <span className="flex items-center gap-2 text-[11px] font-bold">
          <span className={record.done ? 'text-emerald-600' : 'text-amber-600'}>
            {record.done ? '✅ 已提交' : '✍️ 作答中'}
          </span>
          <span className="text-violet-600">知识题 {score.correct}/{score.total}</span>
        </span>
      </div>
      <div className="space-y-1.5">
        {SUMMARY_QUESTIONS.map((q) => {
          const a = record.answers[q.id];
          if (!a?.optionId && !a?.text) return null;
          const opt = q.options.find((o) => o.id === a.optionId);
          const correctMark = q.kind === 'quiz' && opt ? (opt.correct ? ' ✅' : ' ❌') : '';
          return (
            <div key={q.id} className="text-xs leading-relaxed">
              <span className="mr-1">{q.emoji}</span>
              {opt && (
                <span className={q.kind === 'quiz' ? (opt.correct ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold') : 'font-bold text-ink'}>
                  {opt.label}
                  {correctMark}
                </span>
              )}
              {a.text && (
                <span className="block text-ink-soft border-l-2 border-violet-200 pl-2 mt-0.5">
                  {a.text}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {onPushShowcase && showcaseFromSummary(record) && (
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
            {pushing ? '推送中…' : '🌟 推送给全班分享'}
          </button>
        )
      )}
    </div>
  );
}

export function SummaryTeacherPanel({
  students,
  rosterIds,
  session: externalSession,
  onPushShowcase,
  onEndShowcase,
  pushingStudentId,
  activeShowcaseStudentId,
}: {
  students: Array<{ id: string; displayName: string; username: string }>;
  /** 课堂参与学生 id；空 = 全班 */
  rosterIds: string[];
  /** 由中控台聚合轮询注入；提供后本组件不再自行轮询 */
  session?: SummarySession | null;
  onPushShowcase?: (record: SummaryStudentRecord) => void;
  onEndShowcase?: () => void;
  pushingStudentId?: string | null;
  activeShowcaseStudentId?: string | null;
}) {
  const external = externalSession !== undefined;
  const [polled, setPolled] = useState<SummarySession | null>(null);
  const session = external ? externalSession : polled;

  useEffect(() => {
    if (external) return;
    let alive = true;
    async function load() {
      try {
        const r = await api.get('/course/summary');
        if (alive) setPolled(r.data || null);
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
  }, [external]);

  const roster = useMemo(
    () => (rosterIds.length > 0 ? students.filter((s) => rosterIds.includes(s.id)) : students),
    [students, rosterIds],
  );

  const records = Object.values(session?.records || {});
  const doneCount = records.filter((r) => r.done).length;

  const optionStats = useMemo(() => {
    const stats = new Map<string, Map<string, number>>();
    for (const q of SUMMARY_QUESTIONS) stats.set(q.id, new Map());
    for (const rec of records) {
      for (const q of SUMMARY_QUESTIONS) {
        const picked = rec.answers[q.id]?.optionId;
        if (!picked) continue;
        const m = stats.get(q.id)!;
        m.set(picked, (m.get(picked) || 0) + 1);
      }
    }
    return stats;
  }, [records]);

  const answeredByStudent = useMemo(() => {
    const map = new Map<string, SummaryStudentRecord>();
    for (const rec of records) map.set(rec.studentId, rec);
    return map;
  }, [records]);

  return (
    <div className="kid-card-orange space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-bold">🕵️ 大侦探总结分享 · 答题看板</div>
          <div className="text-xs text-ink-soft mt-0.5">学生每答一题会自动同步到这里（约 3 秒刷新）</div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="tag">参与 {roster.length} 人</span>
          <span className="tag bg-amber-50 text-amber-700 border-amber-200">作答中 {records.length - doneCount}</span>
          <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">已提交 {doneCount}</span>
        </div>
      </div>

      {/* 分题统计 */}
      <div className="grid sm:grid-cols-2 gap-3">
        {SUMMARY_QUESTIONS.map((q) => {
          const m = optionStats.get(q.id)!;
          const total = Array.from(m.values()).reduce((s, n) => s + n, 0);
          return (
            <div key={q.id} className="rounded-xl bg-white border-2 border-orange-100 p-3 space-y-2">
              <div className="text-xs font-bold leading-snug">
                {q.emoji} {q.title}
              </div>
              {q.options.map((opt) => (
                <OptionBar
                  key={opt.id}
                  label={opt.label}
                  count={m.get(opt.id) || 0}
                  total={total}
                  highlight={q.kind === 'quiz' && !!opt.correct}
                />
              ))}
              {total === 0 && <p className="text-[11px] text-ink-soft">还没有人回答这题。</p>}
            </div>
          );
        })}
      </div>

      {/* 每位学生的答题过程 */}
      <div>
        <div className="text-sm font-bold mb-2">👧 每位小朋友的回答</div>
        {records.length === 0 ? (
          <p className="text-sm text-ink-soft">还没有同学开始作答，推送游戏后这里会实时出现答案。</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            {roster
              .filter((s) => answeredByStudent.has(s.id))
              .map((s) => (
                <StudentDetail
                  key={s.id}
                  record={answeredByStudent.get(s.id)!}
                  onPushShowcase={onPushShowcase}
                  onEndShowcase={onEndShowcase}
                  pushing={pushingStudentId === s.id}
                  isShowcasing={activeShowcaseStudentId === s.id}
                />
              ))}
            {/* 不在名单里但有作答的学生（如全班模式外的账号） */}
            {records
              .filter((r) => !roster.some((s) => s.id === r.studentId))
              .map((r) => (
                <StudentDetail
                  key={r.studentId}
                  record={r}
                  onPushShowcase={onPushShowcase}
                  onEndShowcase={onEndShowcase}
                  pushing={pushingStudentId === r.studentId}
                  isShowcasing={activeShowcaseStudentId === r.studentId}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
