'use client';

import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/cn';

/** Fixed top-left language switcher — always visible */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, toggleLocale } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={cn(
        'fixed top-3 left-3 z-[9999] flex items-center gap-1.5 rounded-full border-2 border-orange-200 bg-white/95 backdrop-blur-sm shadow-pop-sm px-3 py-1.5 text-xs font-extrabold text-ink-soft hover:bg-orange-50 hover:border-brand hover:text-brand-dark transition-all min-h-[36px]',
        className,
      )}
      title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
      aria-label={locale === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <span className="text-sm leading-none">{locale === 'zh' ? '🌐' : '🇨🇳'}</span>
      <span>{locale === 'zh' ? 'EN' : '中文'}</span>
    </button>
  );
}
