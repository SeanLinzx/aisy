'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  VIDEO_RECOGNITION_TEMPLATE_META,
  DEFAULT_COMPARE_VIDEO_TOP_TITLE,
  DEFAULT_COMPARE_VIDEO_BOTTOM_TITLE,
  DEFAULT_SINGLE_VIDEO_TITLE,
  countSubmittedForQuestion,
  correctOptionLabel,
  isAnswerCorrect,
  isAnswerSubmitted,
  normalizeVideoRecognitionSession,
  questionOptions,
  videoRecognitionScore,
  type VideoRecognitionQuestion,
  type VideoRecognitionSession,
  type VideoRecognitionStudentRecord,
  type VideoRecognitionTemplate,
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

function StudentDetail({
  record,
  questions,
  highlightQuestionId,
}: {
  record: VideoRecognitionStudentRecord;
  questions: VideoRecognitionQuestion[];
  highlightQuestionId?: string;
}) {
  const score = videoRecognitionScore(record.answers, questions);
  const highlight = highlightQuestionId ? questions.find((q) => q.id === highlightQuestionId) : null;
  const highlightAnswer = highlight ? record.answers[highlight.id] : undefined;

  return (
    <div className="rounded-xl border-2 border-orange-100 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-extrabold text-sm">{record.displayName}</span>
        <span className="flex items-center gap-2 text-[11px] font-bold">
          {highlight ? (
            <span className={isAnswerSubmitted(highlightAnswer) ? 'text-emerald-600' : 'text-amber-600'}>
              {isAnswerSubmitted(highlightAnswer) ? '✅ 本题已提交' : '✍️ 本题未提交'}
            </span>
          ) : (
            <span className="text-slate-500">—</span>
          )}
          {questions.length > 0 && (
            <span className="text-violet-600">{score.correct}/{score.total} 分</span>
          )}
        </span>
      </div>
      {highlight && isAnswerSubmitted(highlightAnswer) && (
        <div className="text-xs leading-relaxed rounded-lg bg-sky-50 px-2 py-1.5">
          <span className={isAnswerCorrect(highlight, highlightAnswer?.optionId) ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
            第{highlight.num}题 · {highlightAnswer?.optionLabel}
            {isAnswerCorrect(highlight, highlightAnswer?.optionId) ? ' ✅' : ' ❌'}
          </span>
        </div>
      )}
      <div className="space-y-1">
        {questions.map((q) => {
          const a = record.answers[q.id];
          if (!isAnswerSubmitted(a)) return null;
          const right = isAnswerCorrect(q, a.optionId);
          return (
            <div key={q.id} className="text-xs leading-relaxed">
              <span className="mr-1">{q.emoji || '•'}</span>
              <span className={right ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                第{q.num}题 · {a.optionLabel || a.optionId}
                {right ? ' ✅' : ' ❌'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PublishQuestionForm({ onPublished, busy, setBusy }: { onPublished: () => void; busy: boolean; setBusy: (v: boolean) => void }) {
  const [template, setTemplate] = useState<VideoRecognitionTemplate>('single');
  const [videoTitle, setVideoTitle] = useState(DEFAULT_SINGLE_VIDEO_TITLE);
  const [videoTopTitle, setVideoTopTitle] = useState(DEFAULT_COMPARE_VIDEO_TOP_TITLE);
  const [videoBottomTitle, setVideoBottomTitle] = useState(DEFAULT_COMPARE_VIDEO_BOTTOM_TITLE);
  const [videoHint, setVideoHint] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTopUrl, setVideoTopUrl] = useState('');
  const [videoBottomUrl, setVideoBottomUrl] = useState('');
  const [correctOptionId, setCorrectOptionId] = useState('yes');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCorrectOptionId(template === 'compare' ? 'top' : 'yes');
    if (template === 'compare') {
      setVideoTopTitle((prev) => prev.trim() || DEFAULT_COMPARE_VIDEO_TOP_TITLE);
      setVideoBottomTitle((prev) => prev.trim() || DEFAULT_COMPARE_VIDEO_BOTTOM_TITLE);
    } else {
      setVideoTitle((prev) => prev.trim() || DEFAULT_SINGLE_VIDEO_TITLE);
    }
  }, [template]);

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/course/video-recognition/questions', {
        template,
        videoTitle: template === 'single' ? videoTitle.trim() || DEFAULT_SINGLE_VIDEO_TITLE : undefined,
        videoTopTitle:
          template === 'compare' ? videoTopTitle.trim() || DEFAULT_COMPARE_VIDEO_TOP_TITLE : undefined,
        videoBottomTitle:
          template === 'compare' ? videoBottomTitle.trim() || DEFAULT_COMPARE_VIDEO_BOTTOM_TITLE : undefined,
        videoHint: videoHint.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        videoTopUrl: videoTopUrl.trim() || undefined,
        videoBottomUrl: videoBottomUrl.trim() || undefined,
        correctOptionId,
      });
      setVideoTitle(DEFAULT_SINGLE_VIDEO_TITLE);
      setVideoTopTitle(DEFAULT_COMPARE_VIDEO_TOP_TITLE);
      setVideoBottomTitle(DEFAULT_COMPARE_VIDEO_BOTTOM_TITLE);
      setVideoHint('');
      setVideoUrl('');
      setVideoTopUrl('');
      setVideoBottomUrl('');
      onPublished();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (e as Error)?.message || '发布失败');
    } finally {
      setBusy(false);
    }
  }

  const compareOptions = [
    { id: 'top', label: '⬆️ 上面是 AI' },
    { id: 'bottom', label: '⬇️ 下面是 AI' },
    { id: 'both', label: '↕️ 都是 AI' },
    { id: 'neither', label: '📹 都不是 AI' },
  ];
  const singleOptions = [
    { id: 'yes', label: '✅ 是 AI 生成' },
    { id: 'no', label: '❌ 不是 AI 生成' },
  ];

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-4 space-y-3">
      <div className="text-sm font-bold">📝 发布新题目</div>
      <div className="flex flex-wrap gap-2">
        {(['single', 'compare'] as VideoRecognitionTemplate[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTemplate(t)}
            className={`text-xs px-3 py-1.5 rounded-full font-bold border-2 transition ${
              template === t ? 'border-violet-500 bg-violet-500 text-white' : 'border-orange-100 bg-white text-ink-soft'
            }`}
          >
            {VIDEO_RECOGNITION_TEMPLATE_META[t].emoji} {VIDEO_RECOGNITION_TEMPLATE_META[t].label}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-soft">
        发布后小朋友<strong>只会看到当前这一题</strong>，提交后你可在下方查看结果，再发布下一题。
      </p>
      <div className="text-xs font-bold text-ink-soft">{VIDEO_RECOGNITION_TEMPLATE_META[template].defaultTitle}</div>

      {template === 'single' ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold">视频标题（大屏显示）</label>
            <input className="kid-input mt-1 !py-2 text-sm" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder={DEFAULT_SINGLE_VIDEO_TITLE} />
          </div>
          <div>
            <label className="text-xs font-bold">视频链接（可选）</label>
            <input className="kid-input mt-1 !py-2 text-sm" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="/uploads/... 或 https://..." />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold">⬆️ 上面视频标题</label>
              <input className="kid-input mt-1 !py-2 text-sm" value={videoTopTitle} onChange={(e) => setVideoTopTitle(e.target.value)} placeholder={DEFAULT_COMPARE_VIDEO_TOP_TITLE} />
            </div>
            <div>
              <label className="text-xs font-bold">⬆️ 上面视频链接（可选）</label>
              <input className="kid-input mt-1 !py-2 text-sm" value={videoTopUrl} onChange={(e) => setVideoTopUrl(e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold">⬇️ 下面视频标题</label>
              <input className="kid-input mt-1 !py-2 text-sm" value={videoBottomTitle} onChange={(e) => setVideoBottomTitle(e.target.value)} placeholder={DEFAULT_COMPARE_VIDEO_BOTTOM_TITLE} />
            </div>
            <div>
              <label className="text-xs font-bold">⬇️ 下面视频链接（可选）</label>
              <input className="kid-input mt-1 !py-2 text-sm" value={videoBottomUrl} onChange={(e) => setVideoBottomUrl(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold">💡 提示语（可选，大屏下方显示）</label>
        <input className="kid-input mt-1 !py-2 text-sm" value={videoHint} onChange={(e) => setVideoHint(e.target.value)} placeholder="例如：观察动作是否自然、细节是否发糊" />
      </div>

      <div>
        <label className="text-xs font-bold">✅ 正确答案</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {(template === 'compare' ? compareOptions : singleOptions).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setCorrectOptionId(opt.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-bold border-2 transition ${
                correctOptionId === opt.id ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-orange-100 bg-white text-ink-soft'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => void publish()} disabled={busy} className="kid-button-primary !py-2 !px-4 text-sm">
        {busy ? '发布中…' : '🚀 发布题目'}
      </button>
      {error && <div className="text-xs text-rose-600">{error}</div>}
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
  const [busy, setBusy] = useState(false);
  const session = normalizeVideoRecognitionSession(external ? externalSession ?? null : polled);

  async function reload() {
    try {
      const r = await api.get('/course/video-recognition');
      setPolled(normalizeVideoRecognitionSession(r.data || null));
    } catch {
      setPolled(null);
    }
  }

  useEffect(() => {
    if (external) return;
    reload();
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [external]);

  useEffect(() => {
    if (session?.currentQuestion) setTeacherQ(session.currentQuestion);
  }, [session?.currentQuestion]);

  const roster = useMemo(
    () => (rosterIds.length > 0 ? students.filter((s) => rosterIds.includes(s.id)) : students),
    [students, rosterIds],
  );

  const questions = session?.questions ?? [];
  const records = Object.values(session?.records || {});
  const currentQuestion = questions.find((q) => q.num === teacherQ) ?? questions[questions.length - 1] ?? null;
  const currentSubmittedCount = currentQuestion
    ? countSubmittedForQuestion(session?.records || {}, currentQuestion.id)
    : 0;
  const pendingCount = Math.max(0, roster.length - currentSubmittedCount);

  const optionStats = useMemo(() => {
    const stats = new Map<string, Map<string, number>>();
    for (const q of questions) stats.set(q.id, new Map());
    for (const rec of records) {
      for (const q of questions) {
        const ans = rec.answers[q.id];
        if (!isAnswerSubmitted(ans) || !ans.optionId) continue;
        const m = stats.get(q.id)!;
        m.set(ans.optionId, (m.get(ans.optionId) || 0) + 1);
      }
    }
    return stats;
  }, [records, questions]);

  const answeredByStudent = useMemo(() => {
    const map = new Map<string, VideoRecognitionStudentRecord>();
    for (const rec of records) map.set(rec.studentId, rec);
    return map;
  }, [records]);

  async function setCurrentQuestion(num: number) {
    setTeacherQ(num);
    try {
      await api.put('/course/video-recognition/current', { question: num });
      if (!external) await reload();
    } catch {
      /* ignore */
    }
  }

  async function removeQuestion(id: string) {
    setBusy(true);
    try {
      await api.delete(`/course/video-recognition/questions/${id}`);
      if (!external) await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kid-card-sky space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-bold">🎞️ AI 视频识别 · 老师看板</div>
          <div className="text-xs text-ink-soft mt-0.5">逐题发布、逐题作答：发布一题 → 查看提交 → 再发下一题</div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="tag">参与 {roster.length} 人</span>
          {currentQuestion && (
            <>
              <span className="tag bg-amber-50 text-amber-700 border-amber-200">本题未提交 {pendingCount}</span>
              <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">本题已提交 {currentSubmittedCount}</span>
            </>
          )}
        </div>
      </div>

      <PublishQuestionForm onPublished={reload} busy={busy} setBusy={setBusy} />

      {questions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-white/80 p-6 text-center text-sm text-ink-soft">
          还没有发布题目。请在上方选择模板并填写内容后点「发布题目」。
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold">📊 题目统计</div>
            <div className="flex flex-wrap gap-1">
              {questions.map((q) => (
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

          <div className="grid sm:grid-cols-2 gap-3">
            {questions.map((q) => {
              const m = optionStats.get(q.id)!;
              const total = Array.from(m.values()).reduce((s, n) => s + n, 0);
              const opts = questionOptions(q);
              const isCurrent = q.num === teacherQ;
              return (
                <div
                  key={q.id}
                  className={`rounded-xl bg-white border-2 p-3 space-y-2 ${
                    isCurrent ? 'border-sky-300 ring-2 ring-sky-100' : 'border-orange-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-bold leading-snug">
                      {q.emoji || '•'} 第 {q.num} 题 · {VIDEO_RECOGNITION_TEMPLATE_META[q.template].label}
                      {isCurrent && <span className="ml-1 text-sky-600">（当前）</span>}
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeQuestion(q.id)}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 shrink-0"
                    >
                      删除
                    </button>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold">正确答案：{correctOptionLabel(q)}</div>
                  {opts.map((opt) => (
                    <OptionBar
                      key={opt.id}
                      label={opt.label}
                      count={m.get(opt.id) || 0}
                      total={total}
                      highlight={opt.id === q.correctOptionId}
                    />
                  ))}
                  {total === 0 && <p className="text-[11px] text-ink-soft">还没有人提交。</p>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div>
        <div className="text-sm font-bold mb-2">👧 每位小朋友的答案（当前题）</div>
        {roster.length === 0 ? (
          <p className="text-sm text-ink-soft">暂无学生名单。</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {roster.map((s) => {
              const rec = answeredByStudent.get(s.id);
              if (!rec) {
                return (
                  <div key={s.id} className="rounded-xl border-2 border-dashed border-orange-100 bg-white/80 p-3 text-sm">
                    <div className="font-extrabold">{s.displayName}</div>
                    <div className="text-xs text-amber-600 font-bold mt-1">✍️ 本题未提交</div>
                  </div>
                );
              }
              return (
                <StudentDetail
                  key={s.id}
                  record={rec}
                  questions={questions}
                  highlightQuestionId={currentQuestion?.id}
                />
              );
            })}
            {records
              .filter((r) => !roster.some((s) => s.id === r.studentId))
              .map((r) => (
                <StudentDetail key={r.studentId} record={r} questions={questions} highlightQuestionId={currentQuestion?.id} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
