'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { PublishedPageLink } from '@/components/published-page-link';
import { postProcessWebAppHtml } from '@/lib/pm-app-ai-wiring';
import { runWebStudioIteration } from '@/lib/run-web-iteration';
import { resolveIterationBaseHtml } from '@/lib/web-iteration-base';
import { appendIterationTurn, type IterationChatMessage } from '@/lib/web-iteration-history';
import { useLanguage } from '@/contexts/language-context';
import { AiWarning } from '@/components/ai-warning';
import { type PickedElement, describePickedElements } from '@/components/course/html-preview';
import { WebStudioPanel } from '@/components/course/web-studio-panel';
import { WebVersionTree } from '@/components/course/web-version-tree';
import { prefixIterationWish, WEB_ITERATION_UI_HINT } from '@/lib/web-iteration-prompt';
import { loadWebProjectHead } from '@/lib/web-project-head';
import { versionHtml, type WebProjectVersionRow } from '@/lib/web-project-versions';
import {
  MEMORY_MATCH_TITLE,
  buildMemoryMatchIterationPrompt,
  ensureMemoryMatchStarter,
  persistMemoryMatch,
  type MemoryMatchForm,
} from './memory-match-shared';

export function MemoryMatchStudio() {
  const { tx } = useLanguage();
  const [form, setForm] = useState<MemoryMatchForm | null>(null);
  const [html, setHtml] = useState('');
  const [instruction, setInstruction] = useState('');
  const [pickedBlocks, setPickedBlocks] = useState<PickedElement[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [headVersionId, setHeadVersionId] = useState<string | null>(null);
  const [versions, setVersions] = useState<WebProjectVersionRow[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
    ensureMemoryMatchStarter()
      .then(async (state) => {
        setForm(state.form);
        let nextHtml = state.html;
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
        setSlug(state.slug);
      })
      .catch(() => setError('加载失败，请返回课程页重试。'))
      .finally(() => setLoading(false));
  }, [reloadVersions]);

  function addBlock(el: PickedElement) {
    setPickedBlocks((prev) => (prev.some((b) => b.outerHtml === el.outerHtml) ? prev : [...prev, el]));
  }
  function removeBlock(index: number) {
    setPickedBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  async function applyEdit() {
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
      const prompt = buildMemoryMatchIterationPrompt(baseHtml, wish, describePickedElements(pickedBlocks));
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

      const result = await persistMemoryMatch({
        htmlContent: merged,
        form,
        projectId,
        assetId,
        parentVersionId: headVersionId,
        versionNotes: wish,
        promptOverride: prompt,
      });
      setProjectId(result.projectId);
      setSlug(result.slug);
      setAssetId(result.assetId);
      if (result.versionId) setHeadVersionId(result.versionId);
      if (result.projectId) await reloadVersions(result.projectId);
      setJustSaved(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || '修改失败');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-ink-soft font-semibold">{tx('正在加载')}{tx(MEMORY_MATCH_TITLE)}{tx('…')}</div>;
  }

  if (!html || !form) {
    return (
      <div className="kid-card space-y-3">
        <p className="text-sm text-ink-soft">{tx('还没有加载到')}{tx(MEMORY_MATCH_TITLE)}{tx('，请返回课程页。')}</p>
        <Link href="/student/course/g/memory-match" className="kid-button-primary inline-block !py-2 !px-4 text-sm">
          ← {tx('返回')}{tx(MEMORY_MATCH_TITLE)}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/student/course/g/memory-match" className="kid-button-ghost !py-2 !px-4 text-sm">
          {tx('← 返回记忆力挑战')}
        </Link>
        <Link href="/student/course/g/memory-match-create" className="kid-button-ghost !py-2 !px-4 text-sm">
          {tx('🎨 用选择题重新设计')}
        </Link>
        {slug && (
          <PublishedPageLink slug={slug} className="kid-button-primary !py-2 !px-4 text-sm">
            {tx('🌐 打开游戏网页')}
          </PublishedPageLink>
        )}
      </div>

      {justSaved && (
        <div className="kid-card-mint text-sm text-emerald-800 font-bold">{tx('✅ 修改已生效，并自动保存了一个新版本！')}</div>
      )}

      <WebStudioPanel
        html={html}
        previewHeight={640}
        panelTitle={`🕵️ ${tx(MEMORY_MATCH_TITLE)} · ${tx('实时预览')}`}
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
        instruction={instruction}
        onInstructionChange={setInstruction}
        pickedBlocks={pickedBlocks}
        onAddBlock={addBlock}
        onRemoveBlock={removeBlock}
        onClearBlocks={() => setPickedBlocks([])}
        onApply={applyEdit}
        busy={busy}
        error={error ? tx(error) : null}
        resetSignal={resetSignal}
        placeholder={tx('例如：卡背换成放大镜图案，配色改成青绿色黑板风')}
        busyLabel={tx('✨ AI 正在修改并保存…')}
        applyLabel={tx('✨ 应用修改')}
        exportHtml={html}
        exportFilename="memory-match"
        extra={<AiWarning extra={tx(WEB_ITERATION_UI_HINT)} />}
      />
    </div>
  );
}
