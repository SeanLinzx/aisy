'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/contexts/language-context';
import {
  ensureActivePmBundleId,
  getCurrentPmApplicationTitle,
  startNewPmApplication,
} from '@/lib/pm-applications';
import { loadPmCreatorStep, savePmCreatorStep } from '@/lib/pm-pipeline';
import { PmRequirementsGame } from './pm-requirements';
import { PmSingleAppGame } from './pm-single-app';
import { PmPitchGame } from './pm-pitch';

const STEPS = [
  { num: 1, title: '需求说明书', emoji: '📝', hint: '用选择题向导或对话填空完成作品卡，右侧实时生成需求说明书。' },
  { num: 2, title: 'AI 小应用', emoji: '🪄', hint: '填写场景、布局、交互，配置一个 AI，生成可玩的小应用。' },
  { num: 3, title: '路演材料', emoji: '🎤', hint: '导入前两步成果，按多个维度生成路演介绍材料。' },
] as const;

/** AI 应用创作者：需求说明书 → 小应用 → 路演材料 */
export function PmCreatorGame() {
  const { tx } = useLanguage();
  const pathname = usePathname();
  const inCourse = pathname.includes('/student/course/g/');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [hydrated, setHydrated] = useState(false);
  const [appTitle, setAppTitle] = useState('');
  const [draftKey, setDraftKey] = useState(0);

  useEffect(() => {
    ensureActivePmBundleId();
    setStep(loadPmCreatorStep());
    setAppTitle(getCurrentPmApplicationTitle());
    setHydrated(true);
  }, []);

  function goTo(next: 1 | 2 | 3) {
    setStep(next);
    savePmCreatorStep(next);
  }

  function handleNewApplication() {
    if (!window.confirm(tx('新建应用会清空当前草稿，开始一个全新的三步作品。确定吗？'))) return;
    startNewPmApplication();
    setStep(1);
    setAppTitle(getCurrentPmApplicationTitle());
    setDraftKey((k) => k + 1);
  }

  if (!hydrated) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 kid-card !py-3 !px-4">
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-ink-soft">{tx('当前应用')}</div>
          <div className="font-extrabold text-base truncate">{appTitle || tx('新的 AI 应用')}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/student/pm-applications" className="kid-button-ghost !py-2 !px-4 text-sm">
            📂 {tx('我的 AI 应用')}
          </Link>
          <button type="button" onClick={handleNewApplication} className="kid-button-primary !py-2 !px-4 text-sm">
            ✨ {tx('新建应用')}
          </button>
        </div>
      </div>

      <div className="kid-card-purple !py-3 !px-4">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          💼 <strong>{tx('AI 应用创作者')}</strong>
          {tx('：三步完成一个 AI 小作品——先写')}
          <strong>{tx('需求说明书')}</strong>
          {tx('，再做出')}
          <strong>{tx('小应用')}</strong>
          {tx('，最后导出')}
          <strong>{tx('路演材料')}</strong>
          {tx('。每步可保存，下一步会自动读取本机已保存的内容。')}
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
              onClick={() => goTo(s.num as 1 | 2 | 3)}
              className={cn(
                'text-left rounded-2xl border-2 px-4 py-2.5 transition min-w-[140px] flex-1',
                active
                  ? 'border-violet-500 bg-violet-500 text-white shadow-pop-sm'
                  : done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-orange-100 bg-white text-ink-soft hover:border-violet-200',
              )}
            >
              <div className="text-xs font-bold opacity-90">
                {tx('第')} {s.num} {tx('步')}
              </div>
              <div className="font-extrabold text-sm">
                {s.emoji} {tx(s.title)}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-ink-soft px-1">{tx(STEPS[step - 1].hint)}</p>

      {step === 1 && <PmRequirementsGame key={draftKey} embedded onNextStep={() => goTo(2)} />}
      {step === 2 && <PmSingleAppGame key={draftKey} embedded onNextStep={() => goTo(3)} />}
      {step === 3 && <PmPitchGame key={draftKey} embedded />}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-orange-100">
        {inCourse ? (
          <Link href="/student/course/lesson-pm" className="text-xs font-bold text-ink-soft hover:text-violet-600">
            ← {tx('返回第 7 课')}
          </Link>
        ) : (
          <Link href="/student" className="text-xs font-bold text-ink-soft hover:text-violet-600">
            ← {tx('返回首页')}
          </Link>
        )}
      </div>
    </div>
  );
}
