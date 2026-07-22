'use client';

import { PmCreatorGame } from '@/components/course/games/pm-creator';
import { useLanguage } from '@/contexts/language-context';

export default function PmCreatorPage() {
  const { tx } = useLanguage();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header className="relative overflow-hidden rounded-4xl p-6 md:p-8 bg-gradient-to-br from-violet-100 via-purple-50 to-sky-100 border-2 border-violet-100 shadow-pop-sm">
        <div className="relative">
          <div className="text-xs font-bold text-ink-soft">{tx('AI 产品经理')}</div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold mt-1">
            <span className="text-rainbow">💼 {tx('AI 应用创作者')}</span>
          </h1>
          <p className="text-ink-soft mt-2 font-semibold leading-relaxed">
            {tx('从想法到路演：需求说明书 → 小应用 → 路演材料，三步一气呵成。')}
          </p>
        </div>
      </header>
      <PmCreatorGame />
    </div>
  );
}
