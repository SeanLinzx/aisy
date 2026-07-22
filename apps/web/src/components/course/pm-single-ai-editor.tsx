'use client';

import type { AiFlowNodeType, AiInputMode, PmSingleAiConfig } from '@/lib/pm-pipeline';
import { aiInputModeLabel } from '@/lib/ai-image-upload-detect';

const TYPE_OPTIONS: { id: AiFlowNodeType; label: string; emoji: string }[] = [
  { id: 'text', label: '生文 AI', emoji: '📝' },
  { id: 'image', label: '生图 AI', emoji: '🖼️' },
  { id: 'video', label: '生视频 AI', emoji: '🎬' },
];

const INPUT_MODE_OPTIONS: AiInputMode[] = ['text', 'image'];

export function PmSingleAiEditor({
  value,
  onChange,
}: {
  value: PmSingleAiConfig;
  onChange: (next: PmSingleAiConfig) => void;
}) {
  const inputMode: AiInputMode = value.inputMode === 'image' ? 'image' : 'text';

  function patch(partial: Partial<PmSingleAiConfig>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-soft leading-relaxed">
        这个小应用里只用<strong>一个 AI</strong>。选好类型与输入方式，写清楚它接收什么、产出什么。
      </p>
      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => patch({ type: opt.id })}
            className={`text-xs px-3 py-2 rounded-xl border-2 font-bold ${
              value.type === opt.id ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-orange-100 bg-white'
            }`}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-ink-soft">输入方式</div>
        <div className="flex flex-wrap gap-2">
          {INPUT_MODE_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => patch({ inputMode: mode })}
              className={`text-xs px-3 py-2 rounded-xl border-2 font-bold ${
                inputMode === mode ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-orange-100 bg-white'
              }`}
            >
              {mode === 'image' ? '🖼️' : '📝'} {aiInputModeLabel(value.type, mode)}
            </button>
          ))}
        </div>
        {inputMode === 'image' && (
          <p className="text-[11px] text-sky-700 font-semibold leading-relaxed">
            已选「{aiInputModeLabel(value.type, 'image')}」：生成小应用时会自动加入图片上传区，无需再手动勾选。
          </p>
        )}
      </div>
      <label className="block text-xs font-bold">
        AI 名称
        <input
          className="kid-input mt-1 w-full text-sm"
          value={value.label}
          onChange={(e) => patch({ label: e.target.value })}
          placeholder="例如：篮球照片美化师"
        />
      </label>
      <label className="block text-xs font-bold">
        输入说明（这个 AI 接收什么？）
        <textarea
          className="kid-textarea !min-h-[64px] text-sm mt-1"
          value={value.inputDesc}
          onChange={(e) => patch({ inputDesc: e.target.value })}
          placeholder={
            inputMode === 'image'
              ? '例如：用户上传的一张篮球照片'
              : value.type === 'text'
                ? '例如：一个英文单词'
                : '例如：一只在月球上跳舞的柯基'
          }
        />
      </label>
      <label className="block text-xs font-bold">
        输出说明（这个 AI 产出什么？）
        <textarea
          className="kid-textarea !min-h-[64px] text-sm mt-1"
          value={value.outputDesc}
          onChange={(e) => patch({ outputDesc: e.target.value })}
          placeholder="例如：一张更酷、加了特效的新照片"
        />
      </label>
      <label className="block text-xs font-bold">
        系统提示词（可选）
        <textarea
          className="kid-textarea !min-h-[56px] text-sm mt-1"
          value={value.systemPrompt || ''}
          onChange={(e) => patch({ systemPrompt: e.target.value })}
          placeholder="告诉 AI 用什么语气、风格来回答或生成…"
        />
      </label>

      <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-3 space-y-3">
        <p className="text-xs font-bold text-violet-800">
          📎 输入 / 输出案例<span className="font-normal text-violet-600">（选填，帮助 AI 准备更好的系统提示词）</span>
        </p>
        <label className="block text-xs font-bold text-ink-soft">
          输入案例
          <textarea
            className="kid-textarea !min-h-[56px] text-sm mt-1 bg-white"
            value={value.inputExample || ''}
            onChange={(e) => patch({ inputExample: e.target.value })}
            placeholder="例如：apple"
          />
        </label>
        <label className="block text-xs font-bold text-ink-soft">
          输出案例
          <textarea
            className="kid-textarea !min-h-[72px] text-sm mt-1 bg-white"
            value={value.outputExample || ''}
            onChange={(e) => patch({ outputExample: e.target.value })}
            placeholder="例如：小 A 摘 apple，红脸蛋像小太阳…"
          />
        </label>
      </div>
    </div>
  );
}
