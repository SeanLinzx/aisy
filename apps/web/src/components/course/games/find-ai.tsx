'use client';
import { useMemo, useState } from 'react';
import { assetPath } from '@/lib/asset-path';
import { reportGrowth } from '@/lib/growth-report';
import { useLanguage } from '@/contexts/language-context';

type Choice = 'ai' | 'not';

interface SceneItem {
  id: string;
  emoji: string;
  label: string;
  isAI: boolean;
  intro: string; // 中性介绍，不剧透答案
  explanation: string; // 提交后揭晓的解释
  x: number; // 百分比
  y: number;
}

interface Scene {
  id: string;
  title: string;
  emoji: string;
  bg: string;
  /** 可选：真实背景图（有则用图片，热点对准图中物体；无则用 emoji + 渐变） */
  bgImage?: string;
  items: SceneItem[];
}

// 种子数据：≥3 个场景。后续可替换为 AI 生成的场景图。
const SCENES: Scene[] = [
  {
    id: 'school',
    title: '校园',
    emoji: '🏫',
    bg: 'from-sky-200 to-emerald-100',
    bgImage: assetPath('/scenes/school-campus.png'),
    items: [
      { id: 's1', emoji: '📷', label: '人脸识别门禁', isAI: true, x: 24, y: 42, intro: '走到门口，它会自动看你的脸，认出你是谁，然后帮你开门。', explanation: '人脸识别用 AI「看脸」认出是谁，是 AI！' },
      { id: 's6', emoji: '🔔', label: '上课铃', isAI: false, x: 64, y: 32, intro: '到了固定时间就会响，提醒大家上下课。', explanation: '定时响的铃铛是固定程序，不会学习，不是 AI。' },
      { id: 's2', emoji: '🤖', label: '编程教室机器人', isAI: true, x: 85, y: 48, intro: '它能听懂你的指令，自己移动、避开障碍，还能和你对话。', explanation: '能听指令、自己行动的机器人用到了 AI。' },
      { id: 's3', emoji: '🗣️', label: '智能语音助教', isAI: true, x: 50, y: 65, intro: '你对它说话提问，它能听懂，并用声音回答你。', explanation: '能听懂你说话并回答，这是 AI 的「耳朵和大脑」。' },
      { id: 's4', emoji: '🪑', label: '木头课桌椅', isAI: false, x: 14, y: 76, intro: '就是普通的桌子和椅子，给同学们上课用。', explanation: '普通桌椅不会思考，不是 AI。' },
      { id: 's5', emoji: '🏀', label: '篮球', isAI: false, x: 82, y: 74, intro: '体育课上大家拍来拍去、投进篮筐的球。', explanation: '篮球只是个球，不会自己判断，不是 AI。' },
    ],
  },
  {
    id: 'home',
    title: '家庭',
    emoji: '🏠',
    bg: 'from-amber-100 to-pink-100',
    bgImage: assetPath('/scenes/home-living.png'),
    items: [
      { id: 'h1', emoji: '🔊', label: '智能音箱', isAI: true, x: 10, y: 48, intro: '你喊它的名字，它就会播放音乐、查天气、回答你的问题。', explanation: '能听你说话、点歌、查天气，是 AI 助手。' },
      { id: 'h2', emoji: '🧹', label: '扫地机器人', isAI: true, x: 42, y: 78, intro: '它在地上自己跑来跑去，绕开桌椅，把地扫得干干净净。', explanation: '会自己规划路线、躲开障碍，用到了 AI。' },
      { id: 'h3', emoji: '📺', label: '会推荐节目的电视', isAI: true, x: 52, y: 32, intro: '它会根据你平时爱看的内容，主动推荐你可能喜欢的节目。', explanation: '根据你的喜好推荐内容，这是 AI 在「猜」你想看什么。' },
      { id: 'h4', emoji: '🛋️', label: '沙发', isAI: false, x: 28, y: 72, intro: '客厅里用来坐和躺的软软的沙发。', explanation: '沙发不会思考，不是 AI。' },
      { id: 'h5', emoji: '🍚', label: '普通电饭煲', isAI: false, x: 86, y: 48, intro: '按一下按钮就开始煮饭，时间到了就保温。', explanation: '按固定程序加热，不会学习，不是 AI。' },
      { id: 'h6', emoji: '🪴', label: '盆栽', isAI: false, x: 6, y: 58, intro: '摆在窗边的一盆绿色小植物。', explanation: '植物是生命，但不是人造的 AI。' },
    ],
  },
  {
    id: 'public',
    title: '公共环境',
    emoji: '🌆',
    bg: 'from-violet-200 to-sky-100',
    bgImage: assetPath('/scenes/public-city.png'),
    items: [
      { id: 'p1', emoji: '🚗', label: '自动驾驶汽车', isAI: true, x: 17, y: 66, intro: '没有司机踩油门，它能自己看路、转弯、停车。', explanation: '自己看路、判断、开车，是很厉害的 AI。' },
      { id: 'p3', emoji: '📹', label: '智能摄像头', isAI: true, x: 50, y: 16, intro: '它能认出画面里的人和车，发现情况会发出提醒。', explanation: '能识别人和车，是 AI 的「眼睛」。' },
      { id: 'p2', emoji: '🈸', label: '街头翻译机', isAI: true, x: 78, y: 40, intro: '你说一句中文，它马上把它变成别的语言显示出来。', explanation: '把一种语言翻成另一种，是 AI 的「大脑」在工作。' },
      { id: 'p4', emoji: '🚦', label: '固定红绿灯', isAI: false, x: 89, y: 47, intro: '按固定的时间，红灯和绿灯轮流亮。', explanation: '按固定时间切换，不会思考，不是 AI。' },
      { id: 'p5', emoji: '🪧', label: '路牌', isAI: false, x: 8, y: 27, intro: '立在路边的牌子，告诉你往哪个方向走。', explanation: '路牌只是指示牌，不是 AI。' },
      { id: 'p6', emoji: '🛒', label: '购物车', isAI: false, x: 55, y: 57, intro: '超市里用来装东西、推着走的小车。', explanation: '普通购物车不会自己行动，不是 AI。' },
    ],
  },
];

export function FindAiGame() {
  const { tx } = useLanguage();
  const [sceneIdx, setSceneIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Choice>>({});
  const [checked, setChecked] = useState(false);
  const [active, setActive] = useState<SceneItem | null>(null);

  const scene = SCENES[sceneIdx];

  function answer(id: string, choice: Choice) {
    setAnswers((a) => ({ ...a, [id]: choice }));
    setActive(null);
  }

  const allAnswered = scene.items.every((it) => answers[it.id]);

  const result = useMemo(() => {
    const wrong: SceneItem[] = [];
    let correct = 0;
    for (const item of scene.items) {
      const chose = answers[item.id];
      const choseAI = chose === 'ai';
      if (chose && choseAI === item.isAI) correct += 1;
      else if (chose) wrong.push(item);
    }
    return { wrong, correct, total: scene.items.length };
  }, [scene, answers, checked]);

  function switchScene(i: number) {
    setSceneIdx(i);
    setAnswers({});
    setChecked(false);
    setActive(null);
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-sky">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🔍 {tx('在这个场景里，点一点每个东西，看看它的介绍，再判断它')}<b>{tx('是不是 AI')}</b>{tx('。全部判断完后点「提交答案」，看看你找对了没有！')}
        </p>
      </div>

      {/* 场景切换 */}
      <div className="flex gap-2 flex-wrap">
        {SCENES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => switchScene(i)}
            className={`kid-button-sm border-2 ${i === sceneIdx ? 'bg-brand text-white border-brand' : 'bg-white text-ink-soft border-orange-200'}`}
          >
            {s.emoji} {tx(s.title)}
          </button>
        ))}
      </div>

      {/* 场景画板 */}
      <div
        className={`relative w-full rounded-3xl border-2 border-orange-100 overflow-hidden ${scene.bgImage ? '' : `bg-gradient-to-br ${scene.bg}`}`}
        style={{
          aspectRatio: '16/9',
          ...(scene.bgImage ? { backgroundImage: `url(${scene.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
        }}
      >
        {scene.items.map((item) => {
          const chose = answers[item.id];
          const choseAI = chose === 'ai';
          const isWrong = checked && chose && choseAI !== item.isAI;
          const isRight = checked && chose && choseAI === item.isAI;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-transform hover:scale-110"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              <span className="relative">
                {scene.bgImage ? (
                  // 有真实背景图：用圆形标记圈出物体，不再叠 emoji 方块
                  <span
                    className={`flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full border-[3px] backdrop-blur-[1px] shadow-pop-sm transition ${
                      chose ? 'border-amber-400 bg-amber-300/25 ring-4 ring-amber-300/40' : 'border-white/90 bg-white/15'
                    } ${isWrong ? '!border-rose-500 bg-rose-400/25 ring-4 ring-rose-300/60' : ''} ${isRight ? '!border-emerald-500 bg-emerald-300/25 ring-4 ring-emerald-300/60' : ''}`}
                  >
                    {chose ? <span className="text-lg">{choseAI ? '🤖' : '🚫'}</span> : <span className="text-white text-xl font-black drop-shadow">?</span>}
                  </span>
                ) : (
                  <>
                    <span
                      className={`flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl text-2xl md:text-3xl bg-white/90 border-2 shadow-pop-sm ${
                        chose ? 'border-amber-400 ring-4 ring-amber-300/50' : 'border-white'
                      } ${isWrong ? '!border-rose-500 ring-4 ring-rose-300/70' : ''} ${isRight ? '!border-emerald-500 ring-4 ring-emerald-300/70' : ''}`}
                    >
                      {item.emoji}
                    </span>
                    {chose && (
                      <span className="absolute -top-2 -right-2 text-sm bg-white rounded-full shadow-pop-sm w-6 h-6 flex items-center justify-center">
                        {choseAI ? '🤖' : '🚫'}
                      </span>
                    )}
                  </>
                )}
              </span>
              <span className="text-[10px] md:text-xs font-bold bg-white/85 rounded-full px-1.5 py-0.5 text-ink whitespace-nowrap shadow-pop-sm">
                {tx(item.label)}
                {checked && item.isAI ? ' 🤖' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {!checked ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="tag">{Object.keys(answers).length}/{scene.items.length}{tx(' 已判断')}</span>
          <button
            onClick={() => {
              setChecked(true);
              let correct = 0;
              for (const item of scene.items) {
                if (answers[item.id] && (answers[item.id] === 'ai') === item.isAI) correct += 1;
              }
              reportGrowth({
                kind: 'game',
                gameSlug: 'find-ai',
                title: `AI 助手在哪里 · ${scene.title}`,
                summary: `答对 ${correct}/${scene.items.length} 个`,
                detail: scene.items.map((it) => ({
                  label: it.label,
                  isAI: it.isAI,
                  guessedAI: answers[it.id] === 'ai',
                })),
              });
            }}
            disabled={!allAnswered}
            className="kid-button-primary disabled:opacity-50"
          >
            {allAnswered ? tx('✅ 提交答案') : tx('把每个都判断一下吧')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`kid-card ${result.wrong.length === 0 ? 'kid-card-mint' : 'kid-card-yellow'}`}>
            <div className="font-extrabold text-lg">
              {result.wrong.length === 0 ? tx('🎉 全部答对啦！') : `${tx('答对了')} ${result.correct}/${result.total}`}
            </div>
            {result.wrong.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="text-sm font-bold text-rose-600">{tx('这些地方需要再想想（点图标或下面看解释）：')}</div>
                {result.wrong.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setActive(w)}
                    className="block w-full text-left text-sm rounded-xl px-3 py-2 bg-white border-2 border-rose-100 hover:border-rose-300"
                  >
                    <span className="mr-1">{w.emoji}</span>
                    <b>{tx(w.label)}</b>{tx(' —— 其实它')}{w.isAI ? tx('是 AI 🤖') : tx('不是 AI 🚫')}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => switchScene(sceneIdx)} className="kid-button-ghost">{tx('🔄 再试一次')}</button>
        </div>
      )}

      {/* 弹窗：未提交时 = 介绍 + 确认；已提交时 = 揭晓解释 */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setActive(null)}>
          <div className="kid-card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl text-center">{active.emoji}</div>
            <div className="font-extrabold text-lg text-center mt-2">{tx(active.label)}</div>

            {!checked ? (
              <>
                <p className="text-sm text-ink-soft mt-3 leading-relaxed text-center">{tx(active.intro)}</p>
                <div className="mt-2 text-center text-sm font-bold text-ink">{tx('你觉得它是 AI 吗？')}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button onClick={() => answer(active.id, 'ai')} className="kid-button bg-violet-500 text-white shadow-pop-purple hover:bg-violet-600">
                    {tx('🤖 是 AI')}
                  </button>
                  <button onClick={() => answer(active.id, 'not')} className="kid-button-ghost">
                    {tx('🚫 不是 AI')}
                  </button>
                </div>
                {answers[active.id] && (
                  <div className="mt-3 text-center text-xs text-ink-soft">
                    {tx('你已选择：')}{answers[active.id] === 'ai' ? tx('🤖 是 AI') : tx('🚫 不是 AI')}{tx('（可重新选择）')}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={`text-center mt-1 text-sm font-bold ${active.isAI ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {active.isAI ? tx('这是 AI 🤖') : tx('这不是 AI 🚫')}
                </div>
                <p className="text-sm text-ink-soft mt-3 leading-relaxed text-center">{tx(active.explanation)}</p>
                <button onClick={() => setActive(null)} className="kid-button-primary w-full mt-4">{tx('我知道啦')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
