'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { assetPath } from '@/lib/asset-path';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';
import { reportGrowth } from '@/lib/growth-report';

interface Diff {
  id: string;
  // 左半图(图A) / 右半图(图B) 上各自的热点坐标（相对每半图的百分比）
  lx: number;
  ly: number;
  rx: number;
  ry: number;
  explanation: string;
}
interface Puzzle {
  id: string;
  title: string;
  /** 左右拼接图（左=图A，右=图B），均为 AI 生成 */
  image: string;
  /** 每半张图的宽/高比例，默认 1（正方形） */
  ratio?: number;
  promptLeft: string;
  promptRight: string;
  diffs: Diff[];
}

const LEVEL_LABELS = ['第一关', '第二关', '第三关', '第四关'] as const;

const PUZZLES: Puzzle[] = [
  {
    id: 'beach',
    title: '海边的小猫',
    image: assetPath('/spot-diff/beach.png'),
    promptLeft: '一只戴着【红色】帽子的小猫，在白天的沙滩上，旁边有一棵【棕榈树】，天上有【太阳】',
    promptRight: '一只戴着【蓝色】帽子的小猫，在白天的沙滩上，旁边有一棵【棕榈树】，天上有【彩虹】',
    diffs: [
      { id: 'hat', lx: 47, ly: 64, rx: 47, ry: 64, explanation: '帽子的颜色不一样：提示词从「红色帽子」改成了「蓝色帽子」。' },
      { id: 'sky', lx: 22, ly: 16, rx: 22, ry: 16, explanation: '天上不一样：提示词从「太阳」改成了「彩虹」。' },
    ],
  },
  {
    id: 'space',
    title: '太空冒险',
    image: assetPath('/spot-diff/space.png'),
    promptLeft: '一个【宇航员】站在【月球】上，旁边有一只【小狗】，背景是【星星】',
    promptRight: '一个【机器人】站在【月球】上，旁边有一只【小狗】，背景是【星星】和一颗【流星】',
    diffs: [
      { id: 'hero', lx: 42, ly: 56, rx: 42, ry: 56, explanation: '主角不一样：提示词从「宇航员」改成了「机器人」。' },
      { id: 'meteor', lx: 24, ly: 18, rx: 24, ry: 18, explanation: '右图多了一颗流星：提示词里加了「一颗流星」。' },
    ],
  },
  {
    id: 'ultraman',
    title: '奥特曼主题',
    image: assetPath('/spot-diff/ultraman.png'),
    ratio: 800 / 623,
    promptLeft: '奥特曼站在红白高塔前，胸前是【蓝色】能量灯；红白高塔顶部【有细长天线】；右侧楼顶是【红色】广告牌，上面写着"光之力量"',
    promptRight: '奥特曼站在红白高塔前，胸前是【黄色】能量灯；红白高塔顶部【没有细长天线】；右侧楼顶是【蓝色】广告牌，上面写着"守护地球"',
    diffs: [
      { id: 'light', lx: 56, ly: 37, rx: 56, ry: 37, explanation: '胸前的能量灯颜色不一样：提示词从「蓝色能量灯」改成了「黄色能量灯」。' },
      { id: 'antenna', lx: 12, ly: 27, rx: 12, ry: 27, explanation: '高塔顶部不一样：提示词从「有细长天线」改成了「没有细长天线」。' },
      { id: 'sign', lx: 87, ly: 68, rx: 87, ry: 68, explanation: '广告牌不一样：提示词从「红色广告牌·光之力量」改成了「蓝色广告牌·守护地球」。' },
    ],
  },
  {
    id: 'pony',
    title: '小马宝莉主题',
    image: assetPath('/spot-diff/pony.png'),
    ratio: 852 / 730,
    promptLeft: '紫色小马的鬃毛上戴着一枚【黄色星星】发卡；画面右侧漂浮着【3个】气球，分别是粉色、黄色和紫色；彩虹下方【有】一朵白色小云朵',
    promptRight: '紫色小马的鬃毛上戴着一枚【粉色爱心】发卡；画面右侧漂浮着【4个】气球，分别是粉色、黄色、蓝色和紫色；彩虹下方【没有】白色小云朵',
    diffs: [
      { id: 'hairpin', lx: 24, ly: 40, rx: 24, ry: 40, explanation: '发卡不一样：提示词从「黄色星星发卡」改成了「粉色爱心发卡」。' },
      { id: 'balloon', lx: 88, ly: 23, rx: 88, ry: 23, explanation: '气球不一样：提示词从「3个气球（粉/黄/紫）」改成了「4个气球（粉/黄/蓝/紫）」。' },
      { id: 'cloud', lx: 52, ly: 22, rx: 52, ry: 22, explanation: '云朵不一样：提示词从「彩虹下方有一朵白云」改成了「彩虹下方没有白云」。' },
    ],
  },
];

type Phase = 'playing' | 'reveal' | 'congrats';

function Board({
  puzzle,
  side,
  found,
  onPick,
  readonly = false,
}: {
  puzzle: Puzzle;
  side: 'left' | 'right';
  found: Record<string, boolean>;
  onPick: (id: string) => void;
  readonly?: boolean;
}) {
  return (
    <div
      className={`relative w-full rounded-2xl border-2 border-orange-100 overflow-hidden bg-slate-100 ${readonly ? 'pointer-events-none' : ''}`}
      style={{
        aspectRatio: `${puzzle.ratio ?? 1} / 1`,
        backgroundImage: `url(${puzzle.image})`,
        backgroundSize: '200% 100%',
        backgroundPosition: side === 'left' ? '0% 50%' : '100% 50%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute top-1 left-2 text-[10px] font-bold bg-white/80 rounded-full px-2 py-0.5 z-10">{side === 'left' ? '图 A' : '图 B'}</div>
      {puzzle.diffs.map((d) => {
        const x = side === 'left' ? d.lx : d.rx;
        const y = side === 'left' ? d.ly : d.ry;
        const isFound = found[d.id];
        return (
          <button
            key={d.id}
            onClick={() => onPick(d.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ left: `${x}%`, top: `${y}%`, width: '26%', height: '26%', minWidth: 64, minHeight: 64 }}
          >
            <span className={`block w-full h-full rounded-full transition ${isFound ? 'ring-4 ring-emerald-400 bg-emerald-300/30' : 'hover:bg-white/20'}`} />
          </button>
        );
      })}
    </div>
  );
}

function highlight(text: string) {
  const parts = text.split(/(【[^】]*】)/g);
  return parts.map((p, i) =>
    p.startsWith('【') ? (
      <mark key={i} className="bg-amber-200 rounded px-0.5">{p.replace(/[【】]/g, '')}</mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function LevelTabs({ idx, completedCount }: { idx: number; completedCount: number }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {LEVEL_LABELS.map((label, i) => {
        const isCurrent = i === idx;
        const isDone = i < completedCount;
        return (
          <div
            key={label}
            className={`kid-button-sm border-2 pointer-events-none ${
              isCurrent
                ? 'bg-brand text-white border-brand'
                : isDone
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-ink-soft border-orange-200 opacity-70'
            }`}
          >
            {isDone && !isCurrent ? '✅ ' : ''}
            {label}
          </div>
        );
      })}
    </div>
  );
}

function PromptReveal({
  puzzle,
  idx,
  levelLabel,
  onKnow,
}: {
  puzzle: Puzzle;
  idx: number;
  levelLabel: string;
  onKnow: () => void;
}) {
  const allFound = Object.fromEntries(puzzle.diffs.map((d) => [d.id, true]));

  return (
    <div className="space-y-4">
      <LevelTabs idx={idx} completedCount={idx} />

      <div className="kid-card">
        <div className="font-extrabold text-lg text-center">🔤 {levelLabel} · 原来是提示词不一样！</div>
        <p className="text-sm text-ink-soft text-center mt-1">两张图看起来不同，是因为给 AI 的提示词有细微差别。</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Board puzzle={puzzle} side="left" found={allFound} onPick={() => {}} readonly />
          <Board puzzle={puzzle} side="right" found={allFound} onPick={() => {}} readonly />
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-sky-50 border-2 border-sky-100 p-3">
            <div className="text-xs font-bold text-sky-700 mb-1">图 A 的提示词</div>
            <div className="text-sm leading-relaxed">{highlight(puzzle.promptLeft)}</div>
          </div>
          <div className="rounded-xl bg-pink-50 border-2 border-pink-100 p-3">
            <div className="text-xs font-bold text-pink-700 mb-1">图 B 的提示词</div>
            <div className="text-sm leading-relaxed">{highlight(puzzle.promptRight)}</div>
          </div>
          <div className="space-y-1.5">
            {puzzle.diffs.map((d) => (
              <div key={d.id} className="text-sm text-ink-soft">• {d.explanation}</div>
            ))}
          </div>
        </div>
        <button onClick={onKnow} className="kid-button-primary w-full mt-4">
          我知道啦
        </button>
      </div>
    </div>
  );
}

function CongratsView({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {LEVEL_LABELS.map((label) => (
          <div key={label} className="kid-button-sm border-2 bg-emerald-50 text-emerald-700 border-emerald-200 pointer-events-none">
            ✅ {label}
          </div>
        ))}
      </div>

      <div className="kid-card-mint text-center space-y-3 py-8">
        <div className="text-5xl">🎉</div>
        <div className="font-extrabold text-2xl text-ink">恭喜你，全部通关啦！</div>
        <p className="text-sm text-ink-soft leading-relaxed max-w-md mx-auto">
          你已经完成了四关「AI 图片找不同」。原来 AI 画出的每张图，背后都藏着一句提示词——改几个词，画面就会不一样！
        </p>
        <button onClick={onRestart} className="kid-button-ghost mt-2">
          🔄 再玩一次
        </button>
      </div>
    </div>
  );
}

export function SpotDiffGame() {
  const report = useReportGameProgress('spot-diff');
  const [idx, setIdx] = useState(0);
  const [found, setFound] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState<Phase>('playing');
  const [completedCount, setCompletedCount] = useState(0);
  const autoRevealRef = useRef(false);

  const puzzle = PUZZLES[idx];
  const levelLabel = LEVEL_LABELS[idx];

  const allFound = useMemo(() => puzzle.diffs.every((d) => found[d.id]), [puzzle, found]);
  const foundCount = puzzle.diffs.filter((d) => found[d.id]).length;

  useEffect(() => {
    if (phase !== 'playing') return;
    void report({
      status: 'generating',
      roundCount: idx + 1,
      summary: `进行中 · ${levelLabel}（${puzzle.title}）· 已找到 ${foundCount}/${puzzle.diffs.length}`,
    });
  }, [phase, idx, foundCount, levelLabel, puzzle.diffs.length, puzzle.title, report]);

  useEffect(() => {
    if (phase !== 'playing' || !allFound || autoRevealRef.current) return;
    autoRevealRef.current = true;
    setPhase('reveal');
    void report({
      status: 'generating',
      roundCount: idx + 1,
      summary: `${levelLabel} · 已找全 ${puzzle.diffs.length} 处不同，正在看提示词差异`,
      text: puzzle.diffs.map((d) => d.explanation).join('\n'),
    });
  }, [allFound, idx, levelLabel, phase, puzzle.diffs, report]);

  function pick(id: string) {
    if (phase !== 'playing' || found[id]) return;
    setFound((f) => ({ ...f, [id]: true }));
  }

  function resetCurrentLevel() {
    setFound({});
    autoRevealRef.current = false;
    setPhase('playing');
  }

  function handleKnow() {
    const nextCompleted = Math.max(completedCount, idx + 1);
    setCompletedCount(nextCompleted);

    if (idx < PUZZLES.length - 1) {
      setIdx(idx + 1);
      setFound({});
      autoRevealRef.current = false;
      setPhase('playing');
      void report({
        status: 'generating',
        roundCount: idx + 2,
        summary: `已完成 ${levelLabel}，进入${LEVEL_LABELS[idx + 1]}`,
      });
      return;
    }

    setPhase('congrats');
    const detail = PUZZLES.map((p, i) => ({
      level: LEVEL_LABELS[i],
      theme: p.title,
      diffs: p.diffs.map((d) => d.explanation),
    }));
    void report({
      status: 'done',
      roundCount: PUZZLES.length,
      summary: '四关全部完成 🎉',
      title: 'AI 图片找不同 · 全部通关',
      text: PUZZLES.map((p, i) => `${LEVEL_LABELS[i]}（${p.title}）：找全 ${p.diffs.length} 处不同`).join('\n'),
    });
    reportGrowth({
      kind: 'game',
      gameSlug: 'spot-diff',
      title: 'AI 图片找不同',
      summary: '四关全部完成 🎉',
      detail,
    });
  }

  function restartAll() {
    setIdx(0);
    setFound({});
    setCompletedCount(0);
    autoRevealRef.current = false;
    setPhase('playing');
    void report({
      status: 'generating',
      roundCount: 1,
      summary: '重新开始 · 第一关',
    });
  }

  if (phase === 'congrats') {
    return <CongratsView onRestart={restartAll} />;
  }

  if (phase === 'reveal') {
    return <PromptReveal puzzle={puzzle} idx={idx} levelLabel={levelLabel} onKnow={handleKnow} />;
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-pink">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🧐 两张图都是 AI 画的，但提示词有一点点不一样！在 <b>任意一张图</b> 上点出不同的地方（共 {puzzle.diffs.length} 处），找全后会自动带你去看提示词差在哪。
        </p>
      </div>

      <LevelTabs idx={idx} completedCount={completedCount} />

      <div className="text-center">
        <span className="inline-block bg-teal-100 text-teal-700 font-bold text-xs px-3 py-1 rounded-full">
          🏷️ {levelLabel}｜{puzzle.title}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Board puzzle={puzzle} side="left" found={found} onPick={pick} />
        <Board puzzle={puzzle} side="right" found={found} onPick={pick} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="tag-mint">已找到 {foundCount}/{puzzle.diffs.length}</span>
        <button onClick={resetCurrentLevel} className="kid-button-ghost">🔄 重来</button>
        {!allFound && (
          <span className="text-xs text-ink-soft font-semibold">找全 {puzzle.diffs.length} 处不同后，会自动进入提示词对比页</span>
        )}
      </div>
    </div>
  );
}
