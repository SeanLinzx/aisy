'use client';
import Link from 'next/link';
import { EXPLORE_EXTRA_TOOLS, EXPLORE_TOOLS } from '@/lib/explore-tools';

export default function ExplorePage() {
  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-4xl p-6 md:p-8 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 border-2 border-orange-100 shadow-pop-sm">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <span className="absolute top-3 right-6 text-4xl animate-float-slow">🎧</span>
          <span className="absolute bottom-4 right-28 text-2xl animate-float">🛠️</span>
        </div>
        <div className="relative">
          <div className="text-sm font-bold text-ink-soft">自由探索 · 想玩啥玩啥</div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold mt-1">
            <span className="text-rainbow">🎧 探索模式</span>
          </h1>
          <p className="text-ink-soft mt-2 font-semibold leading-relaxed">
            不跟着课程也能玩！用下面的工具自由创作文字、图片、视频和网页。
          </p>
        </div>
      </header>

      <section>
        <h2 className="font-display text-xl font-extrabold mb-4 flex items-center gap-2">
          <span className="text-2xl">🧰</span> 创作工具
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {EXPLORE_TOOLS.map((t, i) => (
            <Link
              key={t.href}
              href={t.href}
              className={`${t.card} group hover:-translate-y-1 transition-all duration-200`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`kid-emoji-bubble ${t.bubble} group-hover:animate-wiggle`}>{t.emoji}</div>
              <div className="font-extrabold text-lg mt-3">{t.title}</div>
              <div className="text-xs text-ink-soft mt-1 leading-relaxed">{t.desc}</div>
              <div className="mt-3 text-xs font-bold text-brand-dark/80 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                开始创作 <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-extrabold mb-4 flex items-center gap-2">
          <span className="text-2xl">✨</span> 更多创作
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {EXPLORE_EXTRA_TOOLS.map((t, i) => (
            <Link
              key={t.href}
              href={t.href}
              className={`${t.card} group hover:-translate-y-1 transition-all duration-200`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`kid-emoji-bubble ${t.bubble} group-hover:animate-wiggle`}>{t.emoji}</div>
              <div className="font-extrabold text-lg mt-3">{t.title}</div>
              <div className="text-xs text-ink-soft mt-1 leading-relaxed">{t.desc}</div>
              <div className="mt-3 text-xs font-bold text-brand-dark/80 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                开始创作 <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="kid-card-sky !p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="font-bold text-ink">💻 做好的网页在这里</div>
          <p className="text-sm text-ink-soft mt-1">探索模式或课程里生成的网页，都会出现在「我的网页」里。</p>
        </div>
        <Link href="/student/projects" className="kid-button-primary !py-2.5 shrink-0">
          查看我的网页 →
        </Link>
      </section>
    </div>
  );
}
