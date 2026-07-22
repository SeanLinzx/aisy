'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChoiceQuestionGroup } from '@/components/course/choice-question';
import type { ChoiceQuestionSpec } from '@/components/course/choice-question';
import {
  EMPTY_WIZARD_ANSWERS,
  PRD_AI_CAPABILITIES,
  PRD_INTEREST_BY_SCENE,
  PRD_PROBLEMS_BY_SCENE,
  PRD_SOLUTION_DIRECTIONS,
  PRD_TARGET_USERS,
  PRD_WIZARD_SCENES,
  buildProblemSummary,
  isBroadProblem,
  recommendAiCapabilities,
  suggestProductNames,
  type PmPrdWizardAnswers,
} from '@/lib/pm-prd-wizard';

const WIZARD_STEPS = [
  { num: 1, label: '场景兴趣', emoji: '🎯' },
  { num: 2, label: '用户问题', emoji: '👥' },
  { num: 3, label: '解决方式', emoji: '🤖' },
  { num: 4, label: '作品卡', emoji: '📋' },
] as const;

function OptionChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`kid-button-sm border-2 ${
        selected ? 'bg-brand text-white border-brand' : 'bg-white text-ink-soft border-orange-200 hover:border-orange-300'
      }`}
    >
      {selected && '✓ '}
      {children}
    </button>
  );
}

export function PmPrdWizardPanel({
  answers,
  onChange,
  onSubmitToAi,
  reviewStarted = false,
}: {
  answers: PmPrdWizardAnswers;
  onChange: (next: PmPrdWizardAnswers) => void;
  onSubmitToAi: () => void;
  reviewStarted?: boolean;
}) {
  const [step, setStep] = useState(1);
  const [broadHint, setBroadHint] = useState(false);

  const interestOptions = useMemo(() => {
    if (!answers.scene) return [];
    return (PRD_INTEREST_BY_SCENE[answers.scene] ?? []).map((label) => ({ value: label, label }));
  }, [answers.scene]);

  const problemSpec: ChoiceQuestionSpec = useMemo(
    () => ({
      key: 'problem',
      question: '他们遇到了什么问题？',
      options: (PRD_PROBLEMS_BY_SCENE[answers.scene] ?? []).map((label) => ({ value: label, label })),
    }),
    [answers.scene],
  );

  const userSpec: ChoiceQuestionSpec = useMemo(
    () => ({
      key: 'targetUser',
      question: '我想帮助谁？',
      options: PRD_TARGET_USERS.map((label) => ({ value: label, label })),
    }),
    [],
  );

  const recommended = useMemo(
    () => recommendAiCapabilities(answers),
    [answers.scene, answers.problem, answers.solutionDirection],
  );

  const nameSuggestions = useMemo(() => suggestProductNames(answers), [answers]);

  useEffect(() => {
    if (step === 3 && answers.solutionDirection && answers.aiCapabilities.length === 0) {
      onChange({ ...answers, aiCapabilities: recommended });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, answers.solutionDirection, recommended.join(',')]);

  useEffect(() => {
    if (step === 4 && !answers.productNameChoice && nameSuggestions[0]) {
      onChange({ ...answers, productNameChoice: nameSuggestions[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, nameSuggestions.join(',')]);

  function patch(partial: Partial<PmPrdWizardAnswers>) {
    onChange({ ...answers, ...partial });
  }

  function toggleCapability(id: string) {
    const set = new Set(answers.aiCapabilities);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patch({ aiCapabilities: [...set] });
  }

  function nextStep() {
    if (step < 4) setStep((s) => s + 1);
    else onSubmitToAi();
  }

  function prevStep() {
    setStep((s) => Math.max(1, s - 1));
  }

  const problemSummary = buildProblemSummary(answers);
  const canNext =
    step === 1
      ? Boolean(answers.scene && answers.interestTag)
      : step === 2
        ? Boolean(answers.targetUser && answers.problem && !isBroadProblem(problemSummary))
        : step === 3
          ? Boolean(answers.solutionDirection && (answers.aiCapabilities.length > 0 || recommended.length > 0))
          : Boolean(answers.productNameChoice.trim() || nameSuggestions[0]);

  return (
    <div className="h-full flex flex-col min-h-0 kid-card-sky !p-0 overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-sky-200 bg-sky-50/80">
        <div className="text-sm font-extrabold text-ink">🕵️ 小侦探带你做作品卡</div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {WIZARD_STEPS.map((s) => {
            const active = step === s.num;
            const done = step > s.num;
            return (
              <span
                key={s.num}
                className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${
                  active
                    ? 'bg-violet-500 text-white border-violet-500'
                    : done
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-white text-ink-soft border-sky-200'
                }`}
              >
                {s.num}{s.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {step === 1 && (
          <>
            <div>
              <div className="text-sm font-bold text-ink mb-2">我对什么感兴趣？</div>
              <div className="flex flex-wrap gap-2">
                {PRD_WIZARD_SCENES.map((scene) => (
                  <OptionChip
                    key={scene}
                    selected={answers.scene === scene}
                    onClick={() =>
                      patch({
                        scene,
                        interestTag: '',
                        problem: '',
                      })
                    }
                  >
                    {scene}
                  </OptionChip>
                ))}
              </div>
            </div>

            {answers.scene && (
              <div>
                <div className="text-xs font-bold text-ink-soft mb-2">在这个场景里，我更关心…</div>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((opt) => (
                    <OptionChip
                      key={opt.value}
                      selected={answers.interestTag === opt.value}
                      onClick={() => patch({ interestTag: opt.value })}
                    >
                      {opt.label}
                    </OptionChip>
                  ))}
                </div>
              </div>
            )}

            <label className="block space-y-1">
              <span className="text-xs font-bold text-ink-soft">我还对________感兴趣。</span>
              <input
                className="kid-input w-full"
                value={answers.extraInterest}
                onChange={(e) => patch({ extraInterest: e.target.value })}
                placeholder="可选，例如：NBA、我的小猫花花…"
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <ChoiceQuestionGroup
              spec={userSpec}
              value={answers.targetUser}
              onChange={(targetUser) => patch({ targetUser })}
            />

            {answers.scene ? (
              <ChoiceQuestionGroup
                spec={problemSpec}
                value={answers.problem}
                onChange={(problem) => patch({ problem })}
              />
            ) : (
              <p className="text-xs text-rose-600 font-bold">请先在第 1 步选择一个场景。</p>
            )}

            <label className="block space-y-1">
              <span className="text-xs font-bold text-ink-soft">具体来说，这个问题是：________</span>
              <input
                className="kid-input w-full"
                value={answers.problemDetail}
                onChange={(e) => {
                  patch({ problemDetail: e.target.value });
                  setBroadHint(isBroadProblem(e.target.value));
                }}
                onBlur={() => setBroadHint(isBroadProblem(problemSummary))}
                placeholder="可选，把问题说具体一点"
              />
            </label>

            {broadHint && (
              <div className="text-xs font-bold text-amber-800 bg-amber-50 border-2 border-amber-200 rounded-xl px-3 py-2">
                💡 我们把问题变小一点，产品会更容易做出来。
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <div className="text-sm font-bold text-ink mb-2">我希望 AI 怎样帮助他？</div>
              <div className="flex flex-wrap gap-2">
                {PRD_SOLUTION_DIRECTIONS.map((dir) => (
                  <OptionChip
                    key={dir}
                    selected={answers.solutionDirection === dir}
                    onClick={() => patch({ solutionDirection: dir, aiCapabilities: recommendAiCapabilities({ ...answers, solutionDirection: dir }) })}
                  >
                    {dir}
                  </OptionChip>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-bold text-ink mb-1">选择 AI 能力（可多选）</div>
              {recommended.length > 0 && (
                <p className="text-[11px] text-violet-700 font-semibold mb-2">
                  ✨ 推荐：{recommended.map((id) => PRD_AI_CAPABILITIES.find((c) => c.id === id)?.label).filter(Boolean).join('、')}
                </p>
              )}
              <div className="space-y-2">
                {PRD_AI_CAPABILITIES.map((cap) => {
                  const selected = answers.aiCapabilities.includes(cap.id);
                  const isRec = recommended.includes(cap.id);
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => toggleCapability(cap.id)}
                      className={`w-full text-left rounded-xl border-2 p-2.5 transition ${
                        selected
                          ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                          : 'border-orange-100 bg-white hover:border-violet-200'
                      }`}
                    >
                      <div className="text-sm font-extrabold text-ink">
                        {selected ? '✓ ' : ''}{cap.label}
                        {isRec && <span className="ml-1 text-[10px] text-violet-600">推荐</span>}
                      </div>
                      <div className="text-[11px] text-ink-soft mt-0.5">{cap.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div>
              <div className="text-sm font-bold text-ink mb-2">选一个产品名称（也可自己改）</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {nameSuggestions.map((name) => (
                  <OptionChip
                    key={name}
                    selected={answers.productNameChoice === name}
                    onClick={() => patch({ productNameChoice: name })}
                  >
                    {name}
                  </OptionChip>
                ))}
              </div>
              <input
                className="kid-input w-full font-extrabold"
                value={answers.productNameChoice}
                onChange={(e) => patch({ productNameChoice: e.target.value })}
                placeholder="产品名称"
              />
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              点「提交给 AI 分析」后，AI 产品经理会阅读你的选择、继续反问你，并在右侧逐步写出完整需求说明书。
            </p>
          </>
        )}
      </div>

      <div className="px-4 py-3 border-t-2 border-sky-200 flex flex-wrap gap-2 bg-white/80">
        {step > 1 && (
          <button type="button" className="kid-button-ghost !py-2 !px-4 text-sm" onClick={prevStep}>
            ← 上一步
          </button>
        )}
        <button
          type="button"
          className="kid-button-primary !py-2 !px-5 text-sm ml-auto"
          disabled={!canNext}
          onClick={nextStep}
        >
          {step < 4 ? '下一步 →' : reviewStarted ? '🔄 重新提交给 AI' : '🤖 提交给 AI 分析'}
        </button>
      </div>
    </div>
  );
}

export { EMPTY_WIZARD_ANSWERS };
