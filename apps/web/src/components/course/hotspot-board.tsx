'use client';
import { useRef, useState, type ReactNode } from 'react';

export interface Region {
  id: string;
  /** 百分比坐标 (0-100)，相对图片左上角 */
  x: number;
  y: number;
  /** 百分比宽高 (0-100)，点状热点可不传 */
  w?: number;
  h?: number;
}

export interface DrawnRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 通用图片热点板：
 * - 预设 regions：可点击的热点（找 AI / 找不同 / 配音区域），通过 renderRegion 自定义外观。
 * - allowDraw：允许用户在图片上拖拽框选一个新区域（角色配音）。
 */
export function HotspotBoard({
  src,
  alt = '',
  regions = [],
  onRegionClick,
  renderRegion,
  allowDraw = false,
  drawnRects = [],
  onDraw,
  renderDrawn,
  className = '',
}: {
  src: string;
  alt?: string;
  regions?: Region[];
  onRegionClick?: (id: string) => void;
  renderRegion?: (region: Region) => ReactNode;
  allowDraw?: boolean;
  drawnRects?: DrawnRect[];
  onDraw?: (rect: { x: number; y: number; w: number; h: number }) => void;
  renderDrawn?: (rect: DrawnRect) => ReactNode;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragNow, setDragNow] = useState<{ x: number; y: number } | null>(null);

  function pct(e: React.MouseEvent) {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }

  function handleDown(e: React.MouseEvent) {
    if (!allowDraw) return;
    setDragStart(pct(e));
    setDragNow(pct(e));
  }
  function handleMove(e: React.MouseEvent) {
    if (!allowDraw || !dragStart) return;
    setDragNow(pct(e));
  }
  function handleUp() {
    if (!allowDraw || !dragStart || !dragNow) {
      setDragStart(null);
      setDragNow(null);
      return;
    }
    const x = Math.min(dragStart.x, dragNow.x);
    const y = Math.min(dragStart.y, dragNow.y);
    const w = Math.abs(dragNow.x - dragStart.x);
    const h = Math.abs(dragNow.y - dragStart.y);
    if (w > 3 && h > 3) onDraw?.({ x, y, w, h });
    setDragStart(null);
    setDragNow(null);
  }

  const liveRect =
    dragStart && dragNow
      ? {
          x: Math.min(dragStart.x, dragNow.x),
          y: Math.min(dragStart.y, dragNow.y),
          w: Math.abs(dragNow.x - dragStart.x),
          h: Math.abs(dragNow.y - dragStart.y),
        }
      : null;

  return (
    <div
      ref={wrapRef}
      className={`relative select-none overflow-hidden rounded-2xl border-2 border-orange-100 bg-slate-100 ${allowDraw ? 'cursor-crosshair' : ''} ${className}`}
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full select-none" draggable={false} />

      {regions.map((r) => {
        const isPoint = r.w == null || r.h == null;
        return (
          <button
            key={r.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRegionClick?.(r.id);
            }}
            className="absolute"
            style={
              isPoint
                ? { left: `${r.x}%`, top: `${r.y}%`, transform: 'translate(-50%, -50%)' }
                : { left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }
            }
          >
            {renderRegion ? renderRegion(r) : <span className="block w-6 h-6 rounded-full bg-white/70 border-2 border-brand" />}
          </button>
        );
      })}

      {drawnRects.map((r) => (
        <div
          key={r.id}
          className="absolute"
          style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%` }}
        >
          {renderDrawn ? renderDrawn(r) : <div className="w-full h-full rounded-lg border-2 border-emerald-500 bg-emerald-300/25" />}
        </div>
      ))}

      {liveRect && (
        <div
          className="absolute pointer-events-none rounded-lg border-2 border-dashed border-emerald-600 bg-emerald-300/20"
          style={{ left: `${liveRect.x}%`, top: `${liveRect.y}%`, width: `${liveRect.w}%`, height: `${liveRect.h}%` }}
        />
      )}
    </div>
  );
}
