'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { FillBlankSentence } from '@/components/course/fill-blank-sentence';
import { PmSingleAiEditor } from '@/components/course/pm-single-ai-editor';
import { useLanguage } from '@/contexts/language-context';
import { api } from '@/lib/api';
import { generatePmAppWeb } from '@/lib/pm-app-ai-wiring';
import { KidLocalDraftHint } from '@/components/course/kid-local-draft-hint';
import { formatKidLocalDraftHint } from '@/lib/kid-app-local-draft';
import { resolveEnableImageUpload } from '@/lib/ai-image-upload-detect';
import { buildPrdToFormPrompt, hasPmPrdContent, normalizePmAiType, parsePrdToFormReply, prdToMarkdown } from '@/lib/pm-prompts';
import {
  DEFAULT_SINGLE_AI,
  loadPmRequirements,
  loadPmSingleApp,
  savePmSingleApp,
  type PmSingleAiConfig,
  type PmCreatorEmbedProps,
} from '@/lib/pm-pipeline';
import {
  buildPmSingleAppPrompt,
  commitPmSingleAppLocal,
  DEFAULT_FORM,
  INTERACTION_TEMPLATE,
  LAYOUT_TEMPLATE,
  persistPmSingleApp,
  SCENE_TEMPLATE,
  validateSingleAi,
  type FreeformForm,
} from './pm-mini-app-shared';
import { PmSingleAppStudio } from './pm-app-studio';

const STEPS = [
  { label: '① 场景', title: '📍 第一步 · 填空描述场景', hint: '描述你想做什么小应用、给谁用、什么时候用。', cardClass: 'kid-card-orange', template: SCENE_TEMPLATE, fields: ['topic', 'audience', 'scenario'] as const },
  { label: '② 布局', title: '🧱 第二步 · 填空摆好布局', hint: '描述页面上要有哪些东西。', cardClass: 'kid-card-sky', template: LAYOUT_TEMPLATE, fields: ['layoutItems'] as const },
  { label: '③ 交互', title: '👆 第三步 · 填空设计交互', hint: '写下用户点哪里、页面会出现什么。', cardClass: 'kid-card-purple', template: INTERACTION_TEMPLATE, fields: ['clickTarget', 'feedback'] as const },
  { label: '④ 单个 AI', title: '🤖 第四步 · 配置一个 AI', hint: '选一种 AI（生文/生图/生视频），写清楚输入和输出。', cardClass: 'kid-card-mint', template: null, fields: [] as const },
] as const;

export function PmSingleAppGame({ embedded, onNextStep }: PmCreatorEmbedProps = {}) {
  const { tx } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState<FreeformForm>(DEFAULT_FORM);
  const [singleAi, setSingleAi] = useState<PmSingleAiConfig>(DEFAULT_SINGLE_AI);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [headVersionId, setHeadVersionId] = useState<string | null>(null);

  useEffect(() => {
    const data = loadPmSingleApp();
    if (data) {
      setForm(data.form);
      setSingleAi(data.singleAi);
      setStep(data.step ?? 0);
      setProjectId(data.projectId ?? null);
      setAssetId(data.assetId ?? null);
      if (data.savedAt) setDraftHint(formatKidLocalDraftHint(data.savedAt));
      if (data.headVersionId) setHeadVersionId(data.headVersionId);
      if (data.html?.trim() || data.projectId) setGenerated(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const existing = loadPmSingleApp();
      const saved = savePmSingleApp({
        form,
        singleAi,
        html: existing?.html ?? '',
        step,
        projectId,
        assetId,
        slug: existing?.slug ?? null,
        headVersionId,
      });
      setDraftHint(formatKidLocalDraftHint(saved.savedAt));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [hydrated, form, singleAi, step, projectId, assetId, headVersionId]);

  function setField(key: keyof FreeformForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function validateStep(index: number) {
    const cfg = STEPS[index];
    if (cfg.fields.length === 0) {
      const err = validateSingleAi(singleAi);
      if (err) { setError(err); return false; }
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

  async function translateFromPrd() {
    const saved = loadPmRequirements();
    if (!saved || !hasPmPrdContent(saved.prd, saved.interest)) {
      setError('还没有需求说明书，请先完成第 1 步（对话完成后点「下一步」即可，无需先存素材库）。');
      return;
    }
    setTranslating(true);
    setError(null);
    setTranslated(false);
    try {
      const prompt = buildPrdToFormPrompt(prdToMarkdown(saved.prd), saved.interest);
      const r = await api.post('/ai-generate/text', { prompt, saveAsAsset: false }, { timeout: 120_000 });
      const rawText = String(r.data?.text ?? r.data ?? '').trim();
      const parsed = parsePrdToFormReply(rawText);
      if (!parsed) {
        throw new Error('AI 返回格式无法识别，请再点一次「从需求说明书 AI 填表」重试。');
      }
      const filled = [
        parsed.topic,
        parsed.audience,
        parsed.scenario,
        parsed.layoutItems,
        parsed.clickTarget,
        parsed.feedback,
        parsed.aiLabel,
        parsed.aiInputDesc,
        parsed.aiOutputDesc,
      ].some((v) => typeof v === 'string' && v.trim());
      if (!filled) {
        throw new Error('AI 没有填出有效内容，请确认第 1 步说明书已填写完整后再试。');
      }

      const aiType = normalizePmAiType(parsed.aiType);
      const featureSummary = saved.prd.features?.length ? saved.prd.features.join('、') : '';
      setForm((prev) => ({
        ...prev,
        topic: parsed.topic?.trim() || saved.prd.productName?.trim() || prev.topic,
        audience: parsed.audience?.trim() || saved.prd.targetUsers?.trim() || prev.audience,
        scenario: parsed.scenario?.trim() || saved.prd.scenario?.trim() || prev.scenario,
        layoutItems: parsed.layoutItems?.trim() || featureSummary || prev.layoutItems,
        clickTarget: parsed.clickTarget?.trim() || prev.clickTarget,
        feedback: parsed.feedback?.trim() || saved.prd.problem?.trim() || prev.feedback,
      }));
      setSingleAi((prev) => ({
        ...prev,
        label: parsed.aiLabel?.trim() || saved.prd.productName?.trim() || prev.label,
        type: aiType,
        inputMode: aiType === 'image' || aiType === 'video' ? 'image' : 'text',
        inputDesc: parsed.aiInputDesc?.trim() || prev.inputDesc,
        outputDesc: parsed.aiOutputDesc?.trim() || prev.outputDesc,
      }));
      setStep(0);
      setTranslated(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || '转译失败');
    } finally {
      setTranslating(false);
    }
  }

  async function generate() {
    if (!validateStep(step)) return;
    setBusy(true);
    setError(null);
    try {
      const enableImageUpload = resolveEnableImageUpload({ singleAi, legacyFlag: form.enableImageUpload });
      const formForGen = { ...form, enableImageUpload };
      const prompt = buildPmSingleAppPrompt(formForGen, singleAi);
      const merged = await generatePmAppWeb(prompt, { singleAi }, { enableImageUpload });
      const persisted = await persistPmSingleApp({
        htmlContent: merged,
        form: formForGen,
        singleAi,
        projectId,
        assetId,
        parentVersionId: headVersionId,
        versionNotes: embedded ? 'AI 应用创作者 · 生成小应用' : '生成小应用',
      });
      setProjectId(persisted.projectId);
      setAssetId(persisted.assetId);
      if (persisted.versionId) setHeadVersionId(persisted.versionId);
      commitPmSingleAppLocal({ form, singleAi, html: merged, persisted });
      setGenerated(true);
      if (!embedded) {
        router.push('/studio/pm-single-app');
      }
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
      {embedded && generated ? (
        <>
          <div className="kid-card-mint space-y-2">
            <p className="text-sm font-bold text-emerald-700">✅ 小应用已生成！每次修改都会自动保存为新版本。</p>
            <div className="flex flex-wrap gap-2">
              {onNextStep && (
                <button type="button" className="kid-button-primary !py-2 !px-5 text-sm" onClick={onNextStep}>
                  下一步：准备路演材料 →
                </button>
              )}
              <button type="button" className="kid-button-ghost !py-2 !px-4 text-sm" onClick={() => setGenerated(false)}>
                ← 重新填表并生成
              </button>
            </div>
          </div>
          <PmSingleAppStudio embeddedInCreator />
        </>
      ) : (
        <>
      {!embedded && (
        <div className="kid-card-yellow">
          <div className="font-extrabold text-lg">🪄 {tx('单 AI 小应用')}</div>
          <p className="text-sm text-ink-soft mt-1">四步完成：场景 → 布局 → 交互 → 配置<strong>一个</strong> AI，然后生成小应用。填写内容会<strong>自动保存到本机</strong>。</p>
        </div>
      )}
      {embedded && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="kid-button-ghost !py-2 !px-4 text-sm"
            onClick={translateFromPrd}
            disabled={translating || busy}
          >
            ✨ {tx('从需求说明书 AI 填表')}
          </button>
          <span className="text-xs text-ink-soft">
            {tx('会把第 1 步的对话成果转译成场景、布局、交互和 AI 配置（本机已自动保存，无需先存素材库）')}
          </span>
          {translated && (
            <span className="text-xs font-bold text-emerald-600 w-full">
              ✅ 已根据需求说明书填好，请逐步检查各步内容后再生成
            </span>
          )}
        </div>
      )}
      <KidLocalDraftHint hint={draftHint} />
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button key={s.label} type="button" onClick={() => setStep(i)} className={`text-xs font-bold px-3 py-1.5 rounded-xl border-2 ${step === i ? 'border-amber-500 bg-amber-500 text-white' : i < step ? 'border-emerald-200 bg-emerald-50' : 'border-orange-100 bg-white'}`}>
            {s.label}
          </button>
        ))}
      </div>
      <AiWarning />
      {(busy || translating) && (
        <AiProgress label={translating ? 'AI 正在把需求说明书转译成填表内容…' : 'AI 正在生成你的小应用…'} />
      )}
      <div className={current.cardClass}>
        <div className="font-extrabold">{current.title}</div>
        <p className="text-xs text-ink-soft mt-1">{current.hint}</p>
        {current.template ? (
          <div className="mt-3">
            <FillBlankSentence layout="form" segments={current.template.segments} blanks={current.template.blanks} values={form as unknown as Record<string, string>} onChange={(k, v) => setField(k as keyof FreeformForm, v)} />
          </div>
        ) : (
          <div className="mt-3"><PmSingleAiEditor value={singleAi} onChange={setSingleAi} /></div>
        )}
      </div>
      {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {step > 0 && <button type="button" className="kid-button-ghost !py-2 !px-4 text-sm" onClick={() => setStep((s) => s - 1)}>← 上一步</button>}
        {!isLast ? (
          <button type="button" className="kid-button-primary !py-2 !px-4 text-sm" onClick={() => validateStep(step) && setStep((s) => s + 1)}>下一步 →</button>
        ) : (
          <button type="button" className="kid-button-primary !py-2 !px-5 text-sm" onClick={generate} disabled={busy || translating}>
            ✨ {generated ? '重新生成小应用（保存新版本）' : '生成小应用'}
          </button>
        )}
      </div>
        </>
      )}
    </div>
  );
}
