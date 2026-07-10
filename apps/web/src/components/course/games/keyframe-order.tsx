'use client';
import { useMemo, useState } from 'react';

interface Frame {
  id: string;
  emoji: string;
  label: string;
  order: number; // 正确顺序
}

const FRAMES: Frame[] = [
  { id: 'f1', emoji: '🥚', label: '一颗蛋', order: 1 },
  { id: 'f2', emoji: '🐣', label: '蛋裂开了', order: 2 },
  { id: 'f3', emoji: '🐥', label: '小鸡出来了', order: 3 },
  { id: 'f4', emoji: '🐔', label: '长成大鸡', order: 4 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function KeyframeOrderGame() {
  const [pool] = useState(() => shuffle(FRAMES));
  const [seq, setSeq] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function pick(id: string) {
    if (submitted) return;
    setSeq((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const correct = useMemo(() => {
    if (seq.length !== FRAMES.length) return false;
    return seq.every((id, i) => FRAMES.find((f) => f.id === id)!.order === i + 1);
  }, [seq, submitted]);

  return (
    <div className="space-y-4">
      <div className="kid-card-yellow">
        <div className="flex items-center gap-2">
          <span className="tag-yellow">敬请期待</span>
          <span className="text-sm font-semibold text-ink-soft">完整版会用真实 AI 视频的关键帧。这里先玩一个简单版练练手！</span>
        </div>
      </div>

      <div className="kid-card">
        <div className="text-sm font-bold mb-2">🎬 视频播放区（占位）</div>
        <div className="aspect-video rounded-2xl bg-slate-900 flex items-center justify-center text-white/70">
          <div className="text-center">
            <div className="text-5xl mb-2">🎞️</div>
            <div className="text-sm">这里将播放一段 AI 视频</div>
          </div>
        </div>
      </div>

      <div className="kid-card space-y-3">
        <div className="text-sm font-bold">🔢 按照故事发生的顺序，依次点击下面的关键帧：</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {pool.map((f) => {
            const pos = seq.indexOf(f.id);
            const chosen = pos >= 0;
            const isRight = submitted && chosen && f.order === pos + 1;
            const isWrong = submitted && chosen && f.order !== pos + 1;
            return (
              <button
                key={f.id}
                onClick={() => pick(f.id)}
                className={`relative rounded-2xl border-2 p-4 bg-white text-center transition ${
                  chosen ? 'border-sky-400 ring-2 ring-sky-200' : 'border-orange-100'
                } ${isRight ? '!border-emerald-400' : ''} ${isWrong ? '!border-rose-400' : ''}`}
              >
                {chosen && <span className="absolute top-1 left-1 w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center">{pos + 1}</span>}
                <div className="text-4xl">{f.emoji}</div>
                <div className="text-xs font-bold mt-1">{f.label}</div>
              </button>
            );
          })}
        </div>
        {!submitted ? (
          <button onClick={() => setSubmitted(true)} disabled={seq.length !== FRAMES.length} className="kid-button-primary disabled:opacity-50">
            ✅ 提交顺序
          </button>
        ) : (
          <div className="space-y-2">
            <div className={`font-extrabold ${correct ? 'text-emerald-600' : 'text-rose-600'}`}>
              {correct ? '🎉 顺序完全正确！' : '🤔 顺序还不太对，再想想故事是怎么发生的～'}
            </div>
            <button onClick={() => { setSeq([]); setSubmitted(false); }} className="kid-button-ghost">🔄 再试一次</button>
          </div>
        )}
      </div>
    </div>
  );
}
