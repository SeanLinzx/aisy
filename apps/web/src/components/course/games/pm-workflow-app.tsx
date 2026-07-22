'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { FillBlankSentence } from '@/components/course/fill-blank-sentence';
import { PmAiFlowEditor } from '@/components/course/pm-ai-flow-editor';
import { useLanguage } from '@/contexts/language-context';
import { resolveEnableImageUpload } from '@/lib/ai-image-upload-detect';
import { generatePmAppWeb } from '@/lib/pm-app-ai-wiring';
import { KidLocalDraftHint } from '@/components/course/kid-local-draft-hint';
import { formatKidLocalDraftHint } from '@/lib/kid-app-local-draft';
import { EMPTY_AI_FLOW, loadPmWorkflowApp, savePmWorkflowApp, type AiFlowGraph } from '@/lib/pm-pipeline';
import {
  buildPmWorkflowAppPrompt,
  commitPmWorkflowAppLocal,
  DEFAULT_FORM,
  INTERACTION_TEMPLATE,
  LAYOUT_TEMPLATE,
  persistPmWorkflowApp,
  SCENE_TEMPLATE,
  validatePmFlow,
  type FreeformForm,
} from './pm-mini-app-shared';

const STEPS = [
  { label: '① 场景', title: '📍 第一步 · 填空描述场景', hint: '描述你想做什么小应用、给谁用、什么时候用。', cardClass: 'kid-card-orange', template: SCENE_TEMPLATE, fields: ['topic', 'audience', 'scenario'] as const },
  { label: '② 布局', title: '🧱 第二步 · 填空摆好布局', hint: '描述页面上要有哪些东西。', cardClass: 'kid-card-sky', template: LAYOUT_TEMPLATE, fields: ['layoutItems'] as const },
  { label: '③ 交互', title: '👆 第三步 · 填空设计交互', hint: '写下用户点哪里、页面会出现什么。', cardClass: 'kid-card-purple', template: INTERACTION_TEMPLATE, fields: ['clickTarget', 'feedback'] as const },
  { label: '④ AI 工作流', title: '🤖 第四步 · 设计 AI 工作流（DAG）', hint: '添加多个 AI 节点并连线，组成工作流。每个节点要写清楚输入和输出。', cardClass: 'kid-card-mint', template: null, fields: [] as const },
] as const;

export function PmWorkflowAppGame() {
  const { tx } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState<FreeformForm>(DEFAULT_FORM);
  const [aiFlow, setAiFlow] = useState<AiFlowGraph>(EMPTY_AI_FLOW);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [headVersionId, setHeadVersionId] = useState<string | null>(null);

  useEffect(() => {
    const data = loadPmWorkflowApp();
    if (data) {
      setForm(data.form);
      setAiFlow(data.aiFlow);
      setStep(data.step ?? 0);
      setProjectId(data.projectId ?? null);
      setAssetId(data.assetId ?? null);
      if (data.headVersionId) setHeadVersionId(data.headVersionId);
      if (data.savedAt) setDraftHint(formatKidLocalDraftHint(data.savedAt));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const saved = savePmWorkflowApp({
        form,
        aiFlow,
        html: '',
        step,
        projectId,
        assetId,
        slug: null,
      });
      setDraftHint(formatKidLocalDraftHint(saved.savedAt));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hydrated, form, aiFlow, step, projectId, assetId]);

  function setField(key: keyof FreeformForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function validateStep(index: number) {
    const cfg = STEPS[index];
    if (cfg.fields.length === 0) {
      const flowErr = validatePmFlow(aiFlow);
      if (flowErr) { setError(flowErr); return false; }
      setError(null);
      return true;
    }
    if (cfg.fields.some((key) => !form[key].trim())) {
      setError('这一步还有空没填哦！');
      return false;
    }
    setError(null);
    return true;
  }

  async function generate() {
    if (!validateStep(step)) return;
    setBusy(true);
    setError(null);
    try {
      const enableImageUpload = resolveEnableImageUpload({ aiFlow, legacyFlag: form.enableImageUpload });
      const formForGen = { ...form, enableImageUpload };
      const prompt = buildPmWorkflowAppPrompt(formForGen, aiFlow);
      const merged = await generatePmAppWeb(prompt, { aiFlow }, { enableImageUpload });
      const persisted = await persistPmWorkflowApp({
        htmlContent: merged,
        form: formForGen,
        aiFlow,
        projectId,
        assetId,
        parentVersionId: headVersionId,
        versionNotes: '生成小应用',
      });
      setProjectId(persisted.projectId);
      setAssetId(persisted.assetId);
      if (persisted.versionId) setHeadVersionId(persisted.versionId);
      commitPmWorkflowAppLocal({ form, aiFlow, html: merged, persisted });
      router.push('/studio/pm-workflow-app');
    } catch (e: unknown) {
      setError((e as Error)?.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="space-y-4">
      <div className="kid-card-yellow">
        <div className="font-extrabold text-lg">🔗 {tx('AI 工作流小应用')}</div>
        <p className="text-sm text-ink-soft mt-1">四步完成：场景 → 布局 → 交互 → <strong>AI 工作流（DAG）</strong>，把多个 AI 串起来做成小应用。填写内容会<strong>自动保存到本机</strong>。</p>
      </div>
      <KidLocalDraftHint hint={draftHint} />
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button key={s.label} type="button" onClick={() => setStep(i)} className={`text-xs font-bold px-3 py-1.5 rounded-xl border-2 ${step === i ? 'border-amber-500 bg-amber-500 text-white' : i < step ? 'border-emerald-200 bg-emerald-50' : 'border-orange-100 bg-white'}`}>
            {s.label}
          </button>
        ))}
      </div>
      <AiWarning />
      {busy && <AiProgress label="AI 正在生成你的小应用…" />}
      <div className={current.cardClass}>
        <div className="font-extrabold">{current.title}</div>
        <p className="text-xs text-ink-soft mt-1">{current.hint}</p>
        {current.template ? (
          <div className="mt-3">
            <FillBlankSentence layout="form" segments={current.template.segments} blanks={current.template.blanks} values={form as unknown as Record<string, string>} onChange={(k, v) => setField(k as keyof FreeformForm, v)} />
          </div>
        ) : (
          <div className="mt-3"><PmAiFlowEditor value={aiFlow} onChange={setAiFlow} /></div>
        )}
      </div>
      {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {step > 0 && <button type="button" className="kid-button-ghost !py-2 !px-4 text-sm" onClick={() => setStep((s) => s - 1)}>← 上一步</button>}
        {!isLast ? (
          <button type="button" className="kid-button-primary !py-2 !px-4 text-sm" onClick={() => validateStep(step) && setStep((s) => s + 1)}>下一步 →</button>
        ) : (
          <button type="button" className="kid-button-primary !py-2 !px-5 text-sm" onClick={generate} disabled={busy}>✨ 生成小应用</button>
        )}
      </div>
    </div>
  );
}

/** @deprecated 使用 PmWorkflowAppGame */
export const PmMiniAppGame = PmWorkflowAppGame;
