'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface ChoiceQuestionSpec {
  /** 对应 values / onChange 里的字段名 */
  key: string;
  question: string;
  options: ChoiceOption[];
}

/** 单选「选择题」：点一个选项按钮即可作答，也可以点「自己写一个」新增一个选项。 */
export function ChoiceQuestionGroup({
  spec,
  value,
  onChange,
}: {
  spec: ChoiceQuestionSpec;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t, tx } = useLanguage();
  const [customOptions, setCustomOptions] = useState<ChoiceOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const allOptions = [...spec.options, ...customOptions];

  function confirmAdd() {
    const text = draft.trim();
    setAdding(false);
    setDraft('');
    if (!text) return;
    if (!allOptions.some((o) => o.value === text)) {
      setCustomOptions((prev) => [...prev, { value: text, label: text }]);
    }
    onChange(text);
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-bold text-ink">{tx(spec.question)}</div>
      <div className="flex flex-wrap gap-2 items-center">
        {allOptions.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`kid-button-sm border-2 ${
                selected
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-ink-soft border-orange-200 hover:border-orange-300'
              }`}
            >
              {selected && '✓ '}
              {tx(opt.label)}
            </button>
          );
        })}

        {!adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="kid-button-sm border-2 border-dashed border-orange-300 bg-white text-ink-soft hover:border-brand hover:text-brand"
          >
            ➕ {t('choice.addCustom', '自己写一个')}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmAdd();
                } else if (e.key === 'Escape') {
                  setAdding(false);
                  setDraft('');
                }
              }}
              placeholder={t('choice.customPlaceholder', '写下你自己的想法')}
              className="rounded-xl border-2 border-brand/60 bg-orange-50/70 px-3 py-1.5 text-xs font-bold text-ink placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-brand transition w-40"
            />
            <button type="button" onClick={confirmAdd} className="kid-button-sm bg-brand text-white border-2 border-brand">
              ✓ {t('choice.add', '加入')}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraft('');
              }}
              className="kid-button-sm bg-white text-ink-soft border-2 border-orange-200"
            >
              {t('common.cancel', '取消')}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
