'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { reportGrowth } from '@/lib/growth-report';

interface Part {
  id: string;
  emoji: string;
  label: string;
  /** 推荐摆放的区域（用于「提交」后给出温和的小建议，不代表唯一正确答案） */
  idealZone: string;
}

interface Zone {
  id: string;
  emoji: string;
  label: string;
}

// 6 个零件：状态区 2 个 + 卡牌区 1 个 + 按钮区 2 个 + 成绩区 1 个
const PARTS: Part[] = [
  { id: 'title', emoji: '🕵️', label: '游戏标题', idealZone: 'status' },
  { id: 'timer', emoji: '⏱️', label: '计时器', idealZone: 'status' },
  { id: 'cards', emoji: '🔍', label: '侦探卡牌区', idealZone: 'cards' },
  { id: 'restart', emoji: '🔄', label: '重新开始按钮', idealZone: 'button' },
  { id: 'hint', emoji: '💡', label: '查看提示', idealZone: 'button' },
  { id: 'result', emoji: '🏆', label: '通关成绩', idealZone: 'result' },
];

// 位置区（不暗示"正确答案"，孩子自己决定摆哪儿；提交后才给小建议）
const ZONES: Zone[] = [
  { id: 'status', emoji: '⬆️', label: '状态区（最上面）' },
  { id: 'cards', emoji: '🃏', label: '卡牌区（中间）' },
  { id: 'button', emoji: '🔘', label: '按钮区' },
  { id: 'result', emoji: '⬇️', label: '成绩区（最下面）' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyPlacements(): Record<string, string | null> {
  return Object.fromEntries(PARTS.map((p) => [p.id, null]));
}

/** 每个零件用自己「真实的样子」渲染到手机预览里，摆哪儿就在哪儿显示 */
function MockItem({ part }: { part: Part }) {
  switch (part.id) {
    case 'title':
      return <div className="text-base font-extrabold text-center">🕵️ 小侦探·记忆力挑战</div>;
    case 'timer':
      return (
        <span className="inline-block bg-slate-100 text-slate-600 font-bold text-xs px-2 py-1 rounded-full">
          ⏱️ 12.3s
        </span>
      );
    case 'cards':
      return (
        <div className="grid grid-cols-4 gap-1.5">
          {['❓', '🔍', '❓', '🔍'].map((c, i) => (
            <div
              key={i}
              className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold ${
                c === '❓' ? 'bg-teal-700 text-teal-100' : 'bg-white border-2 border-teal-200'
              }`}
            >
              {c}
            </div>
          ))}
        </div>
      );
    case 'restart':
      return (
        <button type="button" className="bg-brand text-white font-bold text-xs px-4 py-2 rounded-full">
          🔄 重新挑战
        </button>
      );
    case 'hint':
      return (
        <button type="button" className="bg-violet-100 text-violet-700 font-bold text-xs px-4 py-2 rounded-full border-2 border-violet-200">
          💡 查看提示
        </button>
      );
    case 'result':
      return (
        <div className="inline-block bg-white border-2 border-amber-200 text-amber-700 text-xs font-bold rounded-2xl px-3 py-1.5 shadow">
          🏆 用时12.3s · 翻牌8次！
        </div>
      );
    default:
      return null;
  }
}

export function LayoutArrangeGame() {
  const [pool] = useState(() => shuffle(PARTS));
  const [placements, setPlacements] = useState<Record<string, string | null>>(emptyPlacements);
  const [dragging, setDragging] = useState<{ id: string; x: number; y: number } | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const zoneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const draggingRef = useRef<string | null>(null);

  function startDrag(id: string, clientX: number, clientY: number) {
    draggingRef.current = id;
    setDragging({ id, x: clientX, y: clientY });
  }

  useEffect(() => {
    if (!dragging) return;
    function move(e: PointerEvent) {
      setDragging((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    }
    function up(e: PointerEvent) {
      const id = draggingRef.current;
      draggingRef.current = null;
      let landedZone: string | null = null;
      if (id) {
        for (const zone of ZONES) {
          const el = zoneRefs.current[zone.id];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
            landedZone = zone.id;
            break;
          }
        }
        setPlacements((p) => ({ ...p, [id]: landedZone }));
        setRecorded(false);
        setFeedback(null);
      }
      setDragging(null);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging]);

  const placedCount = PARTS.filter((p) => placements[p.id]).length;
  const draggingPart = dragging ? PARTS.find((p) => p.id === dragging.id) : null;

  const zoneItems = useMemo(
    () => ZONES.map((zone) => ({ zone, items: PARTS.filter((p) => placements[p.id] === zone.id) })),
    [placements],
  );

  function zoneLabel(id: string): string {
    return ZONES.find((z) => z.id === id)?.label ?? id;
  }

  function recordDesign() {
    setRecorded(true);
    reportGrowth({
      kind: 'game',
      gameSlug: 'layout-arrange',
      title: '🧱 摆一摆侦探游戏布局',
      summary: `摆了一次页面布局：已摆放 ${placedCount}/${PARTS.length} 个零件`,
      detail: { placements },
    });
  }

  function submitDesign() {
    if (placedCount < PARTS.length) {
      setFeedback({ ok: false, message: `还有 ${PARTS.length - placedCount} 个零件没摆呢，先把它们都放到合适的位置，再来提交试试～` });
      return;
    }
    const mismatched = PARTS.filter((p) => placements[p.id] !== p.idealZone);
    recordDesign();
    if (mismatched.length === 0) {
      setFeedback({ ok: true, message: '🎉 太棒了！这样摆又清楚又好用，翻牌小游戏一眼就能看明白～' });
    } else {
      const pick = mismatched[Math.floor(Math.random() * mismatched.length)];
      setFeedback({
        ok: false,
        message: `把「${pick.label}」放到「${zoneLabel(pick.idealZone)}」会不会更好呢？试一下～`,
      });
    }
  }

  function reset() {
    setPlacements(emptyPlacements());
    setRecorded(false);
    setFeedback(null);
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-purple">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🧩 把下面 6 个「小侦探·记忆力挑战」游戏<b>页面零件</b>拖到你觉得合适的位置，右边会马上生成预览！摆完点<b>「📤 提交检查」</b>，AI 会给你一点小建议～
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* 左：零件区 + 位置区 */}
        <div className="space-y-3">
          <div className="kid-card space-y-2">
            <div className="text-sm font-bold">🧰 零件区（还没摆：{PARTS.length - placedCount} 个）</div>
            <div className="flex flex-wrap gap-2 min-h-[52px]">
              {pool
                .filter((p) => !placements[p.id])
                .map((p) => (
                  <div
                    key={p.id}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      startDrag(p.id, e.clientX, e.clientY);
                    }}
                    style={{ touchAction: 'none', opacity: dragging?.id === p.id ? 0.3 : 1 }}
                    className="kid-button-sm border-2 bg-white border-orange-200 cursor-grab active:cursor-grabbing select-none"
                  >
                    {p.emoji} {p.label}
                  </div>
                ))}
              {placedCount === PARTS.length && (
                <span className="text-xs text-emerald-600 font-bold self-center">零件都摆好啦，看看右边的预览吧！</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {zoneItems.map(({ zone, items }) => (
              <div
                key={zone.id}
                ref={(el) => {
                  zoneRefs.current[zone.id] = el;
                }}
                className="rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-3 min-h-[76px] space-y-2"
              >
                <div className="text-sm font-bold text-sky-700">
                  {zone.emoji} {zone.label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((p) => (
                    <div
                      key={p.id}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        startDrag(p.id, e.clientX, e.clientY);
                      }}
                      style={{ touchAction: 'none', opacity: dragging?.id === p.id ? 0.3 : 1 }}
                      className="kid-button-sm border-2 bg-white border-sky-200 cursor-grab active:cursor-grabbing select-none"
                    >
                      {p.emoji} {p.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右：实时页面预览（照实际摆放生成，不做对错判断） */}
        <div className="kid-card-sky space-y-3">
          <div className="text-sm font-bold">📱 我的页面预览</div>
          <p className="text-[11px] text-ink-soft">这是照你摆的样子生成的，摆法不同、看起来也会不一样～</p>
          <div className="mx-auto w-full max-w-[280px] rounded-[28px] border-4 border-slate-800 bg-white p-3 shadow-pop-sm min-h-[360px] space-y-4">
            {zoneItems.map(({ zone, items }) => (
              <div key={zone.id} className="min-h-[64px] rounded-xl border border-dashed border-slate-200 p-2 space-y-2">
                {items.length === 0 ? (
                  <div className="text-[11px] text-slate-300 text-center py-3">（{zone.label}还空着）</div>
                ) : (
                  items.map((p) => (
                    <div key={p.id}>
                      <MockItem part={p} />
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white border-2 border-sky-100 px-3 py-2 text-xs text-ink-soft leading-relaxed">
            💡 好布局三件事：重要内容大一点；常点按钮明显一点；相关内容放一起。
          </div>

          <div className="flex gap-2">
            <button onClick={submitDesign} className="kid-button-primary flex-1" disabled={placedCount === 0}>
              📤 提交检查
            </button>
            <button onClick={reset} className="kid-button-ghost">
              🔄 清空重摆
            </button>
          </div>
          {recorded && (
            <p className="text-xs text-emerald-600 font-bold">🎉 已经记录到你的成长手册啦！可以继续换一种摆法多试试。</p>
          )}
        </div>
      </div>

      {dragging && draggingPart && (
        <div
          className="fixed z-[9999] pointer-events-none kid-button-sm border-2 bg-white border-brand shadow-pop-sm"
          style={{ left: dragging.x - 40, top: dragging.y - 20 }}
        >
          {draggingPart.emoji} {draggingPart.label}
        </div>
      )}

      {feedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setFeedback(null)}
        >
          <div className="kid-card max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl">{feedback.ok ? '🏆' : '🕵️'}</div>
            <div className="font-extrabold text-lg mt-2">{feedback.ok ? '提交成功！' : 'AI 小建议'}</div>
            <p className="text-sm text-ink-soft leading-relaxed mt-2">{feedback.message}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setFeedback(null)} className="kid-button-primary flex-1">
                {feedback.ok ? '太好了！' : '我再试试看'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
