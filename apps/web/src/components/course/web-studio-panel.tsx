'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { PublishedPageLink } from '@/components/published-page-link';
import { HtmlPreview, type PickedElement } from './html-preview';
import { AiProgress } from './ai-progress';
import { WEB_ITERATION_PLACEHOLDER, WEB_ITERATION_UI_HINT } from '@/lib/web-iteration-prompt';
import { AI_GENERATE_WEB_PROGRESS_ESTIMATE, AI_GENERATE_WEB_PROGRESS_MS } from '@/lib/ai-generate-timeouts';
import { downloadWebHtml } from '@/lib/export-web-html';

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
  placeholder = WEB_ITERATION_PLACEHOLDER,
  error,
  panelTitle = '🔄 预览与对话修改',
  hint = '默认是「试玩」模式，可以像真实网页一样点击体验。想让 AI 改哪个部分，就切到「点选加入」，点一下就会加到右边的对话框里；不点选也可以，直接描述想怎么改整页。',
  resetSignal,
  extra,
  versionTree,
  /** 插在右侧栏顶部（版本树之上），用于素材管理等非 AI 操作 */
  sidebarBefore,
  dialogTitle = '✏️ 告诉 AI 要怎么改',
  dialogHint,
  publishHref,
  publishLabel = '打开页面',
  onSaveCurrentVersion,
  saveVersionBusy = false,
  saveVersionLabel = '💾 保存当前版本',
  exportHtml,
  exportFilename = 'page',
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
  /** 版本树（回溯 + 分支），显示在右侧对话栏顶部 */
  versionTree?: ReactNode;
  sidebarBefore?: ReactNode;
  dialogTitle?: string;
  dialogHint?: string | null;
  /** 发布页链接，显示在版本树下方 */
  publishHref?: string | null;
  publishLabel?: string;
  /** 手动保存当前预览为新版本（不调用 AI） */
  onSaveCurrentVersion?: () => void;
  saveVersionBusy?: boolean;
  saveVersionLabel?: string;
  /** 导出用完整 HTML（单文件） */
  exportHtml?: string | null;
  exportFilename?: string;
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
        {sidebarBefore}
        {versionTree}
        {(onSaveCurrentVersion || publishHref || exportHtml) && (
          <div className="flex flex-col gap-2 pb-1 border-b border-violet-100">
            {onSaveCurrentVersion && (
              <button
                type="button"
                onClick={onSaveCurrentVersion}
                disabled={busy || saveVersionBusy}
                className="kid-button-ghost w-full !py-2.5 text-sm font-bold"
              >
                {saveVersionBusy ? '保存中…' : saveVersionLabel}
              </button>
            )}
            {publishHref && (
              <PublishedPageLink href={publishHref} className="kid-button-primary w-full text-center !py-2.5 block text-sm font-bold">
                🌐 {publishLabel}
              </PublishedPageLink>
            )}
            {exportHtml && (
              <button
                type="button"
                disabled={busy}
                onClick={() => downloadWebHtml(exportHtml, exportFilename)}
                className="text-xs font-bold text-violet-700 hover:text-violet-900 underline text-left px-1"
              >
                ⬇️ 导出 HTML
              </button>
            )}
          </div>
        )}
        <div className="text-sm font-bold">{dialogTitle}</div>
        <p className="text-[11px] text-violet-700/90 font-semibold leading-relaxed -mt-1">
          💡 {dialogHint ?? WEB_ITERATION_UI_HINT}
        </p>
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
        {busy && (
          <AiProgress label={busyLabel} estimate={AI_GENERATE_WEB_PROGRESS_ESTIMATE} durationMs={AI_GENERATE_WEB_PROGRESS_MS} />
        )}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
        {extra}
      </div>
    </div>
  );
}
