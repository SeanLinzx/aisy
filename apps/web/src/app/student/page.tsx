'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getExploreTools } from '@/lib/explore-tools';
import { resolveUploadPath } from '@/lib/upload-url';
import { useLanguage } from '@/contexts/language-context';

export default function StudentHome() {
  const { t, tx, locale } = useLanguage();
  const tools = useMemo(() => getExploreTools(locale), [locale]);
  const overview = useQuery({ queryKey: ['student-overview'], queryFn: () => api.get('/dashboard/mine').then(r => r.data) });

  const greet = greeting(t);
  const userName: string = overview.data?.user?.displayName || overview.data?.displayName || t('home.defaultName', '小创作家');

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-4xl p-6 md:p-8 bg-gradient-to-br from-orange-100 via-pink-50 to-sky-100 border-2 border-orange-100 shadow-pop-sm">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <span className="absolute top-3 right-6 text-3xl animate-float-slow">🎈</span>
          <span className="absolute bottom-3 right-24 text-2xl animate-float">⭐</span>
          <span className="absolute top-6 right-32 text-xl animate-bounceSoft">✨</span>
        </div>
        <div className="relative">
          <div className="text-sm font-bold text-ink-soft">{greet} 👋</div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold mt-1">
            {t('home.welcome', '欢迎回来，')}<span className="text-rainbow">{userName}</span>！
          </h1>
          <p className="text-ink-soft mt-2 font-semibold">
            {t('home.subtitle', '跟着课程闯关，或在探索模式里自由创作 —— 作品都会进素材库和「我的网页」。')}
          </p>
        </div>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/student/course" className="relative overflow-hidden rounded-4xl p-6 text-white bg-gradient-to-br from-violet-500 to-sky-500 shadow-pop-sm hover:-translate-y-1 transition-all duration-200 group">
          <div aria-hidden className="pointer-events-none absolute -right-2 -top-2 text-6xl opacity-30 group-hover:animate-wiggle">🗺️</div>
          <div className="relative">
            <div className="text-xs font-bold opacity-90">{t('home.courseBadge', '推荐 · 跟着课程一步步学')}</div>
            <div className="font-display text-2xl font-extrabold mt-1">{t('home.courseTitle', '📚 课程模式')}</div>
            <p className="text-sm font-semibold opacity-95 mt-1.5 leading-relaxed">{t('home.courseDesc', '7 节课闯关，从认识 AI 到做出自己的作品集。')}</p>
            <div className="mt-3 text-sm font-bold inline-flex items-center gap-1 group-hover:gap-2 transition-all">{t('home.courseCta', '开始闯关 →')}</div>
          </div>
        </Link>
        <Link href="/student/pm-creator" className="relative overflow-hidden rounded-4xl p-6 text-white bg-gradient-to-br from-purple-500 to-violet-600 shadow-pop-sm hover:-translate-y-1 transition-all duration-200 group">
          <div aria-hidden className="pointer-events-none absolute -right-2 -top-2 text-6xl opacity-30 group-hover:animate-wiggle">💼</div>
          <div className="relative">
            <div className="text-xs font-bold opacity-90">{tx('AI 产品经理')}</div>
            <div className="font-display text-2xl font-extrabold mt-1">{tx('💼 AI 应用创作者')}</div>
            <p className="text-sm font-semibold opacity-95 mt-1.5 leading-relaxed">{tx('需求说明书 → 小应用 → 路演材料，三步完成作品。')}</p>
            <div className="mt-3 text-sm font-bold inline-flex items-center gap-1 group-hover:gap-2 transition-all">{tx('开始创作 →')}</div>
          </div>
        </Link>
        <Link href="/student/explore" className="relative overflow-hidden rounded-4xl p-6 bg-gradient-to-br from-amber-100 to-orange-200 border-2 border-orange-100 shadow-pop-sm hover:-translate-y-1 transition-all duration-200 group block">
          <div aria-hidden className="pointer-events-none absolute -right-2 -top-2 text-6xl opacity-30 group-hover:animate-wiggle">🎧</div>
          <div className="relative">
            <div className="text-xs font-bold text-ink-soft">{t('home.exploreBadge', '自由探索 · 想玩啥玩啥')}</div>
            <div className="font-display text-2xl font-extrabold mt-1 text-ink">{t('home.exploreTitle', '🎧 探索模式')}</div>
            <p className="text-sm font-semibold text-ink-soft mt-1.5 leading-relaxed">{t('home.exploreDesc', '生文、生图、生视频、图文理解、AI 小应用、AI 作曲，都在这里。')}</p>
            <div className="mt-3 text-sm font-bold text-brand-dark inline-flex items-center gap-1 group-hover:gap-2 transition-all">{t('home.exploreCta', '进入探索 →')}</div>
          </div>
        </Link>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="font-display text-xl font-extrabold flex items-center gap-2">
            <span className="text-2xl">🎧</span> {t('home.toolsTitle', '🎧 探索模式 · 创作工具')}
          </h2>
          <Link href="/student/explore" className="text-sm font-bold text-brand hover:underline">
            {t('home.viewAll', '查看全部 →')}
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

      <section className="kid-card-pink">
        <h3 className="font-display font-extrabold text-lg flex items-center gap-2">
          <span className="kid-emoji-bubble !w-10 !h-10 !text-xl bg-gradient-to-br from-pink-200 to-rose-300">🎁</span>
          {t('home.recentWorks', '我的最近作品')}
        </h3>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {overview.data?.recent?.length ? overview.data.recent.map((a: any) => (
            <Link
              key={a.id}
              href="/student/assets"
              className="aspect-square bg-white rounded-2xl border-2 border-pink-100 flex items-center justify-center text-xs text-ink-soft font-semibold overflow-hidden hover:scale-105 transition shadow-pop-sm"
            >
              {a.url ? (
                <img src={resolveUploadPath(a.url)} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="px-2 text-center">{a.title}</span>
              )}
            </Link>
          )) : (
            <div className="col-span-3 text-center py-6 text-ink-soft">
              <div className="text-4xl mb-2">🎨</div>
              <div className="text-sm font-semibold">{t('home.noWorks', '还没作品，去创作一个吧！')}</div>
            </div>
          )}
        </div>
        <Link
          href="/student/assets"
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:gap-2 transition-all"
        >
          {t('home.viewAllAssets', '查看全部素材')} <span>→</span>
        </Link>
      </section>
    </div>
  );
}

function greeting(t: (key: string, fallback?: string) => string) {
  if (typeof window === 'undefined') return t('home.greet.default', '今天也要加油哦');
  const h = new Date().getHours();
  if (h < 6) return t('home.greet.late', '夜深啦，记得早点休息');
  if (h < 11) return t('home.greet.early', '早上好');
  if (h < 14) return t('home.greet.noon', '中午好');
  if (h < 18) return t('home.greet.afternoon', '下午好');
  if (h < 22) return t('home.greet.evening', '晚上好');
  return t('home.greet.late', '夜深啦，记得早点休息');
}
