'use client';
import Link from 'next/link';
import { deckUrl, LESSON1_DETECTIVE_DECK } from '@/lib/course-deck';

/** 第一节课 · AI 小侦探互动课件（自主浏览，不跟课） */
export default function Lesson1DeckPage() {
  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-ink-soft font-bold">
        <Link href="/student/course" className="hover:text-brand">📚 课程模式</Link>
        <span>›</span>
        <Link href="/student/course/lesson1" className="hover:text-brand">第1课</Link>
        <span>›</span>
        <span>互动课件</span>
      </div>

      <header className="kid-card-orange">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🕵️</span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">{LESSON1_DETECTIVE_DECK.title}</h1>
            <p className="text-sm text-ink-soft mt-1">用 ← → 翻页，按 ↑ 或 Esc 显示老师工具栏（计时、跳转、全屏、批注）。</p>
          </div>
        </div>
      </header>

      <div className="kid-card !p-3 md:!p-4">
        <iframe
          src={deckUrl('solo')}
          title={LESSON1_DETECTIVE_DECK.title}
          className="w-full rounded-2xl border-2 border-orange-100 bg-white"
          style={{ height: 'min(78vh, 900px)' }}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
