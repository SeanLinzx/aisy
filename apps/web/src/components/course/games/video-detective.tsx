'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, apiAuth } from '@/lib/api';
import { useCourseStreamChannel } from '@/contexts/course-stream-context';
import { reportGrowth } from '@/lib/growth-report';
import { useLanguage } from '@/contexts/language-context';
import {
  compareVideoTopTitle,
  compareVideoBottomTitle,
  isAnswerCorrect,
  isAnswerSubmitted,
  normalizeVideoRecognitionSession,
  questionDisplayTitle,
  questionOptions,
  singleVideoTitle,
  videoRecognitionScore,
  type VideoRecognitionAnswerRecord,
  type VideoRecognitionQuestion,
  type VideoRecognitionSession,
} from '@/lib/video-recognition';

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
  const { tx } = useLanguage();
  const options = questionOptions(question);
  const title = questionDisplayTitle(question);
  const pickedId = answer?.optionId;

  return (
    <div className="kid-card space-y-3">
      <div className="font-extrabold leading-snug">
        <span className="text-xl mr-1.5">{question.emoji || '🎬'}</span>
        {tx('第题')} {question.num} {tx(' 题：')}{title}
      </div>
      {question.template === 'compare' && (
        <p className="text-xs text-violet-700 font-semibold">
          ⬆️ {compareVideoTopTitle(question)} · ⬇️ {compareVideoBottomTitle(question)}
        </p>
      )}
      {question.template === 'single' && (
        <p className="text-xs text-ink-soft">{tx('🎞️ 大屏正在播放：')}{singleVideoTitle(question)}</p>
      )}
      <p className="text-xs text-ink-soft">{tx('请看大屏幕上的视频，在下面选出你的答案：')}</p>
      <div className={`grid gap-2 ${options.length > 2 ? 'sm:grid-cols-2' : ''}`}>
        {options.map((opt) => {
          const selected = pickedId === opt.id;
          const showResult = submitted;
          const correct = isAnswerCorrect(question, opt.id);
          let cls = 'border-orange-100 bg-white text-ink-soft hover:border-orange-200';
          if (selected) cls = 'border-brand bg-orange-50 ring-2 ring-orange-200 font-bold text-ink';
          if (showResult && selected && correct) cls = 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200 font-bold text-emerald-800';
          if (showResult && selected && !correct) cls = 'border-rose-300 bg-rose-50 ring-2 ring-rose-200 font-bold text-rose-700';
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
              {showResult && selected && (correct ? ' ✅' : ' ❌')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VideoDetectiveGame() {
  const { tx } = useLanguage();
  const { data: streamSession } = useCourseStreamChannel<VideoRecognitionSession>(
    'videoRecognition',
    '/course/video-recognition',
  );
  const [localOverride, setLocalOverride] = useState<VideoRecognitionSession | null>(null);
  const rawSession = localOverride ?? streamSession;
  useEffect(() => {
    setLocalOverride(null);
  }, [streamSession]);
  const session = useMemo(() => normalizeVideoRecognitionSession(rawSession), [rawSession]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VideoRecognitionAnswerRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiAuth.me().then((u) => setStudentId(u.id)).catch(() => {});
  }, []);

  const questions = session?.questions ?? [];
  const currentNum = session?.currentQuestion ?? 0;
  const currentQuestion = useMemo(
    () => questions.find((q) => q.num === currentNum) ?? null,
    [questions, currentNum],
  );

  const myRecord = studentId && session?.records ? session.records[studentId] : undefined;
  const serverAnswer = currentQuestion ? myRecord?.answers[currentQuestion.id] : undefined;
  const submitted = isAnswerSubmitted(serverAnswer);
  const displayAnswer = submitted ? serverAnswer : draft ?? serverAnswer;

  useEffect(() => {
    if (!currentQuestion) {
      setDraft(null);
      return;
    }
    const saved = myRecord?.answers[currentQuestion.id];
    if (isAnswerSubmitted(saved)) {
      setDraft(null);
    } else if (saved?.optionId) {
      setDraft(saved);
    } else {
      setDraft(null);
    }
  }, [currentQuestion?.id, myRecord?.answers]);

  const allSubmittedAnswers = useMemo(() => {
    const map: Record<string, VideoRecognitionAnswerRecord> = {};
    for (const q of questions) {
      const a = myRecord?.answers[q.id];
      if (isAnswerSubmitted(a)) map[q.id] = a!;
    }
    return map;
  }, [questions, myRecord?.answers]);

  const totalScore = videoRecognitionScore(allSubmittedAnswers, questions);

  async function submitCurrent() {
    if (!currentQuestion || !draft?.optionId) {
      setError(tx('请先选择一个答案'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await api.post('/course/video-recognition/report', {
        answers: [
          {
            questionId: currentQuestion.id,
            optionId: draft.optionId,
            optionLabel: draft.optionLabel,
          },
        ],
        submitQuestionId: currentQuestion.id,
      });
      setLocalOverride(r.data || null);
      if (isAnswerCorrect(currentQuestion, draft.optionId)) {
        reportGrowth({
          kind: 'game',
          gameSlug: 'video-detective',
          title: tx('AI 视频识别'),
          summary: `${tx('第题')} ${currentQuestion.num} ${tx(' 题答对')}`,
          detail: [{ question: questionDisplayTitle(currentQuestion), answer: draft.optionLabel }],
        });
      }
    } catch {
      setError(tx('提交失败，请再试一次'));
    } finally {
      setSaving(false);
    }
  }

  const onPick = useCallback((optionId: string, optionLabel: string) => {
    if (submitted) return;
    setDraft({ optionId, optionLabel });
    setError(null);
  }, [submitted]);

  return (
    <div className="space-y-4">
      <div className="kid-card-sky">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🎞️ <strong>{tx('AI 视频识别')}</strong>
          {tx('：老师每发布一题，你只需作答')}
          <strong>{tx('当前这一题')}</strong>
          {tx('。选完答案点「提交本题」，老师会看到全班结果后再出下一题。')}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
          <span className="tag">{tx('已发布')} {questions.length} {tx(' 题')}</span>
          {questions.length > 0 && currentQuestion && (
            <span className="tag bg-violet-50 text-violet-700 border-violet-200">
              {tx('当前第')} {currentQuestion.num} {tx(' 题')}
            </span>
          )}
          {totalScore.total > 0 && (
            <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">
              {tx('已完成')} {totalScore.total} {tx(' 题')}{tx(' · 答对')} {totalScore.correct}
            </span>
          )}
        </div>
      </div>

      {questions.length === 0 || !currentQuestion ? (
        <div className="kid-card text-sm text-ink-soft text-center py-8">
          {tx('等待老师发布题目… 老师在大屏播放视频后，这里会出现当前题的选项。')}
        </div>
      ) : submitted ? (
        <div className="space-y-3">
          <QuestionCard
            question={currentQuestion}
            answer={serverAnswer}
            submitted
            onPick={onPick}
          />
          <div className={`kid-card ${isAnswerCorrect(currentQuestion, serverAnswer?.optionId) ? 'kid-card-mint' : 'kid-card-yellow'}`}>
            <div className="font-extrabold">
              {isAnswerCorrect(currentQuestion, serverAnswer?.optionId)
                ? tx('🎉 本题答对了！')
                : tx('📝 本题已提交，等待老师公布或进入下一题')}
            </div>
            <p className="text-xs text-ink-soft mt-1">{tx('你的选择：')}{serverAnswer?.optionLabel}</p>
          </div>
          <div className="kid-card text-sm text-ink-soft text-center py-4">
            {tx('✅ 已提交第')} {currentQuestion.num} {tx(' 题，请等待老师发布下一题…')}
          </div>
        </div>
      ) : (
        <>
          <QuestionCard
            question={currentQuestion}
            answer={displayAnswer ?? undefined}
            submitted={false}
            onPick={onPick}
          />
          <button
            onClick={() => void submitCurrent()}
            disabled={saving || !draft?.optionId}
            className="kid-button-primary disabled:opacity-50"
          >
            {saving ? tx('提交中…') : tx('✅ 提交本题答案')}
          </button>
        </>
      )}

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
      )}
    </div>
  );
}
