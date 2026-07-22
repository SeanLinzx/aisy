'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';

export interface FillBlankSpec {
  /** 对应 values / onChange 里的字段名 */
  key: string;
  /** 空白处没填内容时的提示字 */
  placeholder: string;
  /** 点一下就能直接填入这个空的候选词，孩子不想打字也能完成填空 */
  quickOptions?: string[];
  /** select = 只能从 quickOptions 里选（下拉填空）；默认 text 可自由输入 */
  input?: 'text' | 'select';
  /** form 布局下使用多行输入框，方便写更长的描述 */
  multiline?: boolean;
}

interface FillBlankSentenceProps {
  /** 固定文字片段，长度必须比 blanks 多 1（segments[i] 后面跟着 blanks[i] 这个空） */
  segments: string[];
  blanks: FillBlankSpec[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** inline = 句中填空；form = 每行独立输入框，更适合自由发挥 */
  layout?: 'inline' | 'form';
}

/** 把 segments/blanks/values 拼成一句完整的话，空着的部分用占位提示代替（用于摘要/prompt） */
export function renderFilledSentence(
  segments: string[],
  blanks: FillBlankSpec[],
  values: Record<string, string>,
  tx?: (s: string) => string,
): string {
  const t = tx ?? ((s: string) => s);
  return segments.reduce((acc, seg, i) => {
    const blank = blanks[i];
    const filled = blank ? values[blank.key]?.trim() || `（${t(blank.placeholder)}）` : '';
    return acc + t(seg) + filled;
  }, '');
}

/**
 * 「整段话填空」组件：把一句完整的话中间挖出几个空，孩子直接在空白处打字，
 * 或点一下候选词条填入，拼成一句完整、通顺的场景 / 布局 / 交互描述。
 */
const ADD_CUSTOM_VALUE = '__add_custom_option__';

export function FillBlankSentence({ segments, blanks, values, onChange, layout = 'inline' }: FillBlankSentenceProps) {
  const { tx } = useLanguage();
  const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({});
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  function optionsFor(key: string, base?: string[]): string[] {
    return [...(base || []), ...(customOptions[key] || [])];
  }

  function confirmAdd(key: string) {
    const text = draft.trim();
    setAddingKey(null);
    setDraft('');
    if (!text) return;
    setCustomOptions((prev) => {
      const list = prev[key] || [];
      if (list.includes(text)) return prev;
      return { ...prev, [key]: [...list, text] };
    });
    onChange(key, text);
  }

  function QuickOptionChips({ blank }: { blank: FillBlankSpec }) {
    const opts = optionsFor(blank.key, blank.quickOptions);
    if (!opts.length && !blank.quickOptions?.length) return null;
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-ink-soft shrink-0">{tx('💡 没想好？点一下参考：')}</span>
        {opts.map((opt) => {
          const selected = values[blank.key] === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(blank.key, opt)}
              className={`kid-button-sm border-2 ${
                selected
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-ink-soft border-orange-200 hover:border-orange-300'
              }`}
            >
              {selected && '✓ '}
              {tx(opt)}
            </button>
          );
        })}
        {addingKey === blank.key ? (
          <span className="inline-flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmAdd(blank.key);
                } else if (e.key === 'Escape') {
                  setAddingKey(null);
                  setDraft('');
                }
              }}
              placeholder={tx('写下你自己的想法')}
              className="rounded-xl border-2 border-brand/60 bg-orange-50/70 px-3 py-1.5 text-xs font-bold text-ink placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-brand transition w-40"
            />
            <button type="button" onClick={() => confirmAdd(blank.key)} className="kid-button-sm bg-brand text-white border-2 border-brand">
              ✓ {tx('加入')}
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingKey(null);
                setDraft('');
              }}
              className="kid-button-sm bg-white text-ink-soft border-2 border-orange-200"
            >
              {tx('取消')}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAddingKey(blank.key);
              setDraft('');
            }}
            className="kid-button-sm border-2 border-dashed border-orange-300 bg-white text-ink-soft hover:border-brand hover:text-brand"
          >
            ➕ {tx('自己写一个')}
          </button>
        )}
      </div>
    );
  }

  if (layout === 'form') {
    const preview = renderFilledSentence(segments, blanks, values, tx);
    return (
      <div className="space-y-4">
        {blanks.map((blank) => (
          <div key={blank.key} className="space-y-2">
            <label htmlFor={`blank-${blank.key}`} className="text-xs font-bold text-ink block">
              ✏️ {tx(blank.placeholder)}
            </label>
            {blank.multiline ? (
              <textarea
                id={`blank-${blank.key}`}
                className="kid-textarea !min-h-[72px] w-full text-sm leading-relaxed"
                value={values[blank.key] || ''}
                placeholder={`${tx('在这里写下')}${tx(blank.placeholder)}…`}
                onChange={(e) => onChange(blank.key, e.target.value)}
              />
            ) : (
              <input
                id={`blank-${blank.key}`}
                className="kid-input w-full !py-2.5 text-sm font-semibold"
                value={values[blank.key] || ''}
                placeholder={`${tx('在这里写下')}${tx(blank.placeholder)}…`}
                onChange={(e) => onChange(blank.key, e.target.value)}
              />
            )}
            <QuickOptionChips blank={blank} />
          </div>
        ))}
        <div className="rounded-xl bg-white/70 border-2 border-orange-100 px-3 py-3">
          <div className="text-[11px] font-bold text-ink-soft mb-1">{tx('📋 拼成的话')}</div>
          <p className="text-sm text-ink leading-relaxed break-words whitespace-normal">{preview}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[15px] sm:text-base leading-[2.5] text-ink">
        {segments.map((seg, i) => {
          const blank = blanks[i];
          return (
            <span key={i}>
              {tx(seg)}
              {blank && (
                blank.input === 'select' && blank.quickOptions?.length ? (
                  addingKey === blank.key ? (
                    <span className="inline-flex items-center gap-1 mx-1 align-baseline">
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            confirmAdd(blank.key);
                          } else if (e.key === 'Escape') {
                            setAddingKey(null);
                            setDraft('');
                          }
                        }}
                        placeholder={tx('写下你自己的想法')}
                        className="inline-block rounded-lg border-b-[3px] border-dashed border-brand/60 bg-orange-50/70 px-2 py-0.5 text-sm font-bold text-ink placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-brand focus:bg-orange-50 transition w-32"
                      />
                      <button
                        type="button"
                        onClick={() => confirmAdd(blank.key)}
                        className="kid-button-sm !px-2 !py-0.5 bg-brand text-white border-2 border-brand"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingKey(null);
                          setDraft('');
                        }}
                        className="kid-button-sm !px-2 !py-0.5 bg-white text-ink-soft border-2 border-orange-200"
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    <select
                      className="inline-block mx-1 align-baseline rounded-lg border-b-[3px] border-dashed border-brand/60 bg-orange-50/70 px-2 py-1 text-center font-bold text-ink focus:outline-none focus:border-brand focus:bg-orange-50 transition max-w-[min(100%,14rem)]"
                      value={values[blank.key] || ''}
                      onChange={(e) => {
                        if (e.target.value === ADD_CUSTOM_VALUE) {
                          setAddingKey(blank.key);
                          setDraft('');
                        } else {
                          onChange(blank.key, e.target.value);
                        }
                      }}
                    >
                      <option value="">{tx(blank.placeholder)}</option>
                      {optionsFor(blank.key, blank.quickOptions).map((opt) => (
                        <option key={opt} value={opt}>
                          {tx(opt)}
                        </option>
                      ))}
                      <option value={ADD_CUSTOM_VALUE}>{tx('➕ 自己写一个…')}</option>
                    </select>
                  )
                ) : (
                  <input
                    className="inline-block mx-1 align-baseline rounded-lg border-b-[3px] border-dashed border-brand/60 bg-orange-50/70 px-2 py-0.5 text-center font-bold text-ink placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-brand focus:bg-orange-50 transition"
                    style={{ width: `${Math.max(values[blank.key]?.length || 0, blank.placeholder.length, 4) + 2}ch` }}
                    value={values[blank.key] || ''}
                    placeholder={tx(blank.placeholder)}
                    onChange={(e) => onChange(blank.key, e.target.value)}
                  />
                )
              )}
            </span>
          );
        })}
      </p>

      {blanks.some((b) => (b.quickOptions?.length || customOptions[b.key]?.length)) && (
        <div className="space-y-1.5">
          {blanks.map(
            (b) =>
              (b.quickOptions?.length || customOptions[b.key]?.length) &&
              b.input !== 'select' && (
                <QuickOptionChips key={b.key} blank={b} />
              ),
          )}
        </div>
      )}
    </div>
  );
}
