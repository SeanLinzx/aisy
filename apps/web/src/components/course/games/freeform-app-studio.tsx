'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { type PickedElement, describePickedElements } from '@/components/course/html-preview';
import { WebStudioPanel } from '@/components/course/web-studio-panel';
import {
  buildFreeformIterationPrompt,
  loadFreeformAppState,
  mergeWebHtml,
  persistFreeformApp,
  type FreeformForm,
} from './freeform-app-shared';

const WISH_SUGGESTIONS = [
  '我想多加一种内容',
  '把背景颜色改成我喜欢的颜色',
  '标题旁边加一个 emoji',
  '点击后弹出更详细的介绍',
  '加一个「重新开始」按钮',
  '字体再大一点，方便阅读',
];

export function FreeformAppStudio() {
  const [form, setForm] = useState<FreeformForm | null>(null);
  const [html, setHtml] = useState('');
  const [instruction, setInstruction] = useState('');
  const [pickedBlocks, setPickedBlocks] = useState<PickedElement[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFreeformAppState()
      .then((state) => {
        setForm(state.form);
        setHtml(state.html);
        setProjectId(state.projectId);
        setAssetId(state.assetId);
        if (state.slug) setPageUrl(`/p/${state.slug}`);
      })
      .catch(() => setError('加载失败，请返回重新生成。'))
      .finally(() => setLoading(false));
  }, []);

  function addBlock(el: PickedElement) {
    setPickedBlocks((prev) => (prev.some((b) => b.outerHtml === el.outerHtml) ? prev : [...prev, el]));
  }
  function removeBlock(index: number) {
    setPickedBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function appendWish(text: string) {
    setInstruction((prev) => {
      const next = prev.trim();
      if (!next) return text;
      if (next.includes(text)) return prev;
      return `${next}；${text}`;
    });
  }

  async function applyIteration() {
    if (!instruction.trim() || !html || !form) return;
    setBusy(true);
    setError(null);
    setJustSaved(false);
    try {
      const prompt = buildFreeformIterationPrompt(html, instruction, describePickedElements(pickedBlocks));
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      const merged = mergeWebHtml({ html: r.data.html || '', css: r.data.css || '', js: r.data.js || '' });
      setHtml(merged);
      setInstruction('');
      setPickedBlocks([]);
      setResetSignal((k) => k + 1);

      const persisted = await persistFreeformApp({ htmlContent: merged, form, projectId, assetId });
      setProjectId(persisted.projectId);
      setAssetId(persisted.assetId);
      setPageUrl(persisted.url);
      setJustSaved(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || '修改失败');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-ink-soft font-semibold">正在加载你的小应用…</div>;
  }

  if (!html || !form) {
    return (
      <div className="kid-card space-y-3">
        <p className="text-sm text-ink-soft">还没有生成小应用，请先返回填空生成。</p>
        <Link href="/student/course/g/freeform-app" className="kid-button-primary inline-block !py-2 !px-4 text-sm">
          ← 返回做自己的 AI 小应用
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/student/course/g/freeform-app" className="kid-button-ghost !py-2 !px-4 text-sm">
          ← 返回修改设置
        </Link>
        {pageUrl && (
          <Link href={pageUrl} target="_blank" className="kid-button-primary !py-2 !px-4 text-sm">
            🌐 打开我的小应用
          </Link>
        )}
      </div>

      {justSaved && (
        <div className="kid-card-mint text-sm text-emerald-800 font-bold">✅ 修改已生效，并自动保存了新版本！</div>
      )}

      <div className="kid-card-yellow !p-4 space-y-2">
        <div className="text-sm font-bold">💡 还想加什么？</div>
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
        panelTitle="🪄 我的 AI 小应用 · 实时预览"
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
        placeholder="在这里写下你想加的内容，比如：我想多加一种动物、把标题改成粉色…"
        busyLabel="✨ AI 正在按你的想法修改并保存…"
        applyLabel="✨ 应用我的想法"
        hint="左边可以试玩小应用。想改某个部分？切到「点选加入」点一下页面里的块，再在右边写下你的想法。"
        extra={<AiWarning extra="每次修改都会自动保存，可以反复试直到满意。" />}
      />
    </div>
  );
}
