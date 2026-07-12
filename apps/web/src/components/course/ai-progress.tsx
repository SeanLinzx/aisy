'use client';
import { useEffect, useRef, useState } from 'react';

const TIPS = [
  'AI 正在开动它的大脑…',
  '正在一点一点把它做出来…',
  '灵感正在路上，请稍等…',
  '马上就好啦，再等一下下…',
  '正在认真创作中…',
];

/**
 * AI 等待进度条。AI 生成本身没有真实进度回传，这里按「预计耗时」用平滑曲线
 * 逼近 96%（越接近预计耗时增长越慢，超过预计耗时后仍会缓慢爬升），缓解等待焦虑。
 * 父组件在加载时渲染它、加载结束时卸载即可。
 */
export function AiProgress({
  label = 'AI 正在生成…',
  estimate,
  durationMs = 15_000,
  className = '',
}: {
  label?: string;
  /** 例如「平均每段约 3 分钟」，会在进度条旁展示 */
  estimate?: string;
  /** 预计整个生成大概需要多久（毫秒），进度条会按这个节奏走，而不是冲得很快 */
  durationMs?: number;
  className?: string;
}) {
  const [p, setP] = useState(4);
  const [tip, setTip] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now();
    // 到预计耗时时大约走到 90%，之后仍会非常缓慢地继续爬升，不会卡死不动
    const tau = durationMs / 2.4;
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const target = 96 * (1 - Math.exp(-elapsed / tau));
      setP((prev) => Math.max(prev, Math.min(96, target)));
    }, 250);
    const tipId = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 2600);
    return () => { clearInterval(id); clearInterval(tipId); };
  }, [durationMs]);

  return (
    <div className={`rounded-2xl border-2 border-orange-100 bg-white/80 p-3 ${className}`}>
      <div className="flex items-center justify-between text-xs font-bold text-ink-soft mb-1.5">
        <span className="flex items-center gap-2 flex-wrap">
          <span>⏳ {label}</span>
          {estimate && (
            <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              {estimate}
            </span>
          )}
        </span>
        <span>{Math.round(p)}%</span>
      </div>
      <div className="h-3 rounded-full bg-orange-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 transition-[width] duration-300 ease-out"
          style={{ width: `${p}%` }}
        />
      </div>
      <div className="text-[11px] text-ink-soft mt-1.5">{TIPS[tip]}</div>
    </div>
  );
}
