'use client';

import { useLanguage } from '@/contexts/language-context';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { PublishedPageLink } from '@/components/published-page-link';
import { postProcessWebAppHtml, repairLeakedScriptText } from '@/lib/pm-app-ai-wiring';
import { runWebStudioIteration } from '@/lib/run-web-iteration';
import { resolveIterationBaseHtml } from '@/lib/web-iteration-base';
import { appendIterationTurn, type IterationChatMessage } from '@/lib/web-iteration-history';
import { AiWarning } from '@/components/ai-warning';
import { type PickedElement, describePickedElements } from '@/components/course/html-preview';
import { WebStudioPanel } from '@/components/course/web-studio-panel';
import { WebVersionTree } from '@/components/course/web-version-tree';
import { prefixIterationWish, WEB_ITERATION_UI_HINT } from '@/lib/web-iteration-prompt';
import { loadWebProjectHead } from '@/lib/web-project-head';
import { versionHtml, type WebProjectVersionRow } from '@/lib/web-project-versions';
import { PortfolioAssetsPanel } from './portfolio-assets-panel';
import {
  applyDeterministicPortfolioWorks,
  buildIterationPrompt,
  enrichChosenPortfolioAssets,
  finalizePortfolioNavigation,
  friendlyApiError,
  loadPortfolioState,
  persistPortfolio,
  type PortfolioForm,
  type PortfolioAsset,
} from './portfolio-shared';

function composePortfolioHtml(
  baseHtml: string,
  chosen: PortfolioAsset[],
  cardLayout: string,
  instruction?: string,
) {
  const cleaned = repairLeakedScriptText(baseHtml);
  const withWorks = applyDeterministicPortfolioWorks(cleaned, chosen, cardLayout);
  const withNav = finalizePortfolioNavigation(withWorks, chosen);
  return postProcessWebAppHtml(withNav, instruction ? { instruction } : undefined);
}

export function PortfolioStudio() {
  const { tx } = useLanguage();
  const [form, setForm] = useState<PortfolioForm | null>(null);
  const [library, setLibrary] = useState<PortfolioAsset[]>([]);
  const [chosen, setChosen] = useState<PortfolioAsset[]>([]);
  const [html, setHtml] = useState('');
  const [instruction, setInstruction] = useState('');
  const [pickedBlocks, setPickedBlocks] = useState<PickedElement[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [assetsBusy, setAssetsBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [headVersionId, setHeadVersionId] = useState<string | null>(null);
  const [versions, setVersions] = useState<WebProjectVersionRow[]>([]);
  const [saved, setSaved] = useState(false);
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
    if (!v || !form) return;
    const nextHtml = composePortfolioHtml(versionHtml(v), chosen, form.cardLayout);
    setHeadVersionId(id);
    lastServerHtmlRef.current = nextHtml;
    setHtml(nextHtml);
    setResetSignal((k) => k + 1);
    setSaved(false);
    setError(null);
  }

  useEffect(() => {
    loadPortfolioState()
      .then(async (state) => {
        setForm(state.form);
        setLibrary(state.assets);
        const picked = state.assets.filter((a: PortfolioAsset) => state.selected[a.id]);
        const enriched = await enrichChosenPortfolioAssets(picked);
        setChosen(enriched);

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

        const processed = composePortfolioHtml(nextHtml, enriched, state.form.cardLayout);
        setHtml(processed);
        lastServerHtmlRef.current = processed;
        setProjectId(state.projectId);
        setAssetId(state.assetId);
        setPublishedSlug(state.publishedSlug);
        setSaved(state.hasSaved);
      })
      .catch(() => setError('加载作品集失败，请返回重新生成。'))
      .finally(() => setLoading(false));
  }, [reloadVersions]);

  function addBlock(el: PickedElement) {
    setPickedBlocks((prev) => (prev.some((b) => b.outerHtml === el.outerHtml) ? prev : [...prev, el]));
  }
  function removeBlock(index: number) {
    setPickedBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  /** 仅更新素材收录：重写作品区 + 落库，不调用 AI */
  async function applyAssetChanges() {
    if (!form || chosen.length === 0) {
      setError('请至少保留 1 个作品素材');
      return;
    }
    setAssetsBusy(true);
    setError(null);
    setSaved(false);
    try {
      const enriched = await enrichChosenPortfolioAssets(chosen);
      setChosen(enriched);
      const { html: baseHtml } = await resolveIterationBaseHtml({
        projectId,
        activeVersionId: headVersionId,
        versions,
        htmlState: html,
        lastRefHtml: lastServerHtmlRef.current,
      });
      const shell = (baseHtml || html).trim() || html;
      const merged = composePortfolioHtml(shell, enriched, form.cardLayout);
      setHtml(merged);
      lastServerHtmlRef.current = merged;
      setResetSignal((k) => k + 1);

      const result = await persistPortfolio({
        htmlContent: merged,
        form,
        chosen: enriched,
        projectId,
        publishedSlug,
        assetId,
        parentVersionId: headVersionId,
        versionNotes: '更新作品素材',
        // 不写 AI 迭代 prompt，避免素材变更被当成对话修改
        promptOverride: `作品集素材更新（不经 AI）：共 ${enriched.length} 项\n${enriched.map((a) => `- [${a.type}] ${a.title}`).join('\n')}`,
      });
      setProjectId(result.projectId);
      setPublishedSlug(result.slug);
      setAssetId(result.assetId);
      if (result.versionId) setHeadVersionId(result.versionId);
      if (result.projectId) await reloadVersions(result.projectId);
      setSaved(true);
    } catch (e: unknown) {
      setError(friendlyApiError((e as Error)?.message || '保存素材失败'));
    } finally {
      setAssetsBusy(false);
    }
  }

  async function applyIteration() {
    if (!instruction.trim() || !html || !form) return;
    setBusy(true);
    setError(null);
    setSaved(false);
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
      const prompt = buildIterationPrompt(baseHtml, wish, describePickedElements(pickedBlocks));
      const iterated = await runWebStudioIteration({
        prompt,
        baseHtml,
        instruction: wish,
        messages: iterationHistory,
        postProcess: (h) => postProcessWebAppHtml(h, { instruction: wish }),
      });
      // 对话只改交互/外观；素材清单仍强制写回，防止 AI 丢掉某类作品
      const enriched = await enrichChosenPortfolioAssets(chosen);
      const merged = composePortfolioHtml(iterated, enriched, form.cardLayout, wish);
      setHtml(merged);
      lastServerHtmlRef.current = merged;
      setIterationHistory((prev) => appendIterationTurn(prev, wish));
      setInstruction('');
      setPickedBlocks([]);
      setResetSignal((k) => k + 1);

      const result = await persistPortfolio({
        htmlContent: merged,
        form,
        chosen: enriched,
        projectId,
        publishedSlug,
        assetId,
        parentVersionId: headVersionId,
        versionNotes: wish,
        promptOverride: prompt,
      });
      setProjectId(result.projectId);
      setPublishedSlug(result.slug);
      setAssetId(result.assetId);
      if (result.versionId) setHeadVersionId(result.versionId);
      if (result.projectId) await reloadVersions(result.projectId);
      setSaved(true);
    } catch (e: unknown) {
      setError(friendlyApiError((e as Error)?.message || '迭代失败'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-ink-soft font-semibold">{tx('正在加载作品集…')}</div>;
  }

  if (!html || !form) {
    return (
      <div className="kid-card space-y-3">
        <p className="text-sm text-ink-soft">{tx('还没有作品集，请先去填写信息并生成。')}</p>
        <Link href="/student/course/g/portfolio" className="kid-button-primary inline-block !py-2 !px-4 text-sm">
          ← 返回 AI 作品集
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/student/course/g/portfolio" className="kid-button-ghost !py-2 !px-4 text-sm">
          ← 返回修改设置
        </Link>
        {publishedSlug && (
          <PublishedPageLink slug={publishedSlug} className="kid-button-primary !py-2 !px-4 text-sm">
            🌐 打开作品集网页
          </PublishedPageLink>
        )}
      </div>

      {saved && publishedSlug && (
        <div className="kid-card-mint space-y-2">
          <div className="font-extrabold text-emerald-800">{tx('✅ 作品集已保存！')}</div>
          <p className="text-sm text-ink-soft">
            已写入<b>{tx('「我的网页」')}</b>和素材库，并已设为课程主页展示页（可在「我的主页」修改）。
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/student/projects" className="kid-button-ghost !py-2 !px-4 text-sm">
              💻 我的网页
            </Link>
            <Link href="/student/assets" className="kid-button-ghost !py-2 !px-4 text-sm">
              📦 去素材库查看
            </Link>
          </div>
        </div>
      )}

      <WebStudioPanel
        html={html}
        previewHeight={640}
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
        dialogTitle={tx('✏️ 告诉 AI 要怎么改（交互 / 外观）')}
        dialogHint={tx(
          '这里只改封面、配色、动画和点击交互。增减作品请用下方「作品素材」，不要让 AI 改素材清单。',
        )}
        instruction={instruction}
        onInstructionChange={setInstruction}
        pickedBlocks={pickedBlocks}
        onAddBlock={addBlock}
        onRemoveBlock={removeBlock}
        onClearBlocks={() => setPickedBlocks([])}
        onApply={applyIteration}
        busy={busy || assetsBusy}
        error={error}
        resetSignal={resetSignal}
        placeholder={tx('例如：把封面标题改成「小明的奇妙 AI 世界」，背景换成星空；卡片悬停时放大一点')}
        busyLabel={tx('✨ AI 正在迭代并保存…')}
        applyLabel={tx('✨ 应用交互修改（自动更新预览）')}
        exportHtml={html}
        exportFilename="portfolio"
        extra={<AiWarning extra={tx(WEB_ITERATION_UI_HINT)} />}
      />

      <PortfolioAssetsPanel
        library={library}
        chosen={chosen}
        busy={busy || assetsBusy}
        onChangeChosen={setChosen}
        onApply={() => void applyAssetChanges()}
      />
    </div>
  );
}
