'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { type PickedElement, describePickedElements } from '@/components/course/html-preview';
import { WebStudioPanel } from '@/components/course/web-studio-panel';
import {
  buildIterationPrompt,
  friendlyApiError,
  loadPortfolioState,
  mergeHtml,
  persistPortfolio,
  type PortfolioForm,
  type PortfolioAsset,
} from './portfolio-shared';

export function PortfolioStudio() {
  const [form, setForm] = useState<PortfolioForm | null>(null);
  const [chosen, setChosen] = useState<PortfolioAsset[]>([]);
  const [html, setHtml] = useState('');
  const [instruction, setInstruction] = useState('');
  const [pickedBlocks, setPickedBlocks] = useState<PickedElement[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scriptRepairRef = useRef(false);

  useEffect(() => {
    loadPortfolioState()
      .then((state) => {
        setForm(state.form);
        setHtml(state.html);
        setProjectId(state.projectId);
        setAssetId(state.assetId);
        setPublishedSlug(state.publishedSlug);
        setSaved(state.hasSaved);
        const picked = state.assets.filter((a: PortfolioAsset) => state.selected[a.id]);
        setChosen(picked);
      })
      .catch(() => setError('加载作品集失败，请返回重新生成。'))
      .finally(() => setLoading(false));
  }, []);

  /** 旧版保存未拆分 script，导致 /p/slug 发布页按钮失效；进入 studio 时静默修复一次 */
  useEffect(() => {
    if (loading || scriptRepairRef.current || !html || !form || !projectId) return;
    if (!/<script[\s>]/i.test(html)) return;
    scriptRepairRef.current = true;
    void persistPortfolio({
      htmlContent: html,
      form,
      chosen,
      projectId,
      publishedSlug,
      assetId,
    }).catch(() => {});
  }, [loading, html, form, chosen, projectId, publishedSlug, assetId]);

  const pageUrl = publishedSlug ? `/p/${publishedSlug}` : null;

  function addBlock(el: PickedElement) {
    setPickedBlocks((prev) => (prev.some((b) => b.outerHtml === el.outerHtml) ? prev : [...prev, el]));
  }
  function removeBlock(index: number) {
    setPickedBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  async function applyIteration() {
    if (!instruction.trim() || !html || !form) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const prompt = buildIterationPrompt(html, instruction, describePickedElements(pickedBlocks));
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      const merged = mergeHtml(r.data);
      setHtml(merged);
      setInstruction('');
      setPickedBlocks([]);
      setResetSignal((k) => k + 1);

      const result = await persistPortfolio({
        htmlContent: merged,
        form,
        chosen,
        projectId,
        publishedSlug,
        assetId,
      });
      setProjectId(result.projectId);
      setPublishedSlug(result.slug);
      setAssetId(result.assetId);
      setSaved(true);
    } catch (e: unknown) {
      setError(friendlyApiError((e as Error)?.message || '迭代失败'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-ink-soft font-semibold">正在加载作品集…</div>;
  }

  if (!html || !form) {
    return (
      <div className="kid-card space-y-3">
        <p className="text-sm text-ink-soft">还没有作品集，请先去填写信息并生成。</p>
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
        {pageUrl && (
          <Link href={pageUrl} target="_blank" className="kid-button-primary !py-2 !px-4 text-sm">
            🌐 打开作品集网页
          </Link>
        )}
      </div>

      {saved && pageUrl && (
        <div className="kid-card-mint space-y-2">
          <div className="font-extrabold text-emerald-800">✅ 作品集已保存！</div>
          <p className="text-sm text-ink-soft">
            已写入<b>「我的网页」</b>和素材库，并已设为课程主页展示页（可在「我的主页」修改）。
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
        placeholder="例如：把封面标题改成「小明的奇妙 AI 世界」，背景换成星空"
        busyLabel="✨ AI 正在迭代并保存…"
        applyLabel="✨ 应用修改（自动更新预览与素材库）"
        extra={<AiWarning extra="迭代后会自动保存到「我的网页」和素材库。可以多次点选不同部分，反复微调。" />}
      />
    </div>
  );
}
