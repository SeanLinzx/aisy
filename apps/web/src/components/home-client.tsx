'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/language-context';

const ROLE_LABELS: Record<string, string> = {
  student: '学生',
  teacher: '老师',
  parent: '家长',
  admin: '管理员',
};

const FEATURES = [
  {
    emoji: '✍️',
    title: 'AI 创作工具',
    desc: '文字 / 图片 / 视频 / 海报 / PPT，一键搞定',
    cardClass: 'kid-card-orange',
    bubbleClass: 'bg-gradient-to-br from-amber-200 to-orange-300',
  },
  {
    emoji: '🌐',
    title: '可发布的网页',
    desc: '一句话生成网页，实时预览，一键发布',
    cardClass: 'kid-card-sky',
    bubbleClass: 'bg-gradient-to-br from-sky-200 to-blue-300',
  },
  {
    emoji: '👨‍👩‍👧',
    title: '老师 / 家长',
    desc: '老师布置任务，家长查看孩子的成长',
    cardClass: 'kid-card-mint',
    bubbleClass: 'bg-gradient-to-br from-emerald-200 to-teal-300',
  },
];

export function HomeClient({
  target,
  me,
}: {
  target: string;
  me: { role: string } | null;
}) {
  const { tx } = useLanguage();

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center px-6 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="deco-blob bg-candy-yellow w-72 h-72 -top-10 -left-10 animate-float-slow" />
        <div className="deco-blob bg-candy-pink w-80 h-80 -top-20 right-0 animate-float" />
        <div className="deco-blob bg-candy-sky w-96 h-96 -bottom-20 left-1/4 animate-float-slow" />
        <div className="deco-blob bg-candy-mint w-64 h-64 -bottom-10 right-10 animate-float" />
        <span className="absolute top-16 left-[12%] text-3xl animate-float-slow select-none">⭐</span>
        <span className="absolute top-24 right-[15%] text-2xl animate-float select-none">✨</span>
        <span className="absolute bottom-24 left-[10%] text-3xl animate-bounceSoft select-none">🎈</span>
        <span className="absolute bottom-20 right-[12%] text-3xl animate-float-slow select-none">🌈</span>
      </div>

      <div className="relative max-w-4xl w-full text-center">
        <div className="inline-flex items-center justify-center gap-2 mb-6">
          <span className="kid-emoji-bubble-lg bg-gradient-to-br from-amber-200 to-orange-300 animate-float-slow">🎨</span>
          <span className="kid-emoji-bubble-lg bg-gradient-to-br from-sky-200 to-violet-300 animate-float">🤖</span>
          <span className="kid-emoji-bubble-lg bg-gradient-to-br from-pink-200 to-rose-300 animate-float-slow" style={{ animationDelay: '1s' }}>✨</span>
        </div>

        <h1 className="font-display text-4xl md:text-6xl font-extrabold leading-tight">
          <span className="text-rainbow">{tx('AI 创作 + 网页训练营')}</span>
        </h1>
        <p className="mt-5 text-lg md:text-xl text-ink-soft font-semibold max-w-2xl mx-auto">
          {tx('这是属于小朋友的 AI 创作乐园 🎉')}
          <br />
          {tx('用 AI')} <span className="tag-yellow mx-1">{tx('写故事')}</span>
          <span className="tag-pink mx-1">{tx('画画')}</span>
          <span className="tag-sky mx-1">{tx('做视频')}</span>
          <span className="tag-mint mx-1">{tx('搭网页')}</span>
          {tx('，发布到自己的作品主页！')}
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href={target} className="kid-button-primary text-lg px-7 py-4">
            {me ? `${tx('🚀 进入「')}${tx(ROLE_LABELS[me.role] ?? me.role)}${tx('」工作台')}` : tx('🚀 小朋友登录')}
          </Link>
          <Link href="/plaza" className="kid-button-sky text-lg px-7 py-4">
            {tx('🌟 看看大家的作品广场')}
          </Link>
        </div>

        {process.env.NEXT_PUBLIC_SITE_NOTICE ? (
          <p className="mt-6 mx-auto max-w-xl rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 font-medium">
            {process.env.NEXT_PUBLIC_SITE_NOTICE}
          </p>
        ) : null}

        <div className="mt-14 grid sm:grid-cols-3 gap-5 text-left">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`${f.cardClass} group cursor-default`}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className={`kid-emoji-bubble ${f.bubbleClass} group-hover:animate-wiggle`}>{f.emoji}</div>
              <div className="mt-3 font-bold text-lg text-ink">{tx(f.title)}</div>
              <div className="text-sm text-ink-soft mt-1.5 leading-relaxed">{tx(f.desc)}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-xs text-ink-soft/70">
          {tx('🦄 让创意飞起来 · 让 AI 帮你做超棒的作品')}
        </div>
      </div>
    </main>
  );
}
