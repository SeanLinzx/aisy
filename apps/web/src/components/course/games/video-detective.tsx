'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { reportGrowth } from '@/lib/growth-report';
import {
  VIDEO_RECOGNITION_QUESTIONS,
  videoRecognitionScore,
  type VideoRecognitionAnswerRecord,
  type VideoRecognitionQuestion,
} from '@/lib/video-recognition';

type Answers = Record<string, VideoRecognitionAnswerRecord>;

function QuestionCard({
  question,
  answer,
  submitted,
  onPick,
}: {
  question: VideoRecognitionQuestion;
  answer: VideoRecognitionAnswerRecord | undefined;
  submitted: boolean;
  onPick: (optionId: string, optionLabel: string) => void;
}) {
  return (
    <div className="kid-card space-y-3">
      <div className="font-extrabold leading-snug">
        <span className="text-xl mr-1.5">{question.emoji}</span>
        {question.title}
      </div>
      <p className="text-xs text-ink-soft">👀 请看大屏幕上的视频，在下面选出你的答案：</p>
      <div className={`grid gap-2 ${question.options.length > 2 ? 'sm:grid-cols-2' : ''}`}>
        {question.options.map((opt) => {
          const selected = answer?.optionId === opt.id;
          const showResult = submitted;
          const isCorrect = !!opt.correct;
          let cls = 'border-orange-100 bg-white text-ink-soft hover:border-orange-200';
          if (selected) cls = 'border-brand bg-orange-50 ring-2 ring-orange-200 font-bold text-ink';
          if (showResult && selected && isCorrect) cls = 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200 font-bold text-emerald-800';
          if (showResult && selected && !isCorrect) cls = 'border-rose-300 bg-rose-50 ring-2 ring-rose-200 font-bold text-rose-700';
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onPick(opt.id, opt.label)}
              disabled={submitted}
              className={`text-left rounded-xl border-2 px-3 py-2.5 text-sm leading-snug transition active:scale-[0.99] disabled:opacity-70 ${cls}`}
            >
              {selected && <span className="mr-1.5">✓</span>}
              {opt.label}
              {showResult && selected && (isCorrect ? ' ✅' : ' ❌')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VideoDetectiveGame() {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answersRef = useRef<Answers>({});
  answersRef.current = answers;

  const report = useCallback(async (done: boolean) => {
    const payload = Object.entries(answersRef.current).map(([questionId, a]) => ({
      questionId,
      optionId: a.optionId,
      optionLabel: a.optionLabel,
    }));
    if (payload.length === 0) return;
    try {
      await api.post('/course/video-recognition/report', { answers: payload, done });
    } catch {
      /* 上报失败不打断答题 */
    }
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void report(submitted), 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answers, submitted, report]);

  function setAnswer(questionId: string, patch: Partial<VideoRecognitionAnswerRecord>) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
  }

  async function submit() {
    const missing = VIDEO_RECOGNITION_QUESTIONS.filter((q) => !answers[q.id]?.optionId);
    if (missing.length > 0) {
      setError(`还有 ${missing.length} 题没选答案：${missing.map((q) => q.emoji).join(' ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await report(true);
      setSubmitted(true);
      const score = videoRecognitionScore(answers);
      reportGrowth({
        kind: 'game',
        gameSlug: 'video-detective',
        title: 'AI 视频识别',
        summary: `答对 ${score.correct}/${score.total} 题`,
        detail: VIDEO_RECOGNITION_QUESTIONS.map((q) => ({
          question: q.title,
          answer: answers[q.id]?.optionLabel,
        })),
      });
    } catch {
      setError('提交失败，请再试一次');
    } finally {
      setSaving(false);
    }
  }

  const score = videoRecognitionScore(answers);
  const answeredCount = VIDEO_RECOGNITION_QUESTIONS.filter((q) => answers[q.id]?.optionId).length;

  return (
    <div className="space-y-4">
      <div className="kid-card-sky">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🎞️ <strong>AI 视频识别</strong>：老师会在大屏幕上播放视频，你只需要在电脑上选答案。
          每选一题都会同步给老师，共 <strong>{VIDEO_RECOGNITION_QUESTIONS.length} 道题</strong>。
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
          <span className="tag">已答 {answeredCount}/{VIDEO_RECOGNITION_QUESTIONS.length}</span>
          {submitted && (
            <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">
              得分 {score.correct}/{score.total}
            </span>
          )}
        </div>
      </div>

      {VIDEO_RECOGNITION_QUESTIONS.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          answer={answers[q.id]}
          submitted={submitted}
          onPick={(optionId, optionLabel) => setAnswer(q.id, { optionId, optionLabel })}
        />
      ))}

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
      )}

      {!submitted ? (
        <button onClick={() => void submit()} disabled={saving} className="kid-button-primary disabled:opacity-50">
          {saving ? '提交中…' : '✅ 提交全部答案'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className={`kid-card ${score.correct === score.total ? 'kid-card-mint' : 'kid-card-yellow'}`}>
            <div className="font-extrabold text-lg">
              {score.correct === score.total
                ? '🎉 全部答对！你是 AI 视频识别小专家！'
                : `答对了 ${score.correct}/${score.total} 题，继续加油！`}
            </div>
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
              setError(null);
            }}
            className="kid-button-ghost"
          >
            🔄 再答一次
          </button>
        </div>
      )}
    </div>
  );
}
