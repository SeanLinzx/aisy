'use client';

import { useLanguage } from '@/contexts/language-context';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AI_GENERATE_WEB_PROGRESS_ESTIMATE, AI_GENERATE_WEB_PROGRESS_MS, AI_GENERATE_WEB_TIMEOUT_MS } from '@/lib/ai-generate-timeouts';
import { AiProgress } from '@/components/course/ai-progress';
import { ChoiceQuestionGroup } from '@/components/course/choice-question';
import type { ChoiceQuestionSpec } from '@/components/course/choice-question';
import {
  CHALLENGE_QUESTIONS,
  DEFAULT_FORM,
  INTERACTION_QUESTIONS,
  LAYOUT_QUESTIONS,
  LEVEL_QUESTIONS,
  MEMORY_MATCH_SUBTITLE,
  MEMORY_MATCH_TITLE,
  SCENE_QUESTIONS,
  buildMemoryMatchPrompt,
  ensureMemoryMatchStarter,
  mergeWebHtml,
  persistMemoryMatch,
  type MemoryMatchForm,
} from './memory-match-shared';

export const MEMORY_MATCH_CREATE_TITLE = '设计你的侦探翻牌游戏';

const CONFIG_STEPS: Array<{
  label: string;
  title: string;
  cardClass: string;
  questions: ChoiceQuestionSpec[];
  hint?: string;
}> = [
  {
    label: '① 选场景',
    title: '📍 第一步 · 选场景（选择题）',
    cardClass: 'kid-card-orange',
    questions: SCENE_QUESTIONS,
  },
  {
    label: '② 选布局',
    title: '🧱 第二步 · 选布局（选择题）',
    cardClass: 'kid-card-yellow',
    questions: LAYOUT_QUESTIONS,
  },
  {
    label: '③ 选交互',
    title: '👆 第三步 · 选交互（选择题）',
    cardClass: 'kid-card-sky',
    questions: INTERACTION_QUESTIONS,
  },
  {
    label: '④ 设定难度',
    title: '⚙️ 第四步 · 自己设定关卡难度（选择题）',
    cardClass: 'kid-card-purple',
    questions: [...LEVEL_QUESTIONS, ...CHALLENGE_QUESTIONS],
    hint: '每一关的卡片数量都能自己选，还能设定翻牌次数限制和时间限制让挑战更刺激（不选就是不限制）。',
  },
];

/** 通过四步选择题，让 AI 生成全新的小侦探记忆力挑战游戏 */
export function MemoryMatchCreateGame() {
  const { tx } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState<MemoryMatchForm>(DEFAULT_FORM);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof MemoryMatchForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    ensureMemoryMatchStarter()
      .then((state) => {
        setForm(state.form);
        setProjectId(state.projectId);
        setAssetId(state.assetId);
        setHasSaved(state.hasSaved);
      })
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const prompt = buildMemoryMatchPrompt(form);
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: AI_GENERATE_WEB_TIMEOUT_MS });
      const merged = mergeWebHtml(r.data);

      const result = await persistMemoryMatch({
        htmlContent: merged,
        form,
        projectId,
        assetId,
      });
      setProjectId(result.projectId);
      setAssetId(result.assetId);
      setHasSaved(true);

      router.push('/studio/memory-match');
    } catch (e: unknown) {
      setError((e as Error)?.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  const current = CONFIG_STEPS[step];
  const isFirstStep = step === 0;
  const isLastStep = step === CONFIG_STEPS.length - 1;

  if (booting) {
    return (
      <div className="kid-card-mint !p-6 text-center space-y-2">
        <div className="text-base font-extrabold text-ink">🎨 正在加载{MEMORY_MATCH_CREATE_TITLE}…</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Link href="/student/course/g/memory-match" className="kid-button-ghost !py-2 !px-4 text-sm">
          ← 返回记忆力挑战
        </Link>
        {hasSaved && (
          <Link href="/studio/memory-match" className="kid-button-primary !py-2 !px-4 text-sm">
            🎮 进入小游戏优化
          </Link>
        )}
      </div>

      <div className="kid-card-yellow !p-4 space-y-1">
        <div className="text-base font-extrabold text-ink">🎨 {MEMORY_MATCH_CREATE_TITLE}</div>
        <p className="text-sm font-bold text-brand-dark">{MEMORY_MATCH_SUBTITLE}</p>
        <p className="text-xs font-semibold text-ink-soft leading-relaxed">
          分四步做选择题说清楚<b>{tx('场景')}</b>、<b>{tx('布局')}</b>、<b>{tx('交互')}</b>{tx('和')}<b>{tx('难度')}</b>，AI 会按你的选择做出「{MEMORY_MATCH_TITLE}」三关翻牌游戏。生成后可进「小游戏优化」继续改细节。没有合适选项？点<b>{tx('「➕ 自己写一个」')}</b>即可新增。
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {CONFIG_STEPS.map((s, i) => {
          const active = step === i;
          const visited = i < step;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setStep(i)}
              className={`px-3 py-1.5 rounded-full font-bold border transition ${
                active
                  ? 'bg-brand text-white border-brand'
                  : visited
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300'
                    : 'bg-white text-slate-500 border-orange-100 hover:border-orange-200'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className={`${current.cardClass} !p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold">{current.title}</div>
          <span className="text-xs font-bold text-ink-soft shrink-0">
            {step + 1} / {CONFIG_STEPS.length}
          </span>
        </div>
        {current.hint && (
          <p className="text-xs font-semibold text-ink-soft">{current.hint}</p>
        )}
        {current.questions.map((q) => (
          <ChoiceQuestionGroup
            key={q.key}
            spec={q}
            value={form[q.key as keyof MemoryMatchForm]}
            onChange={(v) => setField(q.key as keyof MemoryMatchForm, v)}
          />
        ))}
      </div>

      <div className="kid-card !p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {!isFirstStep && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="kid-button-ghost !py-2 !px-4 text-sm"
            >
              ← 上一步
            </button>
          )}
          {!isLastStep ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="kid-button-primary !py-2 !px-4 text-sm ml-auto"
            >
              下一步 →
            </button>
          ) : (
            <button onClick={generate} disabled={busy} className="kid-button-primary !py-2 !px-4 text-sm ml-auto">
              {busy ? '🕵️ AI 正在制作…' : `🚀 生成${MEMORY_MATCH_TITLE}`}
            </button>
          )}
        </div>
        {busy && (
          <AiProgress
            label={tx('AI 正在按你的选择制作见习/线索/王牌侦探三关翻牌游戏…')}
            estimate={AI_GENERATE_WEB_PROGRESS_ESTIMATE}
            durationMs={AI_GENERATE_WEB_PROGRESS_MS}
          />
        )}
        {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{tx(error)}</div>
        )}
      </div>
    </div>
  );
}
