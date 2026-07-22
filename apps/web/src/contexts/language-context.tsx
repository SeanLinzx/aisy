'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createTranslator, type Translator } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/types';

interface LanguageContextValue extends Translator {
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {
    // ignore
  }
  return 'zh';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }, [locale, hydrated]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => (prev === 'zh' ? 'en' : 'zh'));
  }, []);

  const translator = useMemo(() => createTranslator(locale), [locale]);

  const value = useMemo<LanguageContextValue>(
    () => ({ ...translator, setLocale, toggleLocale }),
    [translator, setLocale, toggleLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

/** Safe version that returns zh defaults when provider is missing */
export function useLanguageSafe(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  const fallback = useMemo(() => {
    const translator = createTranslator('zh');
    return {
      ...translator,
      setLocale: () => {},
      toggleLocale: () => {},
    };
  }, []);
  return ctx ?? fallback;
}
