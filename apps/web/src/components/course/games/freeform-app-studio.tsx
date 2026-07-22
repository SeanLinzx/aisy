'use client';

import { useLanguage } from '@/contexts/language-context';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { PublishedPageLink } from '@/components/published-page-link';
import { publishPath, extractPublishSlug } from '@/lib/public-url';
import { AiWarning } from '@/components/ai-warning';
import { type PickedElement, describePickedElements } from '@/components/course/html-preview';
import { WebStudioPanel } from '@/components/course/web-studio-panel';
import { WebVersionTree } from '@/components/course/web-version-tree';
import {
  buildFreeformIterationPrompt,
  FREEFORM_APP_LOCAL_KEY,
  loadFreeformAppLocal,
  loadFreeformAppState,
  persistFreeformApp,
  saveFreeformAppLocal,
  type FreeformForm,
} from './freeform-app-shared';
import { postProcessWebAppHtml } from '@/lib/pm-app-ai-wiring';
import { runWebStudioIteration } from '@/lib/run-web-iteration';
import { resolveIterationBaseHtml } from '@/lib/web-iteration-base';
import { appendIterationTurn, type IterationChatMessage } from '@/lib/web-iteration-history';
import { KidLocalDraftHint } from '@/components/course/kid-local-draft-hint';
import { formatKidLocalDraftHint, readKidLocalDraft } from '@/lib/kid-app-local-draft';
import { prefixIterationWish, WEB_ITERATION_UI_HINT } from '@/lib/web-iteration-prompt';
import { loadWebProjectHead } from '@/lib/web-project-head';
import { versionHtml, type WebProjectVersionRow } from '@/lib/web-project-versions';

const WISH_SUGGESTIONS = [
  '我想多加一种内容',
  '把背景颜色改成我喜欢的颜色',
  '标题旁边加一个 emoji',
  '点击后弹出更详细的介绍',
  '加一个「重新开始」按钮',
  '字体再大一点，方便阅读',
];

export function FreeformAppStudio() {
  const { tx } = useLanguage();
  const [form, setForm] = useState<FreeformForm | null>(null);
  const [html, setHtml] = useState('');
  const [instruction, setInstruction] = useState('');
  const [pickedBlocks, setPickedBlocks] = useState<PickedElement[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [headVersionId, setHeadVersionId] = useState<string | null>(null);
  const [versions, setVersions] = useState<WebProjectVersionRow[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const [iterationHistory, setIterationHistory] = useState<IterationChatMessage[]>([]);
  const lastServerHtmlRef = useRef('');

  const reloadVersions = useCallback(async (pid: string) => {
    const headState = await loadWebProjectHead(pid);
    if (!headState) return [];
    setVersions(headState.versions);
    if (headState.headVersionId) setHeadVersionId(headState.headVersionId);
    return headState.versions;
  }, []);

  function selectVersion(id: string) {
    const v = versions.find((x) => x.id === id);
    if (!v) return;
    const nextHtml = versionHtml(v);
    setHeadVersionId(id);
    lastServerHtmlRef.current = nextHtml;
    setHtml(nextHtml);
    setResetSignal((k) => k + 1);
    setJustSaved(false);
    setError(null);
  }

  useEffect(() => {
    loadFreeformAppState()
      .then(async (state) => {
        const local = loadFreeformAppLocal();
        const localEnv = readKidLocalDraft(FREEFORM_APP_LOCAL_KEY);
        const localHtml = local?.html?.trim();
        setForm(state.form);
        let nextHtml = state.html?.trim() ? state.html : localHtml || '';
        if (state.projectId) {
          const headState = await loadWebProjectHead(state.projectId);
          if (headState?.headHtml.trim()) {
            nextHtml = headState.headHtml;
            setVersions(headState.versions);
            setHeadVersionId(headState.headVersionId ?? state.headVersionId ?? null);
          } else {
            void reloadVersions(state.projectId);
            setHeadVersionId(state.headVersionId ?? null);
          }
        } else {
          setHeadVersionId(state.headVersionId ?? null);
        }
        setHtml(nextHtml);
        lastServerHtmlRef.current = nextHtml;
        setProjectId(state.projectId);
        setAssetId(state.assetId);
        if (state.slug) setPageUrl(publishPath(state.slug));
        if (localEnv?.savedAt) setDraftHint(formatKidLocalDraftHint(localEnv.savedAt));
      })
      .catch(() => setError('加载失败，请返回重新生成。'))
      .finally(() => setLoading(false));
  }, [reloadVersions]);

  useEffect(() => {
    if (!form || !html.trim() || loading) return;
    const timer = window.setTimeout(() => {
      saveFreeformAppLocal({
        form,
        step: 0,
        html,
        projectId,
        assetId,
        slug: extractPublishSlug(pageUrl),
      });
      setDraftHint(formatKidLocalDraftHint(Date.now()));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form, html, projectId, assetId, pageUrl, loading]);

  function addBlock(el: PickedElement) {
    setPickedBlocks((prev) => (prev.some((b) => b.outerHtml === el.outerHtml) ? prev : [...prev, el]));
  }
  function removeBlock(index: number) {
    setPickedBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function appendWish(text: string) {
    const wish = prefixIterationWish(text);
    setInstruction((prev) => {
      const next = prev.trim();
      if (!next) return wish;
      if (next.includes(text)) return prev;
      return `${next}；${wish}`;
    });
  }

  async function applyIteration() {
    if (!instruction.trim() || !html || !form) return;
    setBusy(true);
    setError(null);
    setJustSaved(false);
    try {
      const { html: baseHtml } = await resolveIterationBaseHtml({
        projectId,
        activeVersionId: headVersionId,
        versions,
        htmlState: html,
        lastRefHtml: lastServerHtmlRef.current,
      });
      if (!baseHtml.trim()) {
        throw new Error('找不到上一版完整代码，请先在版本树中选择要修改的版本');
      }
      lastServerHtmlRef.current = baseHtml;
      const wish = prefixIterationWish(instruction);
      const prompt = buildFreeformIterationPrompt(baseHtml, wish, describePickedElements(pickedBlocks));
      const merged = await runWebStudioIteration({
        prompt,
        baseHtml,
        instruction: wish,
        messages: iterationHistory,
        postProcess: (h) => postProcessWebAppHtml(h, { instruction: wish }),
      });
      lastServerHtmlRef.current = merged;
      setHtml(merged);
      setIterationHistory((prev) => appendIterationTurn(prev, wish));
      setInstruction('');
      setPickedBlocks([]);
      setResetSignal((k) => k + 1);

      const persisted = await persistFreeformApp({
        htmlContent: merged,
        form,
        projectId,
        assetId,
        parentVersionId: headVersionId,
        versionNotes: wish,
        promptOverride: prompt,
      });
      setProjectId(persisted.projectId);
      setAssetId(persisted.assetId);
      setPageUrl(persisted.url);
      if (persisted.versionId) setHeadVersionId(persisted.versionId);
      if (persisted.projectId) await reloadVersions(persisted.projectId);
      setJustSaved(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || '修改失败');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-ink-soft font-semibold">{tx('正在加载你的小应用…')}</div>;
  }

  if (!html || !form) {
    return (
      <div className="kid-card space-y-3">
        <p className="text-sm text-ink-soft">{tx('还没有生成小应用，请先返回填空生成。')}</p>
        <Link href="/student/course/g/freeform-app" className="kid-button-primary inline-block !py-2 !px-4 text-sm">
          ← 返回做自己的 AI 小应用
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <KidLocalDraftHint hint={draftHint} />
      <div className="flex flex-wrap gap-2">
        <Link href="/student/course/g/freeform-app" className="kid-button-ghost !py-2 !px-4 text-sm">
          ← 返回修改设置
        </Link>
        {pageUrl && (
          <PublishedPageLink href={pageUrl} className="kid-button-primary !py-2 !px-4 text-sm">
            🌐 打开我的小应用
          </PublishedPageLink>
        )}
      </div>

      {justSaved && (
        <div className="kid-card-mint text-sm text-emerald-800 font-bold">{tx('✅ 修改已生效，并自动保存了新版本！')}</div>
      )}

      <div className="kid-card-yellow !p-4 space-y-2">
        <div className="text-sm font-bold">{tx('💡 还想加什么？')}</div>
        <p className="text-xs text-ink-soft leading-relaxed">
          小应用已经做好了！你可以点下面的想法快速填入，也可以自己在右边输入框里写下任何想要的需求。
        </p>
        <div className="flex flex-wrap gap-1.5">
          {WISH_SUGGESTIONS.map((wish) => (
            <button
              key={wish}
              type="button"
              onClick={() => appendWish(wish)}
              className="kid-button-sm border-2 bg-white text-ink-soft border-orange-200 hover:border-orange-300"
            >
              ➕ {wish}
            </button>
          ))}
        </div>
      </div>

      <WebStudioPanel
        html={html}
        previewHeight={480}
        panelTitle={tx('🪄 我的 AI 小应用 · 实时预览')}
        versionTree={
          versions.length > 0 ? (
            <WebVersionTree
              embedded
              versions={versions}
              currentId={headVersionId}
              onSelect={selectVersion}
              projectId={projectId}
              onVersionsChange={setVersions}
            />
          ) : null
        }
        publishHref={pageUrl}
        publishLabel={tx('打开页面')}
        exportHtml={html}
        exportFilename={form?.topic || 'freeform-app'}
        instruction={instruction}
        onInstructionChange={setInstruction}
        pickedBlocks={pickedBlocks}
        onAddBlock={addBlock}
        onRemoveBlock={removeBlock}
        onClearBlocks={() => setPickedBlocks([])}
        onApply={applyIteration}
        busy={busy}
        error={error}
        resetSignal={resetSignal}
        placeholder={tx('在这里写下你想加的内容，比如：我想多加一种动物、把标题改成粉色…')}
        busyLabel={tx('✨ AI 正在按你的想法修改并保存…')}
        applyLabel={tx('✨ 应用我的想法')}
        hint={tx('左边可以试玩小应用。想改某个部分？切到「点选加入」点一下页面里的块，再在右边写下你的想法。')}
        extra={<AiWarning extra={tx(WEB_ITERATION_UI_HINT)} />}
      />
    </div>
  );
}
