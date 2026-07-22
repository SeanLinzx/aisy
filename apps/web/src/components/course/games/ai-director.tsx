'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/contexts/language-context';
import { StoryFillGame } from './story-fill';
import { PictureBookGame } from './picture-book';
import { FrameVideoGame } from './frame-video';

const STEPS = [
  { num: 1, title: '剧本创作', emoji: '📝', hint: '填写场景卡片，AI 生成完整剧本' },
  { num: 2, title: '分镜创作', emoji: '🎬', hint: '导入剧本，逐页生成分镜插图' },
  { num: 3, title: '视频创作', emoji: '🎥', hint: '导入分镜图，描述镜头之间的动作' },
] as const;

/** AI 小导演：剧本 → 分镜 → 视频 三步流水线 */
export function AiDirectorGame() {
  const { tx } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  return (
    <div className="w-full space-y-4">
      <div className="kid-card-sky !py-3 !px-4">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🎬 <strong>{tx('AI 小导演')}</strong>
          {tx('：按三步完成一部小短片——先写')}
          <strong>{tx('剧本')}</strong>
          {tx('，再画')}
          <strong>{tx('分镜')}</strong>
          {tx('，最后')}
          <strong>{tx('生成视频')}</strong>
          {tx('。每一步都可以一键导入上一步的成果，完成后点「下一步」继续。')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => {
          const active = step === s.num;
          const done = step > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={cn(
                'text-left rounded-2xl border-2 px-4 py-2.5 transition min-w-[140px] flex-1',
                active
                  ? 'border-sky-500 bg-sky-500 text-white shadow-pop-sm'
                  : done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-orange-100 bg-white text-ink-soft hover:border-sky-200',
              )}
            >
              <div className="text-xs font-bold opacity-90">{tx('第')} {s.num} {tx(' 步')}</div>
              <div className="font-extrabold text-sm">
                {s.emoji} {tx(s.title)}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-ink-soft px-1">{tx(STEPS[step - 1].hint)}</p>

      {step === 1 && (
        <StoryFillGame embedded stepTitle={tx('剧本创作')} onNextStep={() => setStep(2)} />
      )}
      {step === 2 && (
        <PictureBookGame embedded stepTitle={tx('分镜创作')} onNextStep={() => setStep(3)} />
      )}
      {step === 3 && (
        <FrameVideoGame embedded stepTitle={tx('视频创作')} progressSlug="ai-director" />
      )}
    </div>
  );
}
