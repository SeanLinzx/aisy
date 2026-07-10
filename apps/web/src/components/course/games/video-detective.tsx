'use client';
import { useMemo, useState } from 'react';
import { reportGrowth } from '@/lib/growth-report';

interface Clip {
  id: string;
  title: string;
  emoji: string;
  bg: string;
  isAI: boolean;
  hint: string;
}

// 视频占位符 + 选择题。后续可替换为真实视频 URL。
const CLIPS: Clip[] = [
  { id: 'c1', title: '会跳舞的小猫', emoji: '🐱', bg: 'from-pink-300 to-amber-200', isAI: true, hint: '小猫动作太流畅、毛发偶尔会“糊”，是 AI 生成的。' },
  { id: 'c2', title: '小朋友过生日', emoji: '🎂', bg: 'from-sky-300 to-emerald-200', isAI: false, hint: '真实拍摄：手持镜头有轻微抖动，细节自然。' },
  { id: 'c3', title: '宇航员在火星跳舞', emoji: '🧑‍🚀', bg: 'from-violet-300 to-rose-200', isAI: true, hint: '现实里没人能在火星拍视频，画面是 AI 想象的。' },
  { id: 'c4', title: '老师上课', emoji: '👩‍🏫', bg: 'from-amber-200 to-orange-200', isAI: false, hint: '真实课堂录像，背景和光线很自然。' },
  { id: 'c5', title: '龙在城市上空飞', emoji: '🐉', bg: 'from-slate-300 to-sky-200', isAI: true, hint: '龙是虚构的，这种画面只能由 AI 生成。' },
  { id: 'c6', title: '操场上踢足球', emoji: '⚽', bg: 'from-emerald-300 to-lime-200', isAI: false, hint: '真实运动画面，人物动作和物理规律一致。' },
];

export function VideoDetectiveGame() {
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => CLIPS.filter((c) => !!picked[c.id] === c.isAI).length, [picked, submitted]);

  function toggle(id: string) {
    if (submitted) return;
    setPicked((p) => ({ ...p, [id]: !p[id] }));
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-sky">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🎞️ 当一回小侦探！下面有 6 段视频，<b>选出你认为是 AI 生成的</b>（被选中会发光），选好后点提交看看你的眼力。
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CLIPS.map((c) => {
          const chose = !!picked[c.id];
          const right = submitted && chose === c.isAI;
          const wrong = submitted && chose !== c.isAI;
          return (
            <button
              key={c.id}
              onClick={() => (submitted ? undefined : toggle(c.id))}
              className={`text-left rounded-2xl border-2 overflow-hidden bg-white transition ${
                chose ? 'border-sky-400 ring-4 ring-sky-200' : 'border-orange-100'
              } ${right ? '!border-emerald-400 !ring-emerald-200' : ''} ${wrong ? '!border-rose-400 !ring-rose-200' : ''}`}
            >
              <div className={`relative aspect-video bg-gradient-to-br ${c.bg} flex items-center justify-center`}>
                <span className="text-5xl">{c.emoji}</span>
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-12 h-12 rounded-full bg-black/35 text-white flex items-center justify-center text-xl">▶</span>
                </span>
                {submitted && (
                  <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${c.isAI ? 'bg-violet-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {c.isAI ? '🤖 AI' : '📹 真实'}
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="font-bold text-sm">{c.title}</div>
                <div className="text-xs text-ink-soft mt-0.5">{chose ? '我猜：AI 生成 🤖' : submitted ? '' : '点一下选择'}</div>
                {submitted && <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">💡 {c.hint}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={() => {
            setSubmitted(true);
            const correct = CLIPS.filter((c) => !!picked[c.id] === c.isAI).length;
            reportGrowth({
              kind: 'game',
              gameSlug: 'video-detective',
              title: 'AI 视频大侦探',
              summary: `找出 AI 视频：答对 ${correct}/${CLIPS.length} 段`,
              detail: CLIPS.map((c) => ({ title: c.title, isAI: c.isAI, guessedAI: !!picked[c.id] })),
            });
          }}
          className="kid-button-primary"
        >
          ✅ 提交答案
        </button>
      ) : (
        <div className="space-y-3">
          <div className={`kid-card ${score === CLIPS.length ? 'kid-card-mint' : 'kid-card-yellow'}`}>
            <div className="font-extrabold text-lg">
              {score === CLIPS.length ? '🎉 全部答对！你是 AI 视频鉴定大师！' : `答对了 ${score}/${CLIPS.length} 段`}
            </div>
          </div>
          <button onClick={() => { setSubmitted(false); setPicked({}); }} className="kid-button-ghost">🔄 再玩一次</button>
        </div>
      )}
    </div>
  );
}
