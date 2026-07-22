'use client';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { getLesson, THEME_GRADIENT } from '@/lib/course-config';
import { useLanguage } from '@/contexts/language-context';

export default function LessonPage() {
  const { t, locale } = useLanguage();
  const params = useParams<{ lesson: string }>();
  const lesson = getLesson(params.lesson, locale);
  if (!lesson) return notFound();

  const featuredGame = lesson.featuredSlug
    ? lesson.games.find((g) => g.slug === lesson.featuredSlug)
    : undefined;
  const gridGames = featuredGame
    ? lesson.games.filter((g) => g.slug !== lesson.featuredSlug)
    : lesson.games;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-ink-soft font-bold">
        <Link href="/student/course" className="hover:text-brand">📚 {t('nav.course', '课程模式')}</Link>
        <span>›</span>
        <span>{locale === 'en' ? `Lesson ${lesson.index}` : `第${lesson.index}课`}</span>
      </div>

      <header className={`relative overflow-hidden rounded-4xl p-6 text-white bg-gradient-to-br ${THEME_GRADIENT[lesson.color]} shadow-pop-sm`}>
        <div className="text-sm font-bold opacity-90">
          {locale === 'en' ? `Lesson ${lesson.index} · ${lesson.subtitle}` : `第 ${lesson.index} 课 · ${lesson.subtitle}`}
        </div>
        <h1 className="font-display text-3xl font-extrabold mt-1 flex items-center gap-2">
          <span>{lesson.emoji}</span> {lesson.title}
        </h1>
        <p className="mt-2 font-semibold opacity-95 text-sm leading-relaxed">🎯 {lesson.goal}</p>
      </header>

      {featuredGame && (
        <Link href={`/student/course/g/${featuredGame.slug}`} className="block group">
          <div className="relative overflow-hidden rounded-4xl p-6 md:p-8 text-white bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 shadow-pop hover:-translate-y-1 transition-all duration-200">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20">
              <span className="absolute top-4 right-8 text-5xl animate-float">💼</span>
              <span className="absolute bottom-4 right-24 text-3xl animate-float-slow">🚀</span>
            </div>
            <div className="relative">
              <div className="text-xs font-bold uppercase tracking-wide opacity-90">
                {locale === 'en' ? 'Featured · Start here' : '本课主打 · 从这里开始'}
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-extrabold mt-1 flex items-center gap-2">
                <span>{featuredGame.emoji}</span> {featuredGame.title}
              </h2>
              <p className="mt-2 text-sm md:text-base font-semibold opacity-95 leading-relaxed max-w-2xl">
                {featuredGame.desc}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-white/20 px-3 py-1">① {locale === 'en' ? 'Requirements' : '需求说明书'}</span>
                <span className="rounded-full bg-white/20 px-3 py-1">② {locale === 'en' ? 'Mini app' : 'AI 小应用'}</span>
                <span className="rounded-full bg-white/20 px-3 py-1">③ {locale === 'en' ? 'Pitch deck' : '路演材料'}</span>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold bg-white text-violet-700 rounded-2xl px-5 py-2.5 group-hover:gap-3 transition-all">
                {t('lesson.start', '开始闯关 →')}
              </div>
            </div>
          </div>
        </Link>
      )}

      {gridGames.length > 0 && (
        <>
          {featuredGame && (
            <div className="text-sm font-bold text-ink-soft px-1">
              {locale === 'en' ? 'More practice activities' : '更多练习环节（可选）'}
            </div>
          )}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {gridGames.map((g, i) => {
              const card = (
                <div className="kid-card h-full group hover:-translate-y-1 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <span className="kid-emoji-bubble bg-gradient-to-br from-orange-100 to-pink-100 group-hover:animate-wiggle">{g.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-lg">{g.title}</span>
                        {g.status === 'placeholder' && <span className="tag-yellow !text-[10px]">{t('lesson.comingSoon', '敬请期待')}</span>}
                      </div>
                      <div className="text-xs text-ink-soft mt-0.5 leading-relaxed">{g.desc}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-bold text-brand-dark/80 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                    {g.status === 'placeholder' ? t('lesson.preview', '抢先看 →') : t('lesson.start', '开始闯关 →')}
                  </div>
                </div>
              );
              return (
                <Link key={g.slug} href={`/student/course/g/${g.slug}`} style={{ animationDelay: `${i * 60}ms` }}>
                  {card}
                </Link>
              );
            })}
          </div>
        </>
      )}

      {lesson.tools && lesson.tools.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-bold text-ink-soft px-1">{t('lesson.tools', '创作工具')}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {lesson.tools.map((tool) => (
              <Link key={tool.href} href={tool.href} className="kid-card hover:-translate-y-0.5 transition-all">
                <div className="font-extrabold flex items-center gap-2">
                  <span>{tool.emoji}</span> {tool.title}
                </div>
                <p className="text-xs text-ink-soft mt-1">{tool.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
