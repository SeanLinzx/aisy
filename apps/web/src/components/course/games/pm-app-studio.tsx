'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { PublishedPageLink } from '@/components/published-page-link';
import { publishPath, extractPublishSlug } from '@/lib/public-url';
import { api } from '@/lib/api';
import { ensurePmAppUsesAi, iteratePmAppWeb } from '@/lib/pm-app-ai-wiring';
import { resolveEnableImageUpload } from '@/lib/ai-image-upload-detect';
import { KidLocalDraftHint } from '@/components/course/kid-local-draft-hint';
import { formatKidLocalDraftHint } from '@/lib/kid-app-local-draft';
import { prefixIterationWish, WEB_ITERATION_UI_HINT } from '@/lib/web-iteration-prompt';
import { refreshAiCampRuntime } from '@ai-camp/types';
import { AiWarning } from '@/components/ai-warning';
import { type PickedElement, describePickedElements } from '@/components/course/html-preview';
import { WebStudioPanel } from '@/components/course/web-studio-panel';
import { WebVersionTree } from '@/components/course/web-version-tree';
import { useLanguage } from '@/contexts/language-context';
import { loadWebProjectHead } from '@/lib/web-project-head';
import { resolveIterationBaseHtml } from '@/lib/web-iteration-base';
import { versionHtml, type WebProjectVersionRow } from '@/lib/web-project-versions';
import {
  buildPmAppIterationPrompt,
  commitPmSingleAppLocal,
  commitPmWorkflowAppLocal,
  loadPmSingleAppState,
  loadPmWorkflowAppState,
  persistPmSingleApp,
  persistPmWorkflowApp,
  type FreeformForm,
} from './pm-mini-app-shared';
import { savePmSingleApp, savePmWorkflowApp, type AiFlowGraph, type PmSingleAiConfig } from '@/lib/pm-pipeline';

const WISH_SUGGESTIONS = [
  '把生成按钮改成真正调用 AI，不要假数据',
  '新增一个 AI 生图板块',
  '按钮颜色改成更活泼的',
  '加一个加载动画',
];

type StudioMode = 'single' | 'workflow';

function useStudioConfig(mode: StudioMode) {
  if (mode === 'single') {
    return {
      gameHref: '/student/course/g/pm-single-app',
      gameTitle: '单 AI 小应用',
      loadState: loadPmSingleAppState,
      persist: persistPmSingleApp,
      save: (p: {
        form: FreeformForm;
        html: string;
        projectId: string;
        assetId: string;
        slug: string;
        singleAi: PmSingleAiConfig;
      }) => savePmSingleApp(p),
    };
  }
  return {
    gameHref: '/student/course/g/pm-workflow-app',
    gameTitle: 'AI 工作流小应用',
    loadState: loadPmWorkflowAppState,
    persist: persistPmWorkflowApp,
    save: (p: {
      form: FreeformForm;
      html: string;
      projectId: string;
      assetId: string;
      slug: string;
      aiFlow: AiFlowGraph;
    }) => savePmWorkflowApp(p),
  };
}

export function PmAppStudio({ mode, embeddedInCreator = false }: { mode: StudioMode; embeddedInCreator?: boolean }) {
  const { tx } = useLanguage();
  const cfg = useStudioConfig(mode);
  const [form, setForm] = useState<FreeformForm | null>(null);
  const [extra, setExtra] = useState<Record<string, unknown> | null>(null);
  const [html, setHtml] = useState('');
  const [instruction, setInstruction] = useState('');
  const [pickedBlocks, setPickedBlocks] = useState<PickedElement[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [versions, setVersions] = useState<WebProjectVersionRow[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const lastServerHtmlRef = useRef('');

  const reloadVersions = useCallback(async (pid: string) => {
    const headState = await loadWebProjectHead(pid);
    if (!headState) return [];
    setVersions(headState.versions);
    if (headState.headVersionId) setActiveVersionId(headState.headVersionId);
    return headState.versions;
  }, []);

  function selectVersion(id: string) {
    const v = versions.find((x) => x.id === id);
    if (!v || !extra) return;
    const aiConfig =
      mode === 'single'
        ? { singleAi: extra.singleAi as PmSingleAiConfig }
        : { aiFlow: extra.aiFlow as AiFlowGraph };
    setActiveVersionId(id);
    const nextHtml = refreshAiCampRuntime(ensurePmAppUsesAi(versionHtml(v), aiConfig));
    lastServerHtmlRef.current = nextHtml;
    setHtml(nextHtml);
    setResetSignal((k) => k + 1);
    setJustSaved(false);
    setError(null);
  }

  const commitPersistedVersion = useCallback(
    async (params: {
      merged: string;
      notes: string;
      nextForm?: FreeformForm;
    }) => {
      if (!form || !extra) return null;
      const nextForm = params.nextForm ?? form;
      if (mode === 'single') {
        const singleAi = extra.singleAi as PmSingleAiConfig;
        const persisted = await persistPmSingleApp({
          htmlContent: params.merged,
          form: nextForm,
          singleAi,
          projectId,
          assetId,
          parentVersionId: activeVersionId,
          versionNotes: params.notes,
        });
        setProjectId(persisted.projectId);
        setAssetId(persisted.assetId);
        setPageUrl(persisted.url);
        if (persisted.versionId) setActiveVersionId(persisted.versionId);
        await reloadVersions(persisted.projectId);
        const saved = commitPmSingleAppLocal({ form: nextForm, singleAi, html: params.merged, persisted });
        setDraftHint(formatKidLocalDraftHint(saved.savedAt));
        lastServerHtmlRef.current = params.merged;
        return persisted;
      }
      const aiFlow = extra.aiFlow as AiFlowGraph;
      const persisted = await persistPmWorkflowApp({
        htmlContent: params.merged,
        form: nextForm,
        aiFlow,
        projectId,
        assetId,
        parentVersionId: activeVersionId,
        versionNotes: params.notes,
      });
      setProjectId(persisted.projectId);
      setAssetId(persisted.assetId);
      setPageUrl(persisted.url);
      if (persisted.versionId) setActiveVersionId(persisted.versionId);
      await reloadVersions(persisted.projectId);
      const saved = commitPmWorkflowAppLocal({ form: nextForm, aiFlow, html: params.merged, persisted });
      setDraftHint(formatKidLocalDraftHint(saved.savedAt));
      lastServerHtmlRef.current = params.merged;
      return persisted;
    },
    [form, extra, mode, projectId, assetId, activeVersionId, reloadVersions],
  );

  function appendWish(text: string) {
    const wish = prefixIterationWish(text);
    setInstruction((prev) => {
      const next = prev.trim();
      if (!next) return wish;
      if (next.includes(text)) return prev;
      return `${next}；${wish}`;
    });
  }

  useEffect(() => {
    cfg
      .loadState()
      .then(async (state) => {
        setForm(state.form);
        const aiConfig: { singleAi: PmSingleAiConfig } | { aiFlow: AiFlowGraph } =
          mode === 'single'
            ? { singleAi: (state as { singleAi: PmSingleAiConfig }).singleAi }
            : { aiFlow: (state as { aiFlow: AiFlowGraph }).aiFlow };
        let wired = refreshAiCampRuntime(ensurePmAppUsesAi(state.html, aiConfig));
        if (state.projectId) {
          const headState = await loadWebProjectHead(state.projectId);
          if (headState?.headHtml.trim()) {
            wired = refreshAiCampRuntime(ensurePmAppUsesAi(headState.headHtml, aiConfig));
            setVersions(headState.versions);
            setActiveVersionId(headState.headVersionId ?? state.headVersionId ?? null);
          } else {
            void reloadVersions(state.projectId);
            if (state.headVersionId) setActiveVersionId(state.headVersionId);
          }
        }
        setHtml(wired);
        lastServerHtmlRef.current = wired;
        setProjectId(state.projectId);
        setAssetId(state.assetId);
        if (state.slug) setPageUrl(publishPath(state.slug));
        if (mode === 'single' && 'singleAi' in state) setExtra({ singleAi: state.singleAi });
        if (mode === 'workflow' && 'aiFlow' in state) setExtra({ aiFlow: state.aiFlow });
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [mode, reloadVersions]);

  useEffect(() => {
    if (!html || !form || !extra || loading || busy) return;
    const timer = window.setTimeout(() => {
      if (mode === 'single') {
        const saved = savePmSingleApp({
          form,
          singleAi: extra.singleAi as PmSingleAiConfig,
          html,
          projectId,
          assetId,
          slug: extractPublishSlug(pageUrl),
          headVersionId: activeVersionId,
        });
        setDraftHint(formatKidLocalDraftHint(saved.savedAt));
      } else {
        const saved = savePmWorkflowApp({
          form,
          aiFlow: extra.aiFlow as AiFlowGraph,
          html,
          projectId,
          assetId,
          slug: extractPublishSlug(pageUrl),
          headVersionId: activeVersionId,
        });
        setDraftHint(formatKidLocalDraftHint(saved.savedAt));
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [html, form, extra, mode, projectId, assetId, pageUrl, loading, busy, activeVersionId]);

  async function saveCurrentVersion() {
    if (!html || !form || !extra || busy || saveBusy) return;
    setSaveBusy(true);
    setError(null);
    setJustSaved(false);
    try {
      const currentHtml = refreshAiCampRuntime(lastServerHtmlRef.current || html);
      await commitPersistedVersion({ merged: currentHtml, notes: '保存当前版本' });
      lastServerHtmlRef.current = currentHtml;
      setHtml(currentHtml);
      setJustSaved(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || '保存失败');
    } finally {
      setSaveBusy(false);
    }
  }

  async function applyIteration() {
    if (!instruction.trim() || !html || !form || !extra) return;
    setBusy(true);
    setError(null);
    setJustSaved(false);
    try {
      const aiConfig =
        mode === 'single'
          ? { singleAi: extra.singleAi as PmSingleAiConfig }
          : { aiFlow: extra.aiFlow as AiFlowGraph };
      const { html: baseHtml } = await resolveIterationBaseHtml({
        projectId,
        activeVersionId,
        versions,
        htmlState: html,
        lastRefHtml: lastServerHtmlRef.current,
      });
      if (!baseHtml.trim()) {
        throw new Error('找不到上一版完整代码，请先在版本树中选择要修改的版本');
      }
      lastServerHtmlRef.current = baseHtml;
      const notes = prefixIterationWish(instruction.trim());
      const prompt = buildPmAppIterationPrompt(baseHtml, notes, describePickedElements(pickedBlocks), aiConfig);
      const enableImageUpload = resolveEnableImageUpload({
        singleAi: mode === 'single' ? (extra.singleAi as PmSingleAiConfig) : undefined,
        aiFlow: mode === 'workflow' ? (extra.aiFlow as AiFlowGraph) : undefined,
        legacyFlag: form.enableImageUpload,
      });
      const merged = await iteratePmAppWeb(prompt, aiConfig, { enableImageUpload, instruction: notes, baseHtml });
      lastServerHtmlRef.current = merged;
      setHtml(merged);
      setInstruction('');
      setPickedBlocks([]);
      setResetSignal((k) => k + 1);
      await commitPersistedVersion({ merged, notes });
      setJustSaved(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || '修改失败');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-sm text-ink-soft">{tx('正在加载…')}</div>;

  if (!html || !form) {
    return (
      <div className="kid-card space-y-3">
        <p className="text-sm text-ink-soft">{tx('还没有生成小应用，请先返回填空生成。')}</p>
        <Link href={cfg.gameHref} className="kid-button-primary inline-block !py-2 !px-4 text-sm">
          ← 返回{cfg.gameTitle}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AiWarning />
      <KidLocalDraftHint hint={draftHint} />
      {justSaved && (
        <div className="kid-card-mint text-sm text-emerald-800 font-bold">
          {tx('✅ 已保存新版本到版本树，并同步到本机！')}
        </div>
      )}
      {!embeddedInCreator && (
        <div className="flex flex-wrap gap-2">
          <Link href={cfg.gameHref} className="kid-button-ghost !py-2 !px-4 text-sm">
            ← 返回修改设置
          </Link>
        </div>
      )}
      <WebStudioPanel
        html={html}
        versionTree={
          versions.length > 0 ? (
            <WebVersionTree
              embedded
              versions={versions}
              currentId={activeVersionId}
              onSelect={selectVersion}
              projectId={projectId}
              onVersionsChange={setVersions}
            />
          ) : null
        }
        onSaveCurrentVersion={saveCurrentVersion}
        saveVersionBusy={saveBusy}
        saveVersionLabel={tx('💾 保存当前版本')}
        publishHref={pageUrl}
        publishLabel={tx('打开页面')}
        exportHtml={html}
        exportFilename={form?.topic || 'mini-app'}
        instruction={instruction}
        onInstructionChange={setInstruction}
        pickedBlocks={pickedBlocks}
        onAddBlock={(el) => setPickedBlocks((p) => (p.some((b) => b.outerHtml === el.outerHtml) ? p : [...p, el]))}
        onRemoveBlock={(i) => setPickedBlocks((p) => p.filter((_, idx) => idx !== i))}
        onClearBlocks={() => setPickedBlocks([])}
        onApply={applyIteration}
        busy={busy}
        error={error}
        resetSignal={resetSignal}
        extra={
          <div className="space-y-2 mt-2">
            <p className="text-[10px] text-ink-soft leading-relaxed">{tx(WEB_ITERATION_UI_HINT)}</p>
            <div className="flex flex-wrap gap-1">
            {WISH_SUGGESTIONS.map((w) => (
              <button key={w} type="button" className="text-[10px] px-2 py-1 rounded-lg border border-orange-100" onClick={() => appendWish(w)}>
                {w}
              </button>
            ))}
            </div>
          </div>
        }
      />
    </div>
  );
}

export function PmSingleAppStudio({ embeddedInCreator = false }: { embeddedInCreator?: boolean }) {
  return <PmAppStudio mode="single" embeddedInCreator={embeddedInCreator} />;
}

export function PmWorkflowAppStudio() {
  return <PmAppStudio mode="workflow" />;
}

/** @deprecated */
export const PmMiniAppStudio = PmWorkflowAppStudio;
