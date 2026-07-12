'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  VIDEO_RECOGNITION_QUESTIONS,
  videoRecognitionScore,
  type VideoRecognitionSession,
  type VideoRecognitionStudentRecord,
} from '@/lib/video-recognition';

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

function StudentDetail({ record }: { record: VideoRecognitionStudentRecord }) {
  const score = videoRecognitionScore(record.answers);
  return (
    <div className="rounded-xl border-2 border-orange-100 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-extrabold text-sm">{record.displayName}</span>
        <span className="flex items-center gap-2 text-[11px] font-bold">
          <span className={record.done ? 'text-emerald-600' : 'text-amber-600'}>
            {record.done ? '✅ 已提交' : '✍️ 作答中'}
          </span>
          <span className="text-violet-600">{score.correct}/{score.total} 分</span>
        </span>
      </div>
      <div className="space-y-1">
        {VIDEO_RECOGNITION_QUESTIONS.map((q) => {
          const a = record.answers[q.id];
          if (!a?.optionId) return null;
          const opt = q.options.find((o) => o.id === a.optionId);
          const correctMark = opt ? (opt.correct ? ' ✅' : ' ❌') : '';
          return (
            <div key={q.id} className="text-xs leading-relaxed">
              <span className="mr-1">{q.emoji}</span>
              <span className={opt?.correct ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                {a.optionLabel || opt?.label}
                {correctMark}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VideoRecognitionTeacherPanel({
  students,
  rosterIds,
  session: externalSession,
}: {
  students: Array<{ id: string; displayName: string; username: string }>;
  rosterIds: string[];
  session?: VideoRecognitionSession | null;
}) {
  const external = externalSession !== undefined;
  const [polled, setPolled] = useState<VideoRecognitionSession | null>(null);
  const [teacherQ, setTeacherQ] = useState(1);
  const session = external ? externalSession : polled;

  useEffect(() => {
    if (external) return;
    let alive = true;
    async function load() {
      try {
        const r = await api.get('/course/video-recognition');
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

  useEffect(() => {
    if (session?.currentQuestion) setTeacherQ(session.currentQuestion);
  }, [session?.currentQuestion]);

  const roster = useMemo(
    () => (rosterIds.length > 0 ? students.filter((s) => rosterIds.includes(s.id)) : students),
    [students, rosterIds],
  );

  const records = Object.values(session?.records || {});
  const doneCount = records.filter((r) => r.done).length;
  const currentQuestion = VIDEO_RECOGNITION_QUESTIONS.find((q) => q.num === teacherQ) || VIDEO_RECOGNITION_QUESTIONS[0];

  const optionStats = useMemo(() => {
    const stats = new Map<string, Map<string, number>>();
    for (const q of VIDEO_RECOGNITION_QUESTIONS) stats.set(q.id, new Map());
    for (const rec of records) {
      for (const q of VIDEO_RECOGNITION_QUESTIONS) {
        const picked = rec.answers[q.id]?.optionId;
        if (!picked) continue;
        const m = stats.get(q.id)!;
        m.set(picked, (m.get(picked) || 0) + 1);
      }
    }
    return stats;
  }, [records]);

  const answeredByStudent = useMemo(() => {
    const map = new Map<string, VideoRecognitionStudentRecord>();
    for (const rec of records) map.set(rec.studentId, rec);
    return map;
  }, [records]);

  async function setCurrentQuestion(num: number) {
    setTeacherQ(num);
    try {
      await api.put('/course/video-recognition/current', { question: num });
    } catch {
      /* ignore */
    }
  }

  const currentStats = optionStats.get(currentQuestion.id)!;
  const currentTotal = Array.from(currentStats.values()).reduce((s, n) => s + n, 0);

  return (
    <div className="kid-card-sky space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-bold">🎞️ AI 视频识别 · 老师看板</div>
          <div className="text-xs text-ink-soft mt-0.5">在大屏播放下方视频，学生只在电脑上作答；选项实时同步</div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="tag">参与 {roster.length} 人</span>
          <span className="tag bg-amber-50 text-amber-700 border-amber-200">作答中 {records.length - doneCount}</span>
          <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">已提交 {doneCount}</span>
        </div>
      </div>

      {/* 老师大屏播放区 */}
      <div className="rounded-2xl border-2 border-sky-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold">📺 大屏播放 · 第 {currentQuestion.num} 题</div>
          <div className="flex flex-wrap gap-1">
            {VIDEO_RECOGNITION_QUESTIONS.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => void setCurrentQuestion(q.num)}
                className={`w-8 h-8 rounded-lg text-xs font-bold border-2 transition ${
                  q.num === teacherQ
                    ? 'border-sky-500 bg-sky-500 text-white'
                    : 'border-orange-100 bg-white text-ink-soft hover:border-sky-200'
                }`}
              >
                {q.num}
              </button>
            ))}
          </div>
        </div>
        <div className={`aspect-video rounded-2xl bg-gradient-to-br ${currentQuestion.bg} flex flex-col items-center justify-center relative`}>
          <span className="text-6xl mb-2">{currentQuestion.emoji}</span>
          <div className="text-lg font-extrabold text-ink">{currentQuestion.videoTitle}</div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-16 h-16 rounded-full bg-black/35 text-white flex items-center justify-center text-2xl">▶</span>
          </div>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">💡 {currentQuestion.videoHint}</p>
        <div className="text-sm font-bold">{currentQuestion.title}</div>
        <div className="space-y-2">
          {currentQuestion.options.map((opt) => (
            <OptionBar
              key={opt.id}
              label={opt.label}
              count={currentStats.get(opt.id) || 0}
              total={currentTotal}
              highlight={!!opt.correct}
            />
          ))}
          {currentTotal === 0 && <p className="text-[11px] text-ink-soft">还没有同学回答这题。</p>}
        </div>
      </div>

      {/* 分题统计 */}
      <div className="grid sm:grid-cols-2 gap-3">
        {VIDEO_RECOGNITION_QUESTIONS.map((q) => {
          const m = optionStats.get(q.id)!;
          const total = Array.from(m.values()).reduce((s, n) => s + n, 0);
          return (
            <div key={q.id} className="rounded-xl bg-white border-2 border-orange-100 p-3 space-y-2">
              <div className="text-xs font-bold leading-snug">
                {q.emoji} 第 {q.num} 题 · {q.videoTitle}
              </div>
              {q.options.map((opt) => (
                <OptionBar
                  key={opt.id}
                  label={opt.label}
                  count={m.get(opt.id) || 0}
                  total={total}
                  highlight={!!opt.correct}
                />
              ))}
              {total === 0 && <p className="text-[11px] text-ink-soft">还没有人回答。</p>}
            </div>
          );
        })}
      </div>

      {/* 每位学生 */}
      <div>
        <div className="text-sm font-bold mb-2">👧 每位小朋友的答案</div>
        {records.length === 0 ? (
          <p className="text-sm text-ink-soft">还没有同学开始作答，推送游戏后这里会实时出现答案。</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {roster
              .filter((s) => answeredByStudent.has(s.id))
              .map((s) => (
                <StudentDetail key={s.id} record={answeredByStudent.get(s.id)!} />
              ))}
            {records
              .filter((r) => !roster.some((s) => s.id === r.studentId))
              .map((r) => (
                <StudentDetail key={r.studentId} record={r} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
