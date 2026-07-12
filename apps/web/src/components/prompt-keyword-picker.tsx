'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiAuth } from '@/lib/api';
import {
  canAddCustomKeyword,
  emptyCustomKeywords,
  loadCustomKeywords,
  saveCustomKeywords,
  type CustomKeywordsByCategory,
  type KeywordCategory,
} from '@/lib/custom-keywords';

interface CategoryConfig {
  key: KeywordCategory;
  label: string;
  emoji: string;
  color: string;
  selectedColor: string;
  customColor: string;
  customSelectedColor: string;
  words: string[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'noun',
    label: '名词（画什么）',
    emoji: '🎯',
    color: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100',
    selectedColor: 'bg-sky-400 border-sky-500 text-white shadow-pop-sky',
    customColor: 'bg-sky-50/80 border-sky-300 border-dashed text-sky-800 hover:bg-sky-100',
    customSelectedColor: 'bg-sky-500 border-sky-600 border-solid text-white shadow-pop-sky',
    words: ['机器人', '奥特曼', '小猫', '小狗', '恐龙', '公主', '火箭', '城堡', '森林', '海洋', '星空', '花朵', '蝴蝶', '汽车', '熊猫', '独角兽'],
  },
  {
    key: 'adjective',
    label: '形容词（什么样）',
    emoji: '✨',
    color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
    selectedColor: 'bg-pink-400 border-pink-500 text-white shadow-pop-pink',
    customColor: 'bg-pink-50/80 border-pink-300 border-dashed text-pink-800 hover:bg-pink-100',
    customSelectedColor: 'bg-pink-500 border-pink-600 border-solid text-white shadow-pop-pink',
    words: ['可爱的', '威猛的', '神奇的', '梦幻的', '巨大的', '小巧的', '闪闪发光的', '彩色的', '神秘的', '温暖的'],
  },
  {
    key: 'action',
    label: '动作（在做什么）',
    emoji: '🏃',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
    selectedColor: 'bg-emerald-400 border-emerald-500 text-white shadow-pop-mint',
    customColor: 'bg-emerald-50/80 border-emerald-300 border-dashed text-emerald-800 hover:bg-emerald-100',
    customSelectedColor: 'bg-emerald-500 border-emerald-600 border-solid text-white shadow-pop-mint',
    words: ['战斗', '跳舞', '飞翔', '奔跑', '游泳', '微笑', '探险', '睡觉', '唱歌', '玩耍', '画画', '读书'],
  },
  {
    key: 'style',
    label: '风格（什么画风）',
    emoji: '🖌️',
    color: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
    selectedColor: 'bg-violet-500 border-violet-600 text-white shadow-pop-purple',
    customColor: 'bg-violet-50/80 border-violet-300 border-dashed text-violet-800 hover:bg-violet-100',
    customSelectedColor: 'bg-violet-600 border-violet-700 border-solid text-white shadow-pop-purple',
    words: ['水墨画', '水彩', '卡通', '像素', '写实', '赛博朋克', '梵高', '迪士尼', '剪纸', '3D', '油画', '漫画'],
  },
];

export type KeywordSelection = Record<KeywordCategory, string[]>;

export function emptySelection(): KeywordSelection {
  return { noun: [], adjective: [], action: [], style: [] };
}

export function buildPromptFromKeywords(sel: KeywordSelection): string {
  const chunks: string[] = [];

  const noun = sel.noun.join('和');
  const adj = sel.adjective.map((w) => w.replace(/的$/, '')).join('、');
  if (noun) {
    chunks.push(adj ? `${adj}的${noun}` : noun);
  }

  if (sel.action.length > 0) {
    chunks.push('正在' + sel.action.join('、'));
  }

  let body = chunks.join('，');

  if (sel.style.length > 0) {
    const styleStr = sel.style.join('、') + '风格';
    body = body ? `${styleStr}的${body}` : styleStr;
  }

  return body;
}

function CategoryCustomAdd({
  category,
  presetWords,
  customWords,
  allCustomWords,
  onAdd,
  onRemove,
}: {
  category: CategoryConfig;
  presetWords: string[];
  customWords: string[];
  allCustomWords: CustomKeywordsByCategory;
  onAdd: (word: string) => void;
  onRemove: (word: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  function submit() {
    const next = canAddCustomKeyword(category.key, draft, allCustomWords, presetWords);
    if (!next) {
      setHint('这个词已经有了，或太长了，请换一个试试～');
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
              <span className="text-[10px] font-bold text-amber-600">我的</span>
              <button
                type="button"
                onClick={() => onRemove(word)}
                className={`prompt-chip text-xs font-bold px-2.5 py-1.5 rounded-xl border-2 transition active:scale-95 ${category.customColor}`}
                title="点击移除这个自定义词"
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
          placeholder="添加我的词…"
          maxLength={16}
        />
        <button type="button" onClick={submit} className="kid-button-sm bg-white border-amber-200 text-amber-700 text-xs">
          ➕ 加入
        </button>
      </div>
      <p className="text-[10px] text-ink-soft">自定义词只保存在本账号的这台设备上，不会同步给其他同学。</p>
      {hint && <p className="text-[10px] text-rose-600">{hint}</p>}
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
  const hasSelection = Object.values(selection).some((arr) => arr.length > 0);
  const built = prompt.trim() || buildPromptFromKeywords(selection);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
      <div className="text-sm font-bold text-ink-soft flex items-center gap-1.5">
        <span>📝</span> 提示词总结
      </div>
      {hasSelection ? (
        <>
          {CATEGORIES.map((cat) => {
            const selected = selection[cat.key];
            if (selected.length === 0) return null;
            return (
              <div key={cat.key}>
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <span>{cat.emoji}</span> {cat.label}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.map((word) => (
                    <span
                      key={word}
                      className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/80 border border-amber-200 text-amber-800"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="border-t border-amber-200 pt-3">
            <div className="text-xs font-semibold text-slate-500 mb-1.5">完整提示词</div>
            <p className="text-sm font-medium text-ink leading-relaxed">{built}</p>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400 leading-relaxed">点选左边的关键词，这里会显示拼好的提示词～</p>
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

  const wordsByCategory = useMemo(() => {
    const map = {} as Record<KeywordCategory, string[]>;
    for (const cat of CATEGORIES) {
      const merged = [...cat.words];
      for (const word of customWords[cat.key]) {
        if (!merged.includes(word)) merged.push(word);
      }
      map[cat.key] = merged;
    }
    return map;
  }, [customWords]);

  function persistCustom(next: CustomKeywordsByCategory) {
    setCustomWords(next);
    saveCustomKeywords(userId, next);
  }

  function toggle(category: KeywordCategory, word: string) {
    const current = selection[category];
    const next = current.includes(word)
      ? current.filter((w) => w !== word)
      : [...current, word];
    const newSel = { ...selection, [category]: next };
    onChange(newSel, buildPromptFromKeywords(newSel));
  }

  function addCustomWord(category: KeywordCategory, word: string) {
    const next = {
      ...customWords,
      [category]: [...customWords[category], word],
    };
    persistCustom(next);
    if (!selection[category].includes(word)) {
      const newSel = { ...selection, [category]: [...selection[category], word] };
      onChange(newSel, buildPromptFromKeywords(newSel));
    }
  }

  function removeCustomWord(category: KeywordCategory, word: string) {
    const next = {
      ...customWords,
      [category]: customWords[category].filter((w) => w !== word),
    };
    persistCustom(next);
    if (selection[category].includes(word)) {
      const newSel = {
        ...selection,
        [category]: selection[category].filter((w) => w !== word),
      };
      onChange(newSel, buildPromptFromKeywords(newSel));
    }
  }

  function clearAll() {
    const empty = emptySelection();
    onChange(empty, '');
  }

  const hasSelection = Object.values(selection).some((arr) => arr.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm font-bold text-ink-soft flex items-center gap-1.5">
          <span>🧩</span> 关键词拼词（点选组合提示词）
        </div>
        {hasSelection && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-slate-400 hover:text-rose-500 transition"
          >
            清空选择
          </button>
        )}
      </div>

      {CATEGORIES.map((cat) => {
        const customSet = new Set(customWords[cat.key]);
        return (
          <div key={cat.key} className="rounded-2xl border border-orange-50 bg-white/60 p-3">
            <div className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
              <span>{cat.emoji}</span> {cat.label}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {wordsByCategory[cat.key].map((word) => {
                const selected = selection[cat.key].includes(word);
                const isCustom = customSet.has(word);
                return (
                  <button
                    key={word}
                    type="button"
                    onClick={() => toggle(cat.key, word)}
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
                    {word}
                  </button>
                );
              })}
            </div>
            <CategoryCustomAdd
              category={cat}
              presetWords={cat.words}
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
          预览：{buildPromptFromKeywords(selection)}
        </div>
      )}
    </div>
  );
}
