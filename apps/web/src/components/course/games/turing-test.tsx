'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { reportGrowth } from '@/lib/growth-report';

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
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  async function load() {
    try {
      const r = await api.get('/course/turing');
      const next: Session | null = r.data || null;
      setSession((prev) => {
        // 老师发布了新的一局 → 重置作答
        if (next?.id !== prev?.id) {
          setPicked({});
          setSubmitted(false);
        }
        return next;
      });
    } catch {
      setSession(null);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (!loaded) {
    return <div className="kid-card text-sm text-ink-soft">加载中…</div>;
  }

  if (!session) {
    return (
      <div className="kid-card-orange text-center py-10">
        <div className="text-5xl mb-3">⏳</div>
        <div className="font-extrabold text-lg">老师还没发布题目</div>
        <p className="text-sm text-ink-soft mt-1">请等老师在前面出好题，这里就会出现问题和大家的回答啦！（会自动刷新）</p>
      </div>
    );
  }

  const correctCount = session.answers.filter((a) => !!picked[a.id] === a.isAI).length;

  return (
    <div className="space-y-4">
      <div className="kid-card-purple">
        <div className="text-sm font-bold text-ink-soft">现场问题</div>
        <div className="text-lg font-extrabold mt-1">{session.question}</div>
        {!submitted && <p className="text-sm font-semibold text-ink-soft mt-2">👇 下面有 {session.answers.length} 个回答（每个不超过 15 个字），你觉得哪些是 <b>AI</b> 写的？点一下选中它们，再点提交。</p>}
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
                    <span className="text-xs font-bold text-ink-soft">回答 {i + 1}</span>
                    <span className={`text-xs font-bold ${chose ? 'text-violet-600' : 'text-slate-300'}`}>{chose ? '我猜是 AI 🤖' : '点击选择'}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{a.text}</p>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setSubmitted(true);
              const correct = session.answers.filter((a) => !!picked[a.id] === a.isAI).length;
              reportGrowth({
                kind: 'quiz',
                gameSlug: 'turing-test',
                title: `图灵测试：${session.question}`,
                summary: `判断对了 ${correct}/${session.answers.length} 个回答`,
                detail: {
                  question: session.question,
                  answers: session.answers.map((a) => ({
                    text: a.text,
                    isAI: a.isAI,
                    guessedAI: !!picked[a.id],
                  })),
                },
              });
            }}
            className="kid-button-primary"
          >
            ✅ 提交判断
          </button>
        </>
      )}

      {submitted && (
        <>
          <div className={`kid-card ${correctCount === session.answers.length ? 'kid-card-mint' : 'kid-card-yellow'}`}>
            <div className="font-extrabold text-lg">
              {correctCount === session.answers.length ? '🎉 全部判断正确！你是火眼金睛！' : `判断对了 ${correctCount}/${session.answers.length} 个`}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {session.answers.map((a, i) => {
              const chose = !!picked[a.id];
              const right = chose === a.isAI;
              return (
                <div key={a.id} className={`kid-card ${right ? '!border-emerald-300' : '!border-rose-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-soft">回答 {i + 1}</span>
                    <span className={`text-xs font-bold ${a.isAI ? 'text-violet-600' : 'text-emerald-600'}`}>
                      {a.isAI ? '🤖 AI 写的' : '👦 小朋友写的'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{a.text}</p>
                  <div className={`mt-2 text-xs font-bold ${right ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {right ? '✅ 你判断对了' : '❌ 你判断错了'}
                  </div>
                </div>
              );
            })}
          </div>
          <AiWarning extra="想一想：AI 的回答和小朋友的回答有什么不一样？" />
          <button onClick={() => { setPicked({}); setSubmitted(false); }} className="kid-button-ghost">🔄 再判断一次</button>
        </>
      )}
    </div>
  );
}
