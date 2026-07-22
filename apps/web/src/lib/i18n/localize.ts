import type { Locale } from './types';

/** Pick zh or en version of a value */
export function pickLocale<T>(zh: T, en: T, locale: Locale): T {
  return locale === 'en' ? en : zh;
}

/** Translate a record of Chinese keys to English using a map */
export function translateMap(zh: string, map: Record<string, string>, locale: Locale): string {
  if (locale === 'zh') return zh;
  return map[zh] ?? zh;
}

/** Deep-clone and translate all string fields in an object using a map */
export function translateStringsDeep<T>(obj: T, map: Record<string, string>, locale: Locale): T {
  if (locale === 'zh') return obj;
  if (typeof obj === 'string') return (map[obj] ?? obj) as T;
  if (Array.isArray(obj)) return obj.map((item) => translateStringsDeep(item, map, locale)) as T;
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = translateStringsDeep(v, map, locale);
    }
    return out as T;
  }
  return obj;
}
