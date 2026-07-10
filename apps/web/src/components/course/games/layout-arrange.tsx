'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { reportGrowth } from '@/lib/growth-report';

interface Part {
  id: string;
  emoji: string;
  label: string;
}

interface Zone {
  id: string;
  emoji: string;
  label: string;
}

const PARTS: Part[] = [
  { id: 'title', emoji: '🏷️', label: '标题' },
  { id: 'avatar', emoji: '🕵️', label: '侦探头像' },
  { id: 'list', emoji: '📋', label: '排行榜/列表' },
  { id: 'score', emoji: '⭐', label: '分数' },
  { id: 'caption', emoji: '📝', label: '说明文字' },
  { id: 'button', emoji: '🔘', label: '按钮' },
  { id: 'result', emoji: '💬', label: '结果提示' },
];

// 位置区（不再暗示"正确答案"，孩子自己决定摆哪儿）
const ZONES: Zone[] = [
  { id: 'top', emoji: '⬆️', label: '最上面' },
  { id: 'middle', emoji: '➡️', label: '中间' },
  { id: 'bottom', emoji: '⬇️', label: '最下面' },
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
      return <div className="text-lg font-extrabold text-center">🕵️ 侦探排行榜</div>;
    case 'avatar':
      return (
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-orange-200 flex items-center justify-center text-sm">🕵️</span>
          <span className="text-sm font-bold">小侦探</span>
        </div>
      );
    case 'list':
      return (
        <div className="text-sm space-y-1">
          <div>🥇 小红</div>
          <div>🥈 小明</div>
          <div>🥉 小刚</div>
        </div>
      );
    case 'score':
      return (
        <span className="inline-block bg-amber-100 text-amber-700 font-bold text-xs px-2 py-1 rounded-full">
          ⭐ 98 分
        </span>
      );
    case 'caption':
      return <div className="text-xs text-slate-400">这是本周表现最好的小侦探～</div>;
    case 'button':
      return (
        <button type="button" className="bg-brand text-white font-bold text-xs px-4 py-2 rounded-full">
          立即抽签 🎲
        </button>
      );
    case 'result':
      return (
        <div className="inline-block bg-white border-2 border-violet-200 text-violet-700 text-xs font-bold rounded-2xl px-3 py-1.5 shadow">
          💬 恭喜被选中啦！
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

  function recordDesign() {
    setRecorded(true);
    reportGrowth({
      kind: 'game',
      gameSlug: 'layout-arrange',
      title: '🧱 摆一摆页面布局',
      summary: `摆了一次页面布局：已摆放 ${placedCount}/${PARTS.length} 个零件`,
      detail: { placements },
    });
  }

  function reset() {
    setPlacements(emptyPlacements());
    setRecorded(false);
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-purple">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🧩 把下面的<b>页面零件</b>拖到你觉得合适的位置，右边会马上生成你的页面预览！怎么摆没有唯一答案，摆完看看效果，觉得不满意就再摆一次～
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
            <button onClick={recordDesign} className="kid-button-primary flex-1" disabled={placedCount === 0}>
              {recorded ? '✅ 已记录！' : '✅ 记录我的设计'}
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
    </div>
  );
}
