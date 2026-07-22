'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useCourseStreamChannel } from '@/contexts/course-stream-context';
import { AiWarning } from '@/components/ai-warning';
import { reportGrowth } from '@/lib/growth-report';
import { useLanguage } from '@/contexts/language-context';

interface Answer {
  id: string;
  text: string;
  isAI: boolean;
}
interface Session {
  id: string;
  question: string;
  answers: Answer[];
  createdAt: number;
}

export function TuringTestGame() {
  const { tx } = useLanguage();
  const { data: session, loaded } = useCourseStreamChannel<Session>('turing', '/course/turing');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // 老师发布了新的一局 → 重置作答
  useEffect(() => {
    if (session?.id !== sessionId) {
      setSessionId(session?.id ?? null);
      setPicked({});
      setSubmitted(false);
    }
  }, [session?.id, sessionId]);

  if (!loaded) {
    return <div className="kid-card text-sm text-ink-soft">{tx('加载中…')}</div>;
  }

  if (!session) {
    return (
      <div className="kid-card-orange text-center py-10">
        <div className="text-5xl mb-3">⏳</div>
        <div className="font-extrabold text-lg">{tx('老师还没发布题目')}</div>
        <p className="text-sm text-ink-soft mt-1">{tx('请等老师在前面出好题，这里就会出现问题和大家的回答啦！（会自动刷新）')}</p>
      </div>
    );
  }

  const correctCount = session.answers.filter((a) => !!picked[a.id] === a.isAI).length;

  return (
    <div className="space-y-4">
      <div className="kid-card-purple">
        <div className="text-sm font-bold text-ink-soft">{tx('现场问题')}</div>
        <div className="text-lg font-extrabold mt-1">{session.question}</div>
        {!submitted && (
          <p className="text-sm font-semibold text-ink-soft mt-2">
            👇 {tx('下面有')} {session.answers.length} {tx(' 个回答（每个不超过 15 个字），你觉得哪些是')} <b>AI</b> {tx(' 写的？点一下选中它们，再点提交。')}
          </p>
        )}
      </div>

      {!submitted && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            {session.answers.map((a, i) => {
              const chose = !!picked[a.id];
              return (
                <button
                  key={a.id}
                  onClick={() => setPicked((p) => ({ ...p, [a.id]: !p[a.id] }))}
                  className={`text-left kid-card transition-all ${chose ? '!border-violet-400 ring-4 ring-violet-200' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-soft">{tx('回答')} {i + 1}</span>
                    <span className={`text-xs font-bold ${chose ? 'text-violet-600' : 'text-slate-300'}`}>{chose ? tx('我猜是 AI 🤖') : tx('点击选择')}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{a.text}</p>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              const picks = { ...picked };
              setSubmitted(true);
              const correct = session.answers.filter((a) => !!picks[a.id] === a.isAI).length;
              void api
                .post('/course/turing/report', { sessionId: session.id, picks })
                .catch(() => {});
              reportGrowth({
                kind: 'quiz',
                gameSlug: 'turing-test',
                title: `图灵测试：${session.question}`,
                summary: `${tx('判断对了')} ${correct}/${session.answers.length}`,
                detail: {
                  question: session.question,
                  answers: session.answers.map((a) => ({
                    text: a.text,
                    isAI: a.isAI,
                    guessedAI: !!picks[a.id],
                  })),
                },
              });
            }}
            className="kid-button-primary"
          >
            {tx('✅ 提交判断')}
          </button>
        </>
      )}

      {submitted && (
        <>
          <div className={`kid-card ${correctCount === session.answers.length ? 'kid-card-mint' : 'kid-card-yellow'}`}>
            <div className="font-extrabold text-lg">
              {correctCount === session.answers.length
                ? tx('🎉 全部判断正确！你是火眼金睛！')
                : `${tx('判断对了')} ${correctCount}/${session.answers.length}`}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {session.answers.map((a, i) => {
              const chose = !!picked[a.id];
              const right = chose === a.isAI;
              return (
                <div key={a.id} className={`kid-card ${right ? '!border-emerald-300' : '!border-rose-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-soft">{tx('回答')} {i + 1}</span>
                    <span className={`text-xs font-bold ${a.isAI ? 'text-violet-600' : 'text-emerald-600'}`}>
                      {a.isAI ? tx('🤖 AI 写的') : tx('👦 小朋友写的')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{a.text}</p>
                  <div className={`mt-2 text-xs font-bold ${right ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {right ? tx('你判断对了') : tx('你判断错了')}
                  </div>
                </div>
              );
            })}
          </div>
          <AiWarning extra={tx('想一想：AI 的回答和小朋友的回答有什么不一样？')} />
          <button onClick={() => { setPicked({}); setSubmitted(false); }} className="kid-button-ghost">{tx('🔄 再判断一次')}</button>
        </>
      )}
    </div>
  );
}
