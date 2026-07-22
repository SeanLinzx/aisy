'use client';

import { type ReactNode } from 'react';
import { AiProgress } from '@/components/course/ai-progress';
import {
  TRIGGER_OPTIONS,
  WEB_RESULT_HINTS,
  interactionRuleSentence,
  type InteractionLayerSpec,
} from '@/lib/web-interaction-prompt';

function OptionChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`kid-button-sm border-2 text-left ${
        selected
          ? 'bg-brand text-white border-brand'
          : 'bg-white text-ink-soft border-orange-200 hover:border-orange-300'
      }`}
    >
      {selected && '✓ '}
      {children}
    </button>
  );
}

export interface InteractionFormState {
  target: string;
  trigger: string;
  result: string;
}

interface WebInteractionBuilderProps {
  form: InteractionFormState;
  layers: InteractionLayerSpec[];
  customTargets: string[];
  addingTarget: boolean;
  targetDraft: string;
  busy: boolean;
  error: string | null;
  onFieldChange: (key: keyof InteractionFormState, value: string) => void;
  onConfirmCustomTarget: () => void;
  onStartAddTarget: () => void;
  onCancelAddTarget: () => void;
  onTargetDraftChange: (value: string) => void;
  onAddInteraction: () => void;
}

export function WebInteractionBuilder({
  form,
  layers,
  customTargets,
  addingTarget,
  targetDraft,
  busy,
  error,
  onFieldChange,
  onConfirmCustomTarget,
  onStartAddTarget,
  onCancelAddTarget,
  onTargetDraftChange,
  onAddInteraction,
}: WebInteractionBuilderProps) {
  const targetOptions = customTargets.filter((t) => !form.target || t !== form.target);
  const allTargets = form.target
    ? [form.target, ...targetOptions.filter((t) => t !== form.target)]
    : customTargets;

  const currentRule =
    form.target.trim() && form.trigger.trim() && form.result.trim()
      ? interactionRuleSentence({
          target: form.target.trim(),
          trigger: form.trigger.trim() as InteractionLayerSpec['trigger'],
          result: form.result.trim(),
        })
      : '选好点哪里、什么操作、出现什么效果后，这里会显示完整规则。';

  return (
    <div className="space-y-3">
      <div className="text-sm font-bold">👆 用 AI 给页面加交互</div>
      <p className="text-xs text-ink-soft leading-relaxed">
        在右侧预览点「🎯 点选目标」选中页面区域，再在这里说明交互规则，AI 会把交互写进页面。
      </p>

      <div className="rounded-xl bg-orange-50/80 border-2 border-orange-100 p-3 space-y-2">
        <div className="text-xs font-bold text-orange-800">① 点哪里</div>
        {addingTarget ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              autoFocus
              value={targetDraft}
              onChange={(e) => onTargetDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onConfirmCustomTarget();
                } else if (e.key === 'Escape') onCancelAddTarget();
              }}
              placeholder="写下你想点的区域"
              className="kid-input flex-1 min-w-[160px] !py-2 text-sm"
            />
            <button type="button" onClick={onConfirmCustomTarget} className="kid-button-sm bg-brand text-white border-brand">
              ✓
            </button>
            <button type="button" onClick={onCancelAddTarget} className="kid-button-sm bg-white text-ink-soft border-orange-200">
              ✕
            </button>
          </div>
        ) : (
          <input
            className="kid-input w-full !py-2.5 text-sm font-semibold"
            value={form.target}
            placeholder="点右边预览选区域，或在这里输入…"
            onChange={(e) => onFieldChange('target', e.target.value)}
          />
        )}
        {!addingTarget && (
          <button type="button" onClick={onStartAddTarget} className="text-xs font-bold text-brand underline">
            ➕ 自己写一个目标
          </button>
        )}
        {allTargets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTargets.map((opt) => (
              <OptionChip key={opt} selected={form.target === opt} onClick={() => onFieldChange('target', opt)}>
                {opt}
              </OptionChip>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-sky-50/80 border-2 border-sky-100 p-3 space-y-2">
        <div className="text-xs font-bold text-sky-800">② 什么操作</div>
        <select
          className="kid-input w-full !py-2 text-sm font-bold"
          value={form.trigger}
          onChange={(e) => onFieldChange('trigger', e.target.value)}
        >
          <option value="">选择鼠标操作…</option>
          {TRIGGER_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {TRIGGER_OPTIONS.map((opt) => (
            <OptionChip key={opt} selected={form.trigger === opt} onClick={() => onFieldChange('trigger', opt)}>
              {opt}
            </OptionChip>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-violet-50/80 border-2 border-violet-100 p-3 space-y-2">
        <div className="text-xs font-bold text-violet-800">③ 会出现什么效果</div>
        <textarea
          className="kid-textarea !min-h-[88px] w-full text-sm leading-relaxed"
          value={form.result}
          onChange={(e) => onFieldChange('result', e.target.value)}
          placeholder="自由写下点击后会发生什么，比如：图片会放大并显示 caption…"
        />
        <div className="flex flex-wrap gap-1.5">
          {WEB_RESULT_HINTS.map((opt) => (
            <OptionChip key={opt} selected={form.result === opt} onClick={() => onFieldChange('result', opt)}>
              {opt}
            </OptionChip>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-violet-100/60 border-2 border-violet-200 px-3 py-3">
        <div className="text-xs font-bold text-violet-700 mb-1.5">🧩 这条规则</div>
        <p className="text-sm text-violet-900 leading-relaxed break-words whitespace-normal">{currentRule}</p>
      </div>

      <button type="button" onClick={onAddInteraction} disabled={busy} className="kid-button-primary w-full">
        {busy ? '✨ AI 正在加交互…' : layers.length > 0 ? '➕ 再叠加一条交互' : '✨ 添加第一条交互'}
      </button>

      {busy && (
        <AiProgress
          label={layers.length > 0 ? 'AI 正在叠加新交互…' : 'AI 正在把交互加到页面上…'}
          estimate="预计约 1 分钟"
          durationMs={60_000}
        />
      )}
      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
    </div>
  );
}
