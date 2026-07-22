'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { getExploreExtraTools, getExploreTools } from '@/lib/explore-tools';
import { useLanguage } from '@/contexts/language-context';

export default function ExplorePage() {
  const { t, locale } = useLanguage();
  const tools = useMemo(() => getExploreTools(locale), [locale]);
  const extraTools = useMemo(() => getExploreExtraTools(locale), [locale]);

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-4xl p-6 md:p-8 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 border-2 border-orange-100 shadow-pop-sm">
        <div className="relative">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold">
            <span className="text-rainbow">{t('home.exploreTitle', '🎧 探索模式')}</span>
          </h1>
          <p className="text-ink-soft mt-2 font-semibold">
            {t('home.exploreDesc', '生文、生图、生视频、图文理解、AI 小应用、AI 作曲，都在这里。')}
          </p>
        </div>
      </header>

      <section>
        <h2 className="font-display text-xl font-extrabold mb-4">{t('home.toolsTitle', '🎧 探索模式 · 创作工具')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool, i) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`${tool.card} group hover:-translate-y-1 transition-all duration-200`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`kid-emoji-bubble ${tool.bubble} group-hover:animate-wiggle`}>{tool.emoji}</div>
              <div className="font-extrabold text-lg mt-3">{tool.title}</div>
              <div className="text-xs text-ink-soft mt-1 leading-relaxed">{tool.desc}</div>
              <div className="mt-3 text-xs font-bold text-brand-dark/80 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                {t('home.startCreate', '开始创作')} <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {extraTools.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-extrabold mb-4">{locale === 'en' ? 'More Tools' : '更多工具'}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {extraTools.map((tool, i) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`${tool.card} group hover:-translate-y-1 transition-all duration-200`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`kid-emoji-bubble ${tool.bubble} group-hover:animate-wiggle`}>{tool.emoji}</div>
                <div className="font-extrabold text-lg mt-3">{tool.title}</div>
                <div className="text-xs text-ink-soft mt-1 leading-relaxed">{tool.desc}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
