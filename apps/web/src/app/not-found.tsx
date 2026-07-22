'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/language-context';

export default function NotFound() {
  const { tx } = useLanguage();
  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="deco-blob bg-candy-sky w-72 h-72 -top-10 right-10 animate-float-slow" />
        <div className="deco-blob bg-candy-mint w-72 h-72 -bottom-10 left-10 animate-float" />
        <span className="absolute top-16 left-[12%] text-3xl animate-float-slow select-none">⭐</span>
        <span className="absolute bottom-24 right-[12%] text-3xl animate-bounceSoft select-none">🎈</span>
      </div>
      <div className="relative text-center max-w-md">
        <div className="kid-emoji-bubble-lg bg-gradient-to-br from-sky-200 to-blue-300 mx-auto mb-5 animate-float">🧭</div>
        <h1 className="font-display text-3xl font-extrabold text-rainbow">{tx('找不到这个页面')}</h1>
        <p className="text-ink-soft font-semibold mt-3">{tx('可能是链接输错了，回首页再去探险吧 🚀')}</p>
        <Link href="/" className="mt-6 inline-block kid-button-primary">{tx('🏠 回首页')}</Link>
      </div>
    </main>
  );
}
