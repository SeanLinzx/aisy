'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { HtmlPreview, type PickedElement } from './html-preview';
import { AiProgress } from './ai-progress';

/**
 * 统一的「左预览 + 右对话框」网页编辑面板：
 * - 左边可以在「试玩」和「点选加入」两种模式间切换；点选模式下点击页面里的块会加到右边的对话框。
 * - 右边写清楚想怎么改，点「应用修改」交给 AI（选中的块会作为额外上下文一起发给 AI）。
 */
export function WebStudioPanel({
  html,
  css,
  js,
  previewHeight = 560,
  instruction,
  onInstructionChange,
  pickedBlocks,
  onAddBlock,
  onRemoveBlock,
  onClearBlocks,
  onApply,
  busy,
  applyLabel = '✨ 应用修改',
  busyLabel = '✨ AI 正在按你的要求修改…',
  placeholder = '描述你想怎么改…',
  error,
  panelTitle = '🔄 预览与对话修改',
  hint = '默认是「试玩」模式，可以像真实网页一样点击体验。想让 AI 改哪个部分，就切到「点选加入」，点一下就会加到右边的对话框里；不点选也可以，直接描述想怎么改整页。',
  resetSignal,
  extra,
}: {
  html: string;
  css?: string;
  js?: string;
  previewHeight?: number;
  instruction: string;
  onInstructionChange: (value: string) => void;
  pickedBlocks: PickedElement[];
  onAddBlock: (el: PickedElement) => void;
  onRemoveBlock: (index: number) => void;
  onClearBlocks: () => void;
  onApply: () => void;
  busy: boolean;
  applyLabel?: string;
  busyLabel?: string;
  placeholder?: string;
  error?: string | null;
  panelTitle?: string;
  hint?: string | null;
  /** 变化时把左侧预览重置回「试玩」模式（例如每次应用修改成功后） */
  resetSignal?: number | string;
  extra?: ReactNode;
}) {
  const [previewMode, setPreviewMode] = useState<'play' | 'pick'>('play');
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    setPreviewMode('play');
    setPreviewKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  return (
    <div className="grid lg:grid-cols-[1.25fr_360px] xl:grid-cols-[1.4fr_400px] gap-4 items-start">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold">{panelTitle}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPreviewMode('play');
                setPreviewKey((k) => k + 1);
              }}
              className={`kid-button-sm border-2 ${
                previewMode === 'play' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-ink-soft border-emerald-200'
              }`}
            >
              👆 试玩
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewMode('pick');
                setPreviewKey((k) => k + 1);
              }}
              className={`kid-button-sm border-2 ${
                previewMode === 'pick' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-ink-soft border-violet-200'
              }`}
            >
              🎯 点选加入
            </button>
          </div>
        </div>
        {hint && <p className="text-xs text-ink-soft leading-relaxed">{hint}</p>}
        <HtmlPreview
          key={`${previewKey}-${previewMode}`}
          html={html}
          css={css}
          js={js}
          height={previewHeight}
          interactive
          pickMode={previewMode === 'pick'}
          onPick={previewMode === 'pick' ? onAddBlock : undefined}
        />
        <p className="text-xs text-center font-semibold text-ink-soft">
          {previewMode === 'play' ? '↑ 可以正常点击、试玩这个页面' : '↑ 鼠标移上去会高亮，点一下就能把这部分加到右边的对话框'}
        </p>
      </div>

      <div className="kid-card-purple space-y-3 lg:sticky lg:top-4">
        <div className="text-sm font-bold">✏️ 告诉 AI 要怎么改</div>
        {pickedBlocks.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pickedBlocks.map((b, i) => (
              <span
                key={`${b.hint}-${i}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 bg-violet-50 border-2 border-violet-100 rounded-full px-2.5 py-1"
              >
                🔖 {b.hint}
                <button
                  type="button"
                  onClick={() => onRemoveBlock(i)}
                  className="text-violet-400 hover:text-violet-700"
                  aria-label="移除这个块"
                >
                  ✕
                </button>
              </span>
            ))}
            <button type="button" onClick={onClearBlocks} className="text-xs font-bold text-ink-soft hover:text-rose-600 underline">
              清空选中
            </button>
          </div>
        )}
        <textarea
          className="kid-textarea !min-h-[96px]"
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          placeholder={placeholder}
        />
        <button onClick={onApply} disabled={busy || !instruction.trim()} className="kid-button-primary w-full">
          {busy ? busyLabel : applyLabel}
        </button>
        {busy && <AiProgress label={busyLabel} estimate="预计约 1 分钟" durationMs={60_000} />}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
        {extra}
      </div>
    </div>
  );
}
