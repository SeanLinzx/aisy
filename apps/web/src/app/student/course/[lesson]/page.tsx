'use client';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { getLesson, THEME_GRADIENT } from '@/lib/course-config';

export default function LessonPage() {
  const params = useParams<{ lesson: string }>();
  const lesson = getLesson(params.lesson);
  if (!lesson) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-ink-soft font-bold">
        <Link href="/student/course" className="hover:text-brand">📚 课程模式</Link>
        <span>›</span>
        <span>第{lesson.index}课</span>
      </div>

      <header className={`relative overflow-hidden rounded-4xl p-6 text-white bg-gradient-to-br ${THEME_GRADIENT[lesson.color]} shadow-pop-sm`}>
        <div className="text-sm font-bold opacity-90">第 {lesson.index} 课 · {lesson.subtitle}</div>
        <h1 className="font-display text-3xl font-extrabold mt-1 flex items-center gap-2">
          <span>{lesson.emoji}</span> {lesson.title}
        </h1>
        <p className="mt-2 font-semibold opacity-95 text-sm leading-relaxed">🎯 {lesson.goal}</p>
      </header>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {lesson.games.map((g, i) => {
          const card = (
            <div className="kid-card h-full group hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-center gap-3">
                <span className="kid-emoji-bubble bg-gradient-to-br from-orange-100 to-pink-100 group-hover:animate-wiggle">{g.emoji}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-lg">{g.title}</span>
                    {g.status === 'placeholder' && <span className="tag-yellow !text-[10px]">敬请期待</span>}
                  </div>
                  <div className="text-xs text-ink-soft mt-0.5 leading-relaxed">{g.desc}</div>
                </div>
              </div>
              <div className="mt-3 text-xs font-bold text-brand-dark/80 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                {g.status === 'placeholder' ? '抢先看 →' : '开始闯关 →'}
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

      {lesson.tools && lesson.tools.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-extrabold flex items-center gap-2">
            <span className="text-2xl">🛠️</span> 创作工具
            <span className="text-sm font-semibold text-ink-soft">（跟课也能直接生图 / 生视频）</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {lesson.tools.map((t, i) => (
              <Link
                key={t.href}
                href={t.href}
                className="kid-card-sky h-full group hover:-translate-y-1 transition-all duration-200 block"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="kid-emoji-bubble bg-gradient-to-br from-sky-200 to-violet-200 group-hover:animate-wiggle">
                    {t.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="font-extrabold text-lg">{t.title}</div>
                    <div className="text-xs text-ink-soft mt-0.5 leading-relaxed">{t.desc}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs font-bold text-brand-dark/80 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  打开工具 →
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
