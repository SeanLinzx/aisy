'use client';
import { useMemo, useState } from 'react';
import { assetPath } from '@/lib/asset-path';

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
  /** 1024×512 的左右拼接图（左=图A，右=图B），均为 AI 生成 */
  image: string;
  promptLeft: string;
  promptRight: string;
  diffs: Diff[];
}

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
];

function Board({
  puzzle,
  side,
  found,
  onPick,
}: {
  puzzle: Puzzle;
  side: 'left' | 'right';
  found: Record<string, boolean>;
  onPick: (id: string) => void;
}) {
  return (
    <div
      className="relative w-full rounded-2xl border-2 border-orange-100 overflow-hidden bg-slate-100"
      style={{
        aspectRatio: '1 / 1',
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

export function SpotDiffGame() {
  const [idx, setIdx] = useState(0);
  const [found, setFound] = useState<Record<string, boolean>>({});
  const [reveal, setReveal] = useState(false);
  const puzzle = PUZZLES[idx];

  const allFound = useMemo(() => puzzle.diffs.every((d) => found[d.id]), [puzzle, found]);
  const foundCount = puzzle.diffs.filter((d) => found[d.id]).length;

  function pick(id: string) {
    setFound((f) => ({ ...f, [id]: true }));
  }
  function reset(i = idx) {
    setIdx(i);
    setFound({});
    setReveal(false);
  }
  function nextPuzzle() {
    reset((idx + 1) % PUZZLES.length);
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-pink">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🧐 两张图都是 AI 画的，但提示词有一点点不一样！在 <b>任意一张图</b> 上点出不同的地方（共 {puzzle.diffs.length} 处），找全后看看提示词差在哪。
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {PUZZLES.map((p, i) => (
          <button key={p.id} onClick={() => reset(i)} className={`kid-button-sm border-2 ${i === idx ? 'bg-brand text-white border-brand' : 'bg-white text-ink-soft border-orange-200'}`}>
            {p.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Board puzzle={puzzle} side="left" found={found} onPick={pick} />
        <Board puzzle={puzzle} side="right" found={found} onPick={pick} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="tag-mint">已找到 {foundCount}/{puzzle.diffs.length}</span>
        <button onClick={() => setReveal(true)} disabled={!allFound} className="kid-button-primary disabled:opacity-50">
          {allFound ? '🎉 看看提示词差异' : '把不同点都找出来吧'}
        </button>
        <button onClick={() => reset()} className="kid-button-ghost">🔄 重来</button>
        <button onClick={nextPuzzle} className="kid-button-sky">下一题 ➡️</button>
      </div>

      {reveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setReveal(false)}>
          <div className="kid-card max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="font-extrabold text-lg text-center">🔤 原来是提示词不一样！</div>
            <div className="mt-3 space-y-3">
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
            <button onClick={() => setReveal(false)} className="kid-button-primary w-full mt-4">我明白啦！</button>
          </div>
        </div>
      )}
    </div>
  );
}
