'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublishedPageLink } from '@/components/published-page-link';
import { HtmlPreview } from '@/components/course/html-preview';
import { useLanguage } from '@/contexts/language-context';
import {
  MEMORY_MATCH_SUBTITLE,
  MEMORY_MATCH_TITLE,
  ensureMemoryMatchStarter,
} from './memory-match-shared';

/** 小侦探·记忆力挑战：默认初始版 + 直接进入小游戏优化 */
export function MemoryMatchGame() {
  const { tx } = useLanguage();
  const [slug, setSlug] = useState<string | null>(null);
  const [html, setHtml] = useState('');
  const [hasSaved, setHasSaved] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureMemoryMatchStarter()
      .then((state) => {
        setSlug(state.slug);
        setHtml(state.html);
        setHasSaved(state.hasSaved);
      })
      .catch(() => setError('初始版小游戏加载失败，请刷新页面重试。'))
      .finally(() => setBooting(false));
  }, []);

  if (booting) {
    return (
      <div className="kid-card-mint !p-6 text-center space-y-2">
        <div className="text-base font-extrabold text-ink">🕵️ {tx('正在准备你的')}{tx(MEMORY_MATCH_TITLE)}{tx('…')}</div>
        <p className="text-sm font-semibold text-ink-soft">{tx('每人都会有一份初始版小游戏，马上就能进「小游戏优化」啦')}</p>
      </div>
    );
  }

  if (error || !hasSaved || !html) {
    return (
      <div className="kid-card space-y-3">
        <p className="text-sm text-rose-600">{error ? tx(error) : tx('游戏加载失败，请刷新重试。')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-mint !p-4 space-y-2">
        <div className="text-base font-extrabold text-emerald-800">🕵️ {tx(MEMORY_MATCH_TITLE)}</div>
        <p className="text-sm font-bold text-brand-dark">{tx(MEMORY_MATCH_SUBTITLE)}</p>
        <p className="text-xs font-semibold text-emerald-900/80 leading-relaxed">
          {tx('你已经有一份可玩的小侦探翻牌游戏啦！可以直接进')}
          <b>{tx('「小游戏优化」')}</b>
          {tx('改配色、加特效、调整细节。想按自己的选择题重新做一版？去')}
          <b>{tx('「设计你的侦探翻牌游戏」')}</b>
          {tx('那一关。')}
        </p>
      </div>

      <div className="kid-card space-y-3">
        <div className="text-sm font-bold">{tx('📱 当前游戏预览（可以先玩一玩）')}</div>
        <HtmlPreview html={html} height={420} interactive />
      </div>

      <div className="kid-card-mint !p-4 flex flex-wrap gap-3 items-center">
        <Link href="/studio/memory-match" className="kid-button-primary !py-3 !px-6 text-base">
          {tx('🎮 进入小游戏优化')}
        </Link>
        {slug && (
          <PublishedPageLink slug={slug} className="kid-button-ghost !py-3 !px-5 text-sm">
            {tx('🌐 打开游戏网页')}
          </PublishedPageLink>
        )}
        <Link href="/student/course/g/memory-match-create" className="kid-button-ghost !py-3 !px-5 text-sm">
          {tx('🎨 用选择题重新设计一版')}
        </Link>
      </div>
    </div>
  );
}
