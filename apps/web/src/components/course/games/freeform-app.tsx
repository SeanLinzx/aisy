'use client';

import { useLanguage } from '@/contexts/language-context';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublishedPageLink } from '@/components/published-page-link';
import { publishPath, extractPublishSlug } from '@/lib/public-url';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AI_GENERATE_WEB_PROGRESS_ESTIMATE, AI_GENERATE_WEB_PROGRESS_MS, AI_GENERATE_WEB_TIMEOUT_MS } from '@/lib/ai-generate-timeouts';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { FillBlankSentence } from '@/components/course/fill-blank-sentence';
import {
  DEFAULT_FORM,
  INTERACTION_TEMPLATE,
  LAYOUT_TEMPLATE,
  SCENE_TEMPLATE,
  buildFreeformPrompt,
  loadFreeformAppLocal,
  loadFreeformAppState,
  mergeWebHtml,
  persistFreeformApp,
  saveFreeformAppLocal,
  type FreeformForm,
} from './freeform-app-shared';
import { finalizeKidWebHtml } from '@/lib/web-upload-block';
import { readKidLocalDraft } from '@/lib/kid-app-local-draft';
import { FREEFORM_APP_LOCAL_KEY } from './freeform-app-shared';
import { KidLocalDraftHint } from '@/components/course/kid-local-draft-hint';
import { formatKidLocalDraftHint, useKidLocalDraftSaver } from '@/lib/kid-app-local-draft';

const CONFIG_STEPS = [
  {
    label: '① 场景',
    title: '📍 第一步 · 填空描述场景',
    hint: '在输入框里写下你想做什么小应用、给谁用、什么时候用。下面的参考词只是灵感，也可以完全自己写。',
    cardClass: 'kid-card-orange',
    template: SCENE_TEMPLATE,
    fields: ['topic', 'audience', 'scenario'] as const,
  },
  {
    label: '② 布局',
    title: '🧱 第二步 · 填空摆好布局',
    hint: '在输入框里描述页面上要有哪些东西。没想好可以点参考词，也可以全部自己写。',
    cardClass: 'kid-card-sky',
    template: LAYOUT_TEMPLATE,
    fields: ['layoutItems'] as const,
  },
  {
    label: '③ 交互',
    title: '👆 第三步 · 填空设计交互',
    hint: '写下用户点哪里、页面会出现什么。可以自由发挥，参考词只是帮助你想主意。',
    cardClass: 'kid-card-purple',
    template: INTERACTION_TEMPLATE,
    fields: ['clickTarget', 'feedback'] as const,
  },
] as const;

export function FreeformAppGame() {
  const { tx } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState<FreeformForm>(DEFAULT_FORM);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const { hint: draftHint } = useKidLocalDraftSaver({
    storageKey: FREEFORM_APP_LOCAL_KEY,
    enabled: hydrated,
    data: { form, step, html: '', projectId, assetId, slug: extractPublishSlug(pageUrl) },
  });

  function setField(key: keyof FreeformForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  useEffect(() => {
    const localEnv = readKidLocalDraft<{ form: FreeformForm; step: number }>(FREEFORM_APP_LOCAL_KEY);
    loadFreeformAppState()
      .then((state) => {
        const local = loadFreeformAppLocal();
        const preferLocal =
          local &&
          localEnv &&
          (!state.hasSaved || localEnv.savedAt > Date.now() - 7 * 24 * 3600_000);
        if (preferLocal && local) {
          setForm(local.form);
          setStep(local.step ?? 0);
          setProjectId(local.projectId ?? state.projectId);
          setAssetId(local.assetId ?? state.assetId);
        } else {
          setForm(state.form);
          setProjectId(state.projectId);
          setAssetId(state.assetId);
        }
        setHasSaved(state.hasSaved);
        if (state.slug) setPageUrl(publishPath(state.slug));
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  function validateStep(index: number) {
    const cfg = CONFIG_STEPS[index];
    const missing = cfg.fields.some((key) => !form[key].trim());
    if (missing) {
      setError('这一步还有空没填哦！请在输入框里写下内容，或点参考词填入。');
      return false;
    }
    setError(null);
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => s + 1);
  }

  async function generate() {
    if (!validateStep(step)) return;
    setBusy(true);
    setError(null);
    try {
      const prompt = buildFreeformPrompt(form);
      const r = await api.post('/ai-generate/web', { prompt, interactive: true, aiCamp: true }, { timeout: AI_GENERATE_WEB_TIMEOUT_MS });
      const merged = finalizeKidWebHtml(
        mergeWebHtml({ html: r.data.html || '', css: r.data.css || '', js: r.data.js || '' }),
        { enableImageUpload: form.enableImageUpload },
      );

      const persisted = await persistFreeformApp({ htmlContent: merged, form, projectId, assetId });
      setProjectId(persisted.projectId);
      setAssetId(persisted.assetId);
      setHasSaved(true);
      saveFreeformAppLocal({
        form,
        step,
        html: merged,
        projectId: persisted.projectId,
        assetId: persisted.assetId,
        slug: persisted.slug,
      });

      router.push('/studio/freeform-app');
    } catch (e: unknown) {
      setError((e as Error)?.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  const current = CONFIG_STEPS[step];
  const isFirstStep = step === 0;
  const isLastStep = step === CONFIG_STEPS.length - 1;

  return (
    <div className="space-y-3 max-h-[calc(100vh-8rem)] flex flex-col">
      <div className="kid-card-yellow !p-4 shrink-0">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🪄 分三步完成：先在<b>{tx('输入框')}</b>里自由写下场景、布局、交互，AI 会帮你做成小应用。填写内容会<b>自动保存到本机</b>，下次打开可继续编辑。
        </p>
      </div>

      <KidLocalDraftHint hint={draftHint} />

      {hasSaved && (
        <div className="kid-card-mint !p-3 space-y-2 shrink-0">
          <div className="font-extrabold text-emerald-800 text-sm">{tx('✅ 你已有一个 AI 小应用')}</div>
          <div className="flex flex-wrap gap-2">
            <Link href="/studio/freeform-app" className="kid-button-primary !py-2 !px-4 text-sm">
              🔄 进入预览与修改页
            </Link>
            {pageUrl && (
              <PublishedPageLink href={pageUrl} className="kid-button-ghost !py-2 !px-4 text-sm">
                🌐 打开我的小应用
              </PublishedPageLink>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 text-xs shrink-0">
        {CONFIG_STEPS.map((s, i) => {
          const active = step === i;
          const visited = i < step;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setError(null);
                setStep(i);
              }}
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

      <div className={`${current.cardClass} !p-4 space-y-3 flex-1 min-h-0 overflow-y-auto`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold">{current.title}</div>
          <span className="text-xs font-bold text-ink-soft shrink-0">
            {step + 1} / {CONFIG_STEPS.length}
          </span>
        </div>
        <p className="text-xs font-semibold text-ink-soft">{current.hint}</p>
        <FillBlankSentence
          layout="form"
          segments={current.template.segments}
          blanks={current.template.blanks}
          values={form as unknown as Record<string, string>}
          onChange={(k, v) => setField(k as keyof FreeformForm, v)}
        />
      </div>

      <div className="kid-card !p-4 space-y-3 shrink-0">
        <div className="flex flex-wrap gap-2">
          {!isFirstStep && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep((s) => s - 1);
              }}
              className="kid-button-ghost !py-2 !px-4 text-sm"
            >
              ← 上一步
            </button>
          )}
          {!isLastStep ? (
            <button type="button" onClick={goNext} className="kid-button-primary !py-2 !px-4 text-sm ml-auto">
              下一步 →
            </button>
          ) : (
            <button onClick={generate} disabled={busy} className="kid-button-primary !py-2 !px-4 text-sm ml-auto">
              {busy ? '🪄 AI 正在制作…' : `🚀 ${hasSaved ? '重新生成我的小应用' : '生成我的小应用'}`}
            </button>
          )}
        </div>
        {busy && (
          <AiProgress
            label={tx('AI 正在按你的场景/布局/交互制作小应用…')}
            estimate={AI_GENERATE_WEB_PROGRESS_ESTIMATE}
            durationMs={AI_GENERATE_WEB_PROGRESS_MS}
          />
        )}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{tx(error)}</div>}
      </div>
      <AiWarning />
    </div>
  );
}
