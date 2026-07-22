'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiAuth } from '@/lib/api';
import { useLanguage } from '@/contexts/language-context';
import {
  canAddCustomKeyword,
  emptyCustomKeywords,
  loadCustomKeywords,
  saveCustomKeywords,
  type CustomKeywordsByCategory,
  type KeywordCategory,
} from '@/lib/custom-keywords';
import {
  KEYWORD_CATEGORIES,
  buildPromptFromKeywords,
  emptyKeywordSelection,
  getCategoryLabel,
  isPresetKeyword,
  normalizeKeywordSelection,
  normalizeKeywordToken,
  resolveKeywordWord,
  type KeywordSelection,
} from '@/lib/keyword-presets';

export type { KeywordSelection } from '@/lib/keyword-presets';
export { buildPromptFromKeywords, emptyKeywordSelection as emptySelection };

function CategoryCustomAdd({
  category,
  presetIds,
  customWords,
  allCustomWords,
  onAdd,
  onRemove,
}: {
  category: (typeof KEYWORD_CATEGORIES)[number];
  presetIds: string[];
  customWords: string[];
  allCustomWords: CustomKeywordsByCategory;
  onAdd: (word: string) => void;
  onRemove: (word: string) => void;
}) {
  const { tx, locale } = useLanguage();
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const presetLabels = presetIds.map((id) => resolveKeywordWord(id, locale));

  function submit() {
    const next = canAddCustomKeyword(category.key, draft, allCustomWords, presetLabels);
    if (!next) {
      setHint(tx('这个词已经有了，或太长了，请换一个试试～'));
      return;
    }
    onAdd(next);
    setDraft('');
    setHint(null);
  }

  return (
    <div className="mt-2 space-y-2">
      {customWords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customWords.map((word) => (
            <span key={word} className="inline-flex items-center gap-1">
              <span className="text-[10px] font-bold text-amber-600">{tx('我的')}</span>
              <button
                type="button"
                onClick={() => onRemove(word)}
                className={`prompt-chip text-xs font-bold px-2.5 py-1.5 rounded-xl border-2 transition active:scale-95 ${category.customColor}`}
                title={tx('点击移除这个自定义词')}
              >
                {word} ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="kid-input !py-1.5 !px-2.5 text-xs max-w-[160px]"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setHint(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={tx('添加我的词…')}
          maxLength={16}
        />
        <button type="button" onClick={submit} className="kid-button-sm bg-white border-amber-200 text-amber-700 text-xs">
          {tx('➕ 加入')}
        </button>
      </div>
      <p className="text-[10px] text-ink-soft">{tx('自定义词只保存在本账号的这台设备上，不会同步给其他同学。')}</p>
      {hint && <p className="text-[10px] text-rose-600">{tx(hint)}</p>}
    </div>
  );
}

export function KeywordPromptPreview({
  selection,
  prompt,
}: {
  selection: KeywordSelection;
  prompt: string;
}) {
  const { tx, locale } = useLanguage();
  const normalized = useMemo(() => normalizeKeywordSelection(selection), [selection]);
  const hasSelection = Object.values(normalized).some((arr) => arr.length > 0);
  const built = prompt.trim() || buildPromptFromKeywords(normalized, locale);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
      <div className="text-sm font-bold text-ink-soft flex items-center gap-1.5">
        <span>📝</span> {tx('提示词总结')}
      </div>
      {hasSelection ? (
        <>
          {KEYWORD_CATEGORIES.map((cat) => {
            const selected = normalized[cat.key];
            if (selected.length === 0) return null;
            return (
              <div key={cat.key}>
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <span>{cat.emoji}</span> {getCategoryLabel(cat, locale)}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.map((token) => (
                    <span
                      key={token}
                      className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/80 border border-amber-200 text-amber-800"
                    >
                      {resolveKeywordWord(token, locale)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="border-t border-amber-200 pt-3">
            <div className="text-xs font-semibold text-slate-500 mb-1.5">{tx('完整提示词')}</div>
            <p className="text-sm font-medium text-ink leading-relaxed">{built}</p>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400 leading-relaxed">{tx('点选左边的关键词，这里会显示拼好的提示词～')}</p>
      )}
    </div>
  );
}

export function PromptKeywordPicker({
  selection,
  onChange,
  showInlinePreview = true,
}: {
  selection: KeywordSelection;
  onChange: (sel: KeywordSelection, prompt: string) => void;
  showInlinePreview?: boolean;
}) {
  const { tx, locale } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);
  const [customWords, setCustomWords] = useState<CustomKeywordsByCategory>(() => emptyCustomKeywords());

  useEffect(() => {
    let alive = true;
    apiAuth.me()
      .then((me) => {
        if (!alive) return;
        const id = me?.id || null;
        setUserId(id);
        setCustomWords(loadCustomKeywords(id));
      })
      .catch(() => {
        if (alive) setCustomWords(loadCustomKeywords(null));
      });
    return () => {
      alive = false;
    };
  }, []);

  const normalizedSelection = useMemo(() => normalizeKeywordSelection(selection), [selection]);

  const wordsByCategory = useMemo(() => {
    const map = {} as Record<KeywordCategory, string[]>;
    for (const cat of KEYWORD_CATEGORIES) {
      const presetIds = cat.presets.map((p) => p.id);
      const merged = [...presetIds];
      for (const word of customWords[cat.key]) {
        if (!merged.includes(word)) merged.push(word);
      }
      map[cat.key] = merged;
    }
    return map;
  }, [customWords]);

  function emitChange(next: KeywordSelection) {
    const normalized = normalizeKeywordSelection(next);
    onChange(normalized, buildPromptFromKeywords(normalized, locale));
  }

  function persistCustom(next: CustomKeywordsByCategory) {
    setCustomWords(next);
    saveCustomKeywords(userId, next);
  }

  function toggle(category: KeywordCategory, token: string) {
    const id = normalizeKeywordToken(token);
    const current = normalizedSelection[category];
    const nextList = current.includes(id)
      ? current.filter((w) => w !== id)
      : [...current, id];
    emitChange({ ...normalizedSelection, [category]: nextList });
  }

  function addCustomWord(category: KeywordCategory, word: string) {
    const next = {
      ...customWords,
      [category]: [...customWords[category], word],
    };
    persistCustom(next);
    if (!normalizedSelection[category].includes(word)) {
      emitChange({ ...normalizedSelection, [category]: [...normalizedSelection[category], word] });
    }
  }

  function removeCustomWord(category: KeywordCategory, word: string) {
    const next = {
      ...customWords,
      [category]: customWords[category].filter((w) => w !== word),
    };
    persistCustom(next);
    if (normalizedSelection[category].includes(word)) {
      emitChange({
        ...normalizedSelection,
        [category]: normalizedSelection[category].filter((w) => w !== word),
      });
    }
  }

  function clearAll() {
    emitChange(emptyKeywordSelection());
  }

  const hasSelection = Object.values(normalizedSelection).some((arr) => arr.length > 0);

  useEffect(() => {
    if (!hasSelection) return;
    onChange(normalizedSelection, buildPromptFromKeywords(normalizedSelection, locale));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild prompt when locale toggles
  }, [locale]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm font-bold text-ink-soft flex items-center gap-1.5">
          <span>🧩</span> {tx('关键词拼词（点选组合提示词）')}
        </div>
        {hasSelection && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-slate-400 hover:text-rose-500 transition"
          >
            {tx('清空选择')}
          </button>
        )}
      </div>

      {KEYWORD_CATEGORIES.map((cat) => {
        const customSet = new Set(customWords[cat.key]);
        return (
          <div key={cat.key} className="rounded-2xl border border-orange-50 bg-white/60 p-3">
            <div className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
              <span>{cat.emoji}</span> {getCategoryLabel(cat, locale)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {wordsByCategory[cat.key].map((token) => {
                const id = normalizeKeywordToken(token);
                const selected = normalizedSelection[cat.key].includes(id);
                const isCustom = customSet.has(token) && !isPresetKeyword(token);
                return (
                  <button
                    key={token}
                    type="button"
                    onClick={() => toggle(cat.key, token)}
                    className={`prompt-chip text-xs font-bold px-2.5 py-1.5 rounded-xl border-2 transition active:scale-95 ${
                      selected
                        ? isCustom
                          ? cat.customSelectedColor
                          : cat.selectedColor
                        : isCustom
                          ? cat.customColor
                          : cat.color
                    }`}
                  >
                    {isCustom && !selected && <span className="mr-0.5 opacity-70">★</span>}
                    {resolveKeywordWord(token, locale)}
                  </button>
                );
              })}
            </div>
            <CategoryCustomAdd
              category={cat}
              presetIds={cat.presets.map((p) => p.id)}
              customWords={customWords[cat.key]}
              allCustomWords={customWords}
              onAdd={(word) => addCustomWord(cat.key, word)}
              onRemove={(word) => removeCustomWord(cat.key, word)}
            />
          </div>
        );
      })}

      {showInlinePreview && hasSelection && (
        <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {tx('预览：')}{buildPromptFromKeywords(normalizedSelection, locale)}
        </div>
      )}
    </div>
  );
}
