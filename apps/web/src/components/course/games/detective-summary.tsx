'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { reportGrowth } from '@/lib/growth-report';
import { useLanguage } from '@/contexts/language-context';
import {
  getSummaryQuestions,
  summaryQuizScore,
  type SummaryAnswerRecord,
  type SummaryQuestion,
} from '@/lib/detective-summary';

type Answers = Record<string, SummaryAnswerRecord>;

function QuestionCard({
  question,
  answer,
  submitted,
  onPick,
  onText,
}: {
  question: SummaryQuestion;
  answer: SummaryAnswerRecord | undefined;
  submitted: boolean;
  onPick: (optionId: string, optionLabel: string) => void;
  onText: (text: string) => void;
}) {
  const isQuiz = question.kind === 'quiz';
  const cardClass =
    question.kind === 'debate' ? 'kid-card-purple' : question.kind === 'share' ? 'kid-card-mint' : 'kid-card';

  return (
    <div className={`${cardClass} space-y-3`}>
      <div>
        <div className="font-extrabold leading-snug">
          <span className="text-xl mr-1.5">{question.emoji}</span>
          {question.title}
        </div>
        {question.desc && <p className="text-xs text-ink-soft mt-1">{question.desc}</p>}
      </div>

      <div className={`grid gap-2 ${question.options.length > 2 ? 'sm:grid-cols-2' : ''}`}>
        {question.options.map((opt) => {
          const selected = answer?.optionId === opt.id;
          const showResult = submitted && isQuiz;
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
              className={`text-left rounded-xl border-2 px-3 py-2.5 text-sm leading-snug transition active:scale-[0.99] ${cls}`}
            >
              {selected && <span className="mr-1.5">✓</span>}
              {opt.label}
              {showResult && selected && (isCorrect ? ' ✅' : ' ❌')}
            </button>
          );
        })}
      </div>

      {question.withText && (
        <div>
          <label className="text-xs font-bold">{question.textLabel}</label>
          <textarea
            className="kid-textarea !min-h-[72px] text-sm"
            value={answer?.text || ''}
            onChange={(e) => onText(e.target.value)}
            placeholder={question.textPlaceholder}
          />
        </div>
      )}
    </div>
  );
}

export function DetectiveSummaryGame() {
  const { tx, locale } = useLanguage();
  const summaryQuestions = useMemo(() => getSummaryQuestions(locale), [locale]);
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
      text: a.text,
    }));
    if (payload.length === 0) return;
    try {
      await api.post('/course/summary/report', { answers: payload, done });
    } catch {
      /* 上报失败不打断答题 */
    }
  }, []);

  // 答题过程实时同步给老师（防抖 2 秒）
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void report(submitted), 2000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answers, submitted, report]);

  function setAnswer(questionId: string, patch: Partial<SummaryAnswerRecord>) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
  }

  async function submit() {
    const missingChoice = summaryQuestions.filter((q) => !answers[q.id]?.optionId);
    if (missingChoice.length > 0) {
      setError(`${tx('还有')} ${missingChoice.length} ${tx(' 题没选答案：')}${missingChoice.map((q) => q.emoji).join(' ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await report(true);
      setSubmitted(true);
      const score = summaryQuizScore(answers);
      const shareQ = summaryQuestions.find((q) => q.kind === 'share');
      const debateQ = summaryQuestions.find((q) => q.kind === 'debate');
      const shareAnswer = shareQ ? answers[shareQ.id] : undefined;
      const debateAnswer = debateQ ? answers[debateQ.id] : undefined;
      reportGrowth({
        kind: 'share',
        gameSlug: 'detective-summary',
        title: tx('🕵️ 大侦探总结分享'),
        summary: [
          `${tx('知识题答对')} ${score.correct}/${score.total} ${tx('题')}`,
          debateAnswer?.optionLabel ? `${tx('思辨观点：')}${debateAnswer.optionLabel}` : null,
          debateAnswer?.text ? `${tx('理由：')}${debateAnswer.text}` : null,
          shareAnswer?.optionLabel ? `${tx('分享主题：')}${shareAnswer.optionLabel}` : null,
          shareAnswer?.text ? `${tx('分享内容：')}${shareAnswer.text}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        detail: summaryQuestions.map((q) => ({
          question: q.title,
          answer: answers[q.id]?.optionLabel,
          text: answers[q.id]?.text,
        })),
      });
    } catch {
      setError(tx('提交失败，请再试一次'));
    } finally {
      setSaving(false);
    }
  }

  const score = summaryQuizScore(answers);
  const answeredCount = summaryQuestions.filter((q) => answers[q.id]?.optionId).length;

  return (
    <div className="space-y-4">
      <div className="kid-card-orange">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          {tx('🕵️ 各位 AI 侦探，经历了这段奇妙的旅程，我们即将结束！先回答几个「智者任务」小问题，再讲讲你的改变、感受、作品和展望。')}
          <b>{tx('你的答案老师都能看到哦！')}</b>{tx('请牢记最初的科技本心。')}
        </p>
      </div>

      <div className="text-xs font-bold text-ink-soft">
        {tx('进度：')}{answeredCount}/{summaryQuestions.length}{tx(' 题')}
      </div>

      {summaryQuestions.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          answer={answers[q.id]}
          submitted={submitted}
          onPick={(optionId, optionLabel) => setAnswer(q.id, { optionId, optionLabel })}
          onText={(text) => setAnswer(q.id, { text })}
        />
      ))}

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
      )}

      {!submitted ? (
        <button onClick={() => void submit()} disabled={saving} className="kid-button-primary w-full">
          {saving ? tx('提交中…') : tx('🚀 提交我的总结分享')}
        </button>
      ) : (
        <div className="kid-card-mint space-y-2">
          <div className="font-extrabold text-emerald-800">
            {tx('🎉 提交成功！知识题答对')} {score.correct}/{score.total} {tx('题')}
          </div>
          <p className="text-sm text-ink-soft leading-relaxed">
            {tx('「真正的造物，从来不是赚钱的工具，而是造福众生的温度。」')}<br />
            {tx('保持你的好奇心，继续探索吧！—— 致每一位心怀热爱、敢于创造的未来发明家 🌟')}
          </p>
          <p className="text-xs text-ink-soft">{tx('还可以继续修改上面的答案，修改会自动同步给老师。')}</p>
        </div>
      )}
    </div>
  );
}
