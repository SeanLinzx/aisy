'use client';

import { useMemo, useState } from 'react';
import { parseHtmlBlocks, reorderHtmlBlocks, type LayoutBlock } from '@/lib/parse-html-blocks';

interface LayoutBoardProps {
  html: string;
  onHtmlChange: (html: string) => void;
}

export function LayoutBoard({ html, onHtmlChange }: LayoutBoardProps) {
  const parsed = useMemo(() => parseHtmlBlocks(html), [html]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }

    const ids = parsed.blocks.map((b) => b.id);
    const nextIds = [...ids];
    const [moved] = nextIds.splice(dragIndex, 1);
    nextIds.splice(targetIndex, 0, moved);

    onHtmlChange(reorderHtmlBlocks(html, nextIds));
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="kid-card !p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-slate-600">🤖 AI 布局板</div>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            自动识别页面主要块，拖拽卡片调整顺序，HTML 与预览会同步更新
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
          {parsed.blocks.length} 块
        </span>
      </div>

      <div className="text-xs text-slate-500 bg-orange-50/80 border border-orange-100 rounded-xl px-3 py-2 leading-relaxed">
        {parsed.message}
      </div>

      {parsed.blocks.length > 0 && (
        <div className="space-y-2">
          {parsed.blocks.map((block, index) => (
            <BlockCard
              key={`${block.id}-${index}`}
              block={block}
              index={index}
              dragging={dragIndex === index}
              dragOver={overIndex === index && dragIndex !== index}
              reorderable={parsed.reorderable}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDrop={() => handleDrop(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockCard({
  block,
  index,
  dragging,
  dragOver,
  reorderable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  block: LayoutBlock;
  index: number;
  dragging: boolean;
  dragOver: boolean;
  reorderable: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  return (
    <div
      draggable={reorderable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        reorderable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${
        dragging
          ? 'opacity-40 border-dashed border-brand bg-orange-50'
          : dragOver
            ? 'border-brand bg-brand/5 shadow-sm scale-[1.01]'
            : 'border-orange-100 bg-white hover:bg-orange-50/60'
      }`}
    >
      <div className="flex flex-col items-center shrink-0 w-6 text-slate-300 select-none">
        <span className="text-[10px] font-bold leading-none">{index + 1}</span>
        {reorderable && <span className="text-base leading-none mt-0.5">⠿</span>}
      </div>
      <div className="text-xl shrink-0">{block.emoji}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-ink truncate">{block.label}</div>
        <div className="text-[11px] text-slate-400 truncate">{block.preview}</div>
      </div>
      <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
        &lt;{block.tag}&gt;
      </span>
    </div>
  );
}
