'use client';
import Link from 'next/link';
import { COURSE_LESSONS, THEME_GRADIENT } from '@/lib/course-config';

export default function CourseOverview() {
  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-4xl p-6 md:p-8 bg-gradient-to-br from-sky-100 via-violet-50 to-pink-100 border-2 border-sky-100 shadow-pop-sm">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <span className="absolute top-3 right-6 text-3xl animate-float-slow">🗺️</span>
          <span className="absolute bottom-3 right-24 text-2xl animate-float">⭐</span>
        </div>
        <div className="relative">
          <div className="text-sm font-bold text-ink-soft">课程模式 · 6 节课闯关 🎒</div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold mt-1">
            <span className="text-rainbow">AI 训练营冒险地图</span>
          </h1>
          <p className="text-ink-soft mt-2 font-semibold">
            一节一节闯过去，做出属于你自己的 AI 作品！想自由玩工具？去
            <Link href="/student/explore" className="text-brand underline mx-1">探索模式</Link>。
          </p>
        </div>
      </header>

      <div className="space-y-5">
        {COURSE_LESSONS.map((lesson) => (
          <Link
            key={lesson.slug}
            href={`/student/course/${lesson.slug}`}
            className="block kid-card hover:-translate-y-1 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-16 h-16 rounded-3xl flex items-center justify-center text-3xl text-white shadow-pop-sm bg-gradient-to-br ${THEME_GRADIENT[lesson.color]}`}>
                {lesson.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="tag">第 {lesson.index} 课</span>
                  <h2 className="font-display text-xl font-extrabold">{lesson.title}</h2>
                  <span className="text-sm text-ink-soft font-semibold">· {lesson.subtitle}</span>
                </div>
                <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{lesson.goal}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lesson.games.map((g) => (
                    <span key={g.slug} className="inline-flex items-center gap-1 text-xs font-bold rounded-xl px-2.5 py-1 bg-white border-2 border-orange-100">
                      <span>{g.emoji}</span> {g.title}
                      {g.status === 'placeholder' && <span className="text-[10px] text-slate-400">(预告)</span>}
                    </span>
                  ))}
                </div>
              </div>
              <span className="self-center text-2xl text-ink-soft">›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
