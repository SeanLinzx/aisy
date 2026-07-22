import type { KeywordCategory } from '@/lib/custom-keywords';
import type { Locale } from '@/lib/i18n/types';

export interface KeywordPreset {
  id: string;
  zh: string;
  en: string;
}

export interface KeywordCategoryConfig {
  key: KeywordCategory;
  labelZh: string;
  labelEn: string;
  emoji: string;
  color: string;
  selectedColor: string;
  customColor: string;
  customSelectedColor: string;
  presets: KeywordPreset[];
}

export const KEYWORD_CATEGORIES: KeywordCategoryConfig[] = [
  {
    key: 'noun',
    labelZh: '名词（画什么）',
    labelEn: 'Noun (what to draw)',
    emoji: '🎯',
    color: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100',
    selectedColor: 'bg-sky-400 border-sky-500 text-white shadow-pop-sky',
    customColor: 'bg-sky-50/80 border-sky-300 border-dashed text-sky-800 hover:bg-sky-100',
    customSelectedColor: 'bg-sky-500 border-sky-600 border-solid text-white shadow-pop-sky',
    presets: [
      { id: 'robot', zh: '机器人', en: 'robot' },
      { id: 'hero', zh: '奥特曼', en: 'sci-fi hero' },
      { id: 'kitten', zh: '小猫', en: 'kitten' },
      { id: 'puppy', zh: '小狗', en: 'puppy' },
      { id: 'dinosaur', zh: '恐龙', en: 'dinosaur' },
      { id: 'princess', zh: '公主', en: 'princess' },
      { id: 'rocket', zh: '火箭', en: 'rocket' },
      { id: 'castle', zh: '城堡', en: 'castle' },
      { id: 'forest', zh: '森林', en: 'forest' },
      { id: 'ocean', zh: '海洋', en: 'ocean' },
      { id: 'starry-sky', zh: '星空', en: 'starry sky' },
      { id: 'flower', zh: '花朵', en: 'flower' },
      { id: 'butterfly', zh: '蝴蝶', en: 'butterfly' },
      { id: 'car', zh: '汽车', en: 'car' },
      { id: 'panda', zh: '熊猫', en: 'panda' },
      { id: 'unicorn', zh: '独角兽', en: 'unicorn' },
    ],
  },
  {
    key: 'adjective',
    labelZh: '形容词（什么样）',
    labelEn: 'Adjective (what kind)',
    emoji: '✨',
    color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
    selectedColor: 'bg-pink-400 border-pink-500 text-white shadow-pop-pink',
    customColor: 'bg-pink-50/80 border-pink-300 border-dashed text-pink-800 hover:bg-pink-100',
    customSelectedColor: 'bg-pink-500 border-pink-600 border-solid text-white shadow-pop-pink',
    presets: [
      { id: 'cute', zh: '可爱的', en: 'cute' },
      { id: 'mighty', zh: '威猛的', en: 'mighty' },
      { id: 'magical', zh: '神奇的', en: 'magical' },
      { id: 'dreamy', zh: '梦幻的', en: 'dreamy' },
      { id: 'huge', zh: '巨大的', en: 'huge' },
      { id: 'tiny', zh: '小巧的', en: 'tiny' },
      { id: 'sparkling', zh: '闪闪发光的', en: 'sparkling' },
      { id: 'colorful', zh: '彩色的', en: 'colorful' },
      { id: 'mysterious', zh: '神秘的', en: 'mysterious' },
      { id: 'warm', zh: '温暖的', en: 'warm' },
    ],
  },
  {
    key: 'action',
    labelZh: '动作（在做什么）',
    labelEn: 'Action (doing what)',
    emoji: '🏃',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
    selectedColor: 'bg-emerald-400 border-emerald-500 text-white shadow-pop-mint',
    customColor: 'bg-emerald-50/80 border-emerald-300 border-dashed text-emerald-800 hover:bg-emerald-100',
    customSelectedColor: 'bg-emerald-500 border-emerald-600 border-solid text-white shadow-pop-mint',
    presets: [
      { id: 'fighting', zh: '战斗', en: 'fighting' },
      { id: 'dancing', zh: '跳舞', en: 'dancing' },
      { id: 'flying', zh: '飞翔', en: 'flying' },
      { id: 'running', zh: '奔跑', en: 'running' },
      { id: 'swimming', zh: '游泳', en: 'swimming' },
      { id: 'smiling', zh: '微笑', en: 'smiling' },
      { id: 'exploring', zh: '探险', en: 'exploring' },
      { id: 'sleeping', zh: '睡觉', en: 'sleeping' },
      { id: 'singing', zh: '唱歌', en: 'singing' },
      { id: 'playing', zh: '玩耍', en: 'playing' },
      { id: 'drawing', zh: '画画', en: 'drawing' },
      { id: 'reading', zh: '读书', en: 'reading' },
    ],
  },
  {
    key: 'style',
    labelZh: '风格（什么画风）',
    labelEn: 'Style (art style)',
    emoji: '🖌️',
    color: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
    selectedColor: 'bg-violet-500 border-violet-600 text-white shadow-pop-purple',
    customColor: 'bg-violet-50/80 border-violet-300 border-dashed text-violet-800 hover:bg-violet-100',
    customSelectedColor: 'bg-violet-600 border-violet-700 border-solid text-white shadow-pop-purple',
    presets: [
      { id: 'ink-wash', zh: '水墨画', en: 'ink wash' },
      { id: 'watercolor', zh: '水彩', en: 'watercolor' },
      { id: 'cartoon', zh: '卡通', en: 'cartoon' },
      { id: 'pixel', zh: '像素', en: 'pixel art' },
      { id: 'realistic', zh: '写实', en: 'realistic' },
      { id: 'cyberpunk', zh: '赛博朋克', en: 'cyberpunk' },
      { id: 'van-gogh', zh: '梵高', en: 'Van Gogh' },
      { id: 'disney', zh: '迪士尼', en: 'Disney animation' },
      { id: 'paper-cut', zh: '剪纸', en: 'paper cut' },
      { id: '3d', zh: '3D', en: '3D' },
      { id: 'oil-painting', zh: '油画', en: 'oil painting' },
      { id: 'comic', zh: '漫画', en: 'comic' },
    ],
  },
];

const PRESET_BY_ID = new Map<string, KeywordPreset>();
for (const cat of KEYWORD_CATEGORIES) {
  for (const preset of cat.presets) {
    PRESET_BY_ID.set(preset.id, preset);
  }
}

/** Legacy Chinese preset labels saved in older sessions → stable preset id */
const LEGACY_ZH_TO_ID = new Map<string, string>();
for (const cat of KEYWORD_CATEGORIES) {
  for (const preset of cat.presets) {
    LEGACY_ZH_TO_ID.set(preset.zh, preset.id);
  }
}

export function normalizeKeywordToken(token: string): string {
  return LEGACY_ZH_TO_ID.get(token) ?? token;
}

export function normalizeKeywordSelection(
  sel: Record<KeywordCategory, string[]>,
): Record<KeywordCategory, string[]> {
  const out = {} as Record<KeywordCategory, string[]>;
  for (const cat of KEYWORD_CATEGORIES) {
    out[cat.key] = sel[cat.key].map(normalizeKeywordToken);
  }
  return out;
}

export function getCategoryLabel(cat: KeywordCategoryConfig, locale: Locale): string {
  return locale === 'en' ? cat.labelEn : cat.labelZh;
}

export function resolveKeywordWord(token: string, locale: Locale): string {
  const preset = PRESET_BY_ID.get(normalizeKeywordToken(token));
  if (preset) return locale === 'en' ? preset.en : preset.zh;
  return token;
}

export function isPresetKeyword(token: string): boolean {
  return PRESET_BY_ID.has(normalizeKeywordToken(token));
}

export type KeywordSelection = Record<KeywordCategory, string[]>;

export function emptyKeywordSelection(): KeywordSelection {
  return { noun: [], adjective: [], action: [], style: [] };
}

export function buildPromptFromKeywords(sel: KeywordSelection, locale: Locale = 'zh'): string {
  const normalized = normalizeKeywordSelection(sel);
  if (locale === 'en') return buildEnglishPrompt(normalized);
  return buildChinesePrompt(normalized);
}

function label(token: string, locale: Locale): string {
  return resolveKeywordWord(token, locale);
}

function buildChinesePrompt(sel: KeywordSelection): string {
  const chunks: string[] = [];

  const noun = sel.noun.map((t) => label(t, 'zh')).join('和');
  const adj = sel.adjective.map((t) => label(t, 'zh').replace(/的$/, '')).join('、');
  if (noun) {
    chunks.push(adj ? `${adj}的${noun}` : noun);
  }

  if (sel.action.length > 0) {
    chunks.push('正在' + sel.action.map((t) => label(t, 'zh')).join('、'));
  }

  let body = chunks.join('，');

  if (sel.style.length > 0) {
    const styleStr = sel.style.map((t) => label(t, 'zh')).join('、') + '风格';
    body = body ? `${styleStr}的${body}` : styleStr;
  }

  return body;
}

function buildEnglishPrompt(sel: KeywordSelection): string {
  const parts: string[] = [];

  if (sel.style.length > 0) {
    parts.push(`${sel.style.map((t) => label(t, 'en')).join(', ')} style`);
  }

  const nouns = sel.noun.map((t) => label(t, 'en'));
  const adjs = sel.adjective.map((t) => label(t, 'en'));
  const actions = sel.action.map((t) => label(t, 'en'));

  let subject = '';
  if (nouns.length > 0) {
    const adjStr = adjs.length > 0 ? `${adjs.join(', ')} ` : '';
    subject = `${adjStr}${nouns.join(' and ')}`;
  }

  if (actions.length > 0) {
    subject = subject ? `${subject} ${actions.join(' and ')}` : actions.join(' and ');
  }

  if (subject) parts.push(subject);
  return parts.join(', ');
}
