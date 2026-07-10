'use client';
import { useEffect, useState } from 'react';

const TIPS = [
  'AI 正在开动它的大脑…',
  '正在一点一点把它做出来…',
  '灵感正在路上，请稍等…',
  '马上就好啦，再等一下下…',
  '正在认真创作中…',
];

/**
 * AI 等待进度条。AI 生成本身没有真实进度回传，这里用「平滑逼近」的方式
 * 让进度条一直往前走（接近 95% 后放慢），缓解等待焦虑。
 * 父组件在加载时渲染它、加载结束时卸载即可。
 */
export function AiProgress({
  label = 'AI 正在生成…',
  estimate,
  className = '',
}: {
  label?: string;
  /** 例如「平均每段约 3 分钟」 */
  estimate?: string;
  className?: string;
}) {
  const [p, setP] = useState(6);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setP((prev) => {
        const remaining = 96 - prev;
        if (remaining <= 0.4) return prev;
        const inc = Math.max(0.3, remaining * 0.05);
        return Math.min(96, prev + inc);
      });
    }, 280);
    const tipId = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 2600);
    return () => { clearInterval(id); clearInterval(tipId); };
  }, []);

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
