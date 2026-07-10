export type KeywordCategory = 'noun' | 'adjective' | 'action' | 'style';

export type CustomKeywordsByCategory = Record<KeywordCategory, string[]>;

const STORAGE_PREFIX = 'course.prompt-keywords.custom';
const MAX_PER_CATEGORY = 12;
const MAX_WORD_LEN = 16;

export function customKeywordsStorageKey(userId?: string | null) {
  return userId ? `${STORAGE_PREFIX}.${userId}` : `${STORAGE_PREFIX}.guest`;
}

export function emptyCustomKeywords(): CustomKeywordsByCategory {
  return { noun: [], adjective: [], action: [], style: [] };
}

export function loadCustomKeywords(userId?: string | null): CustomKeywordsByCategory {
  if (typeof window === 'undefined') return emptyCustomKeywords();
  try {
    const raw = localStorage.getItem(customKeywordsStorageKey(userId));
    if (!raw) return emptyCustomKeywords();
    const parsed = JSON.parse(raw) as Partial<CustomKeywordsByCategory>;
    return {
      noun: Array.isArray(parsed.noun) ? parsed.noun.filter(Boolean) : [],
      adjective: Array.isArray(parsed.adjective) ? parsed.adjective.filter(Boolean) : [],
      action: Array.isArray(parsed.action) ? parsed.action.filter(Boolean) : [],
      style: Array.isArray(parsed.style) ? parsed.style.filter(Boolean) : [],
    };
  } catch {
    return emptyCustomKeywords();
  }
}

export function saveCustomKeywords(userId: string | null | undefined, data: CustomKeywordsByCategory) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(customKeywordsStorageKey(userId), JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export function normalizeCustomKeyword(raw: string): string | null {
  const word = raw.trim().replace(/\s+/g, '');
  if (!word || word.length > MAX_WORD_LEN) return null;
  return word;
}

export function canAddCustomKeyword(
  category: KeywordCategory,
  word: string,
  current: CustomKeywordsByCategory,
  presetWords: string[],
): string | null {
  const normalized = normalizeCustomKeyword(word);
  if (!normalized) return null;
  if (current[category].includes(normalized) || presetWords.includes(normalized)) return null;
  if (current[category].length >= MAX_PER_CATEGORY) return null;
  return normalized;
}
