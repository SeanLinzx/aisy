'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { WebStudioPanel } from '@/components/course/web-studio-panel';
import { WebVersionTree } from '@/components/course/web-version-tree';
import { describePickedElements, type PickedElement } from '@/components/course/html-preview';
import { PublishedPageLink } from '@/components/published-page-link';
import { publishPath } from '@/lib/public-url';
import { mergeWebHtml, splitInlineWebParts } from '@/lib/merge-web-html';
import { buildExportableWebHtml } from '@/lib/export-web-html';
import { refreshAiCampRuntime } from '@ai-camp/types';
import { postProcessWebAppHtml } from '@/lib/pm-app-ai-wiring';
import { runWebStudioIteration } from '@/lib/run-web-iteration';
import { resolveIterationBaseHtml } from '@/lib/web-iteration-base';
import { appendIterationTurn, type IterationChatMessage } from '@/lib/web-iteration-history';
import { buildWebWorkbenchIterationPrompt } from '@/lib/web-workbench-prompt';
import { prefixIterationWish, WEB_ITERATION_UI_HINT } from '@/lib/web-iteration-prompt';
import { loadWebProjectHead } from '@/lib/web-project-head';
import { versionHtml, type WebProjectVersionRow } from '@/lib/web-project-versions';
import { webStudioBackNav } from '@/lib/web-studio-nav';
import { useLanguage } from '@/contexts/language-context';

const WISH_SUGGESTIONS = [
  '把生成按钮改成真正调用 AI，不要假数据',
  '新增一个 AI 生图板块',
  '按钮颜色改成更活泼的',
  '加一个加载动画',
];

export function WebWorkbenchStudio() {
  const { tx } = useLanguage();
  const search = useSearchParams();
  const projectId = search.get('id') || '';
  const backNav = webStudioBackNav(search.get('from'), projectId);

  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [slug, setSlug] = useState<string | null>(null);
  const [headVersionId, setHeadVersionId] = useState<string | null>(null);
  const [versions, setVersions] = useState<WebProjectVersionRow[]>([]);
  const [instruction, setInstruction] = useState('');
  const [pickedBlocks, setPickedBlocks] = useState<PickedElement[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [iterationHistory, setIterationHistory] = useState<IterationChatMessage[]>([]);
  const [baseHint, setBaseHint] = useState<string | null>(null);
  const lastServerHtmlRef = useRef('');

  const reloadVersions = useCallback(async (pid: string) => {
    const headState = await loadWebProjectHead(pid);
    if (!headState) return [];
    setVersions(headState.versions);
    setTitle(headState.title);
    setSlug(headState.slug);
    if (headState.headVersionId) setHeadVersionId(headState.headVersionId);
    return headState.versions;
  }, []);

  function applyHeadParts(merged: string) {
    const parts = splitInlineWebParts(merged);
    setHtml(parts.html);
    setCss(parts.css);
    setJs(parts.js);
    lastServerHtmlRef.current = merged;
  }

  function selectVersion(id: string) {
    const v = versions.find((x) => x.id === id);
    if (!v) return;
    setHeadVersionId(id);
    applyHeadParts(refreshAiCampRuntime(versionHtml(v)));
    setResetSignal((k) => k + 1);
    setSaved(false);
    setError(null);
  }

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      setError(tx('缺少网页项目 ID'));
      return;
    }
    loadWebProjectHead(projectId)
      .then((headState) => {
        if (!headState?.headHtml.trim()) {
          setError(tx('还没有网页内容，请先在网页工作台生成页面。'));
          return;
        }
        setTitle(headState.title);
        setSlug(headState.slug);
        setVersions(headState.versions);
        setHeadVersionId(headState.headVersionId);
        applyHeadParts(refreshAiCampRuntime(headState.headHtml));
      })
      .catch(() => setError(tx('加载失败')))
      .finally(() => setLoading(false));
  }, [projectId, tx]);

  function appendWish(text: string) {
    const wish = prefixIterationWish(tx(text));
    setInstruction((prev) => {
      const next = prev.trim();
      if (!next) return wish;
      if (next.includes(text) || next.includes(wish)) return prev;
      return `${next}；${wish}`;
    });
  }

  async function applyIteration() {
    if (!instruction.trim() || !html || !projectId) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const { html: baseHtml, previewDiffersFromServer } = await resolveIterationBaseHtml({
        projectId,
        activeVersionId: headVersionId,
        versions,
        htmlState: mergeWebHtml({ html, css, js }),
        lastRefHtml: lastServerHtmlRef.current,
      });
      if (!baseHtml.trim()) {
        throw new Error(tx('找不到上一版完整代码，请先在版本树中选择要修改的版本'));
      }
      setBaseHint(previewDiffersFromServer ? tx('将以当前预览为准进行修改（与服务器版本略有不同）') : null);
      lastServerHtmlRef.current = baseHtml;
      const wish = prefixIterationWish(instruction);
      const prompt = buildWebWorkbenchIterationPrompt(
        baseHtml,
        wish,
        describePickedElements(pickedBlocks),
        title,
      );
      const merged = await runWebStudioIteration({
        prompt,
        baseHtml,
        instruction: wish,
        messages: iterationHistory,
        postProcess: (h) => postProcessWebAppHtml(h, { instruction: wish }),
      });
      applyHeadParts(merged);
      setIterationHistory((prev) => appendIterationTurn(prev, wish));
      setInstruction('');
      setPickedBlocks([]);
      setResetSignal((k) => k + 1);

      const parts = splitInlineWebParts(merged);
      const vr = await api.post(`/web-projects/${projectId}/versions`, {
        html: parts.html,
        css: parts.css,
        js: parts.js,
        prompt,
        notes: wish,
        parentVersionId: headVersionId ?? undefined,
      });
      const versionId = vr.data?.id as string | undefined;
      if (versionId) setHeadVersionId(versionId);
      await reloadVersions(projectId);
      setSaved(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || tx('修改失败'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-ink-soft">{tx('正在加载…')}</div>;
  }

  if (!projectId || !html.trim()) {
    return (
      <div className="kid-card space-y-3">
        <p className="text-sm text-ink-soft">{tx('还没有网页内容，请先在网页工作台生成页面。')}</p>
        <Link href={backNav.href} className="kid-button-primary inline-block !py-2 !px-4 text-sm">
          ← {tx(backNav.label)}
        </Link>
      </div>
    );
  }

  const pageUrl = slug ? publishPath(slug) : null;

  return (
    <div className="space-y-4">
      <AiWarning />
      <div className="flex flex-wrap gap-2">
        <Link href={backNav.href} className="kid-button-ghost !py-2 !px-4 text-sm">
          ← {tx(backNav.label)}
        </Link>
        {pageUrl && (
          <PublishedPageLink href={pageUrl} className="kid-button-primary !py-2 !px-4 text-sm">
            🌐 {tx('打开我的网页')}
          </PublishedPageLink>
        )}
      </div>

      {saved && <p className="text-xs font-bold text-emerald-600">✅ {tx('修改已保存为新版本')}</p>}
      {baseHint && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{baseHint}</p>}

      <WebStudioPanel
        html={html}
        css={css}
        js={js}
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
        onAddBlock={(el) => setPickedBlocks((p) => (p.some((b) => b.outerHtml === el.outerHtml) ? p : [...p, el]))}
        onRemoveBlock={(i) => setPickedBlocks((p) => p.filter((_, idx) => idx !== i))}
        onClearBlocks={() => setPickedBlocks([])}
        onApply={applyIteration}
        busy={busy}
        error={error}
        resetSignal={resetSignal}
        publishHref={pageUrl}
        publishLabel={tx('打开页面')}
        exportHtml={buildExportableWebHtml(html, css, js)}
        exportFilename={title || 'web-page'}
        extra={
          <div className="space-y-2 mt-2">
            <p className="text-[10px] text-ink-soft leading-relaxed">{tx(WEB_ITERATION_UI_HINT)}</p>
            <div className="flex flex-wrap gap-1">
            {WISH_SUGGESTIONS.map((w) => (
              <button
                key={w}
                type="button"
                className="text-[10px] px-2 py-1 rounded-lg border border-orange-100"
                onClick={() => appendWish(w)}
              >
                {tx(w)}
              </button>
            ))}
            </div>
          </div>
        }
      />
    </div>
  );
}
