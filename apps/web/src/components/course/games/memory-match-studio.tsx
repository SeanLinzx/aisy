'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { type PickedElement, describePickedElements } from '@/components/course/html-preview';
import { WebStudioPanel } from '@/components/course/web-studio-panel';
import {
  MEMORY_MATCH_TITLE,
  buildMemoryMatchIterationPrompt,
  ensureMemoryMatchStarter,
  mergeWebHtml,
  persistMemoryMatch,
  type MemoryMatchForm,
} from './memory-match-shared';

export function MemoryMatchStudio() {
  const [form, setForm] = useState<MemoryMatchForm | null>(null);
  const [html, setHtml] = useState('');
  const [instruction, setInstruction] = useState('');
  const [pickedBlocks, setPickedBlocks] = useState<PickedElement[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [versionCount, setVersionCount] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureMemoryMatchStarter()
      .then((state) => {
        setForm(state.form);
        setHtml(state.html);
        setProjectId(state.projectId);
        setAssetId(state.assetId);
        setSlug(state.slug);
        if (state.projectId) {
          api
            .get(`/web-projects/${state.projectId}`)
            .then((r) => setVersionCount(r.data?.versions?.length ?? 1))
            .catch(() => setVersionCount(1));
        }
      })
      .catch(() => setError('加载失败，请返回课程页重试。'))
      .finally(() => setLoading(false));
  }, []);

  const pageUrl = slug ? `/p/${slug}` : null;

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
      const prompt = buildMemoryMatchIterationPrompt(html, instruction, describePickedElements(pickedBlocks));
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      const merged = mergeWebHtml(r.data);
      setHtml(merged);
      setInstruction('');
      setPickedBlocks([]);
      setResetSignal((k) => k + 1);

      const result = await persistMemoryMatch({
        htmlContent: merged,
        form,
        projectId,
        assetId,
      });
      setProjectId(result.projectId);
      setSlug(result.slug);
      setAssetId(result.assetId);
      setVersionCount((v) => v + 1);
      setJustSaved(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || '修改失败');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-ink-soft font-semibold">正在加载{MEMORY_MATCH_TITLE}…</div>;
  }

  if (!html || !form) {
    return (
      <div className="kid-card space-y-3">
        <p className="text-sm text-ink-soft">还没有加载到{MEMORY_MATCH_TITLE}，请返回课程页。</p>
        <Link href="/student/course/g/memory-match" className="kid-button-primary inline-block !py-2 !px-4 text-sm">
          ← 返回{MEMORY_MATCH_TITLE}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/student/course/g/memory-match" className="kid-button-ghost !py-2 !px-4 text-sm">
          ← 返回记忆力挑战
        </Link>
        <Link href="/student/course/g/memory-match-create" className="kid-button-ghost !py-2 !px-4 text-sm">
          🎨 用选择题重新设计
        </Link>
        {pageUrl && (
          <Link href={pageUrl} target="_blank" className="kid-button-primary !py-2 !px-4 text-sm">
            🌐 打开游戏网页
          </Link>
        )}
        <span className="kid-button-ghost !py-2 !px-4 text-sm pointer-events-none">📌 已保存 {versionCount} 个版本</span>
      </div>

      {justSaved && (
        <div className="kid-card-mint text-sm text-emerald-800 font-bold">✅ 修改已生效，并自动保存了一个新版本！</div>
      )}

      <WebStudioPanel
        html={html}
        previewHeight={640}
        panelTitle={`🕵️ ${MEMORY_MATCH_TITLE} · 实时预览`}
        instruction={instruction}
        onInstructionChange={setInstruction}
        pickedBlocks={pickedBlocks}
        onAddBlock={addBlock}
        onRemoveBlock={removeBlock}
        onClearBlocks={() => setPickedBlocks([])}
        onApply={applyEdit}
        busy={busy}
        error={error}
        resetSignal={resetSignal}
        placeholder="例如：卡背换成放大镜图案，配色改成青绿色黑板风"
        busyLabel="✨ AI 正在修改并保存…"
        applyLabel="✨ 应用修改"
        extra={<AiWarning extra="每次修改都会自动保存一个新版本，可以放心多试几次。" />}
      />
    </div>
  );
}
