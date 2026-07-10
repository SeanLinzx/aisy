'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { HtmlPreview } from '@/components/course/html-preview';
import { AiProgress } from '@/components/course/ai-progress';
import {
  MEMORY_MATCH_TITLE,
  buildMemoryMatchIterationPrompt,
  loadMemoryMatchState,
  mergeWebHtml,
  persistMemoryMatch,
  type MemoryMatchForm,
} from './memory-match-shared';

export function MemoryMatchStudio() {
  const [form, setForm] = useState<MemoryMatchForm | null>(null);
  const [html, setHtml] = useState('');
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [versionCount, setVersionCount] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    loadMemoryMatchState()
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
      .catch(() => setError('加载失败，请返回重新生成。'))
      .finally(() => setLoading(false));
  }, []);

  const pageUrl = slug ? `/p/${slug}` : null;

  async function applyEdit() {
    if (!instruction.trim() || !html || !form) return;
    setBusy(true);
    setError(null);
    setJustSaved(false);
    try {
      const prompt = buildMemoryMatchIterationPrompt(html, instruction);
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      const merged = mergeWebHtml(r.data);
      setHtml(merged);
      setInstruction('');
      setPreviewKey((k) => k + 1);

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
        <p className="text-sm text-ink-soft">还没有生成{MEMORY_MATCH_TITLE}，请先返回填写选择题。</p>
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
          ← 返回选择题
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

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="kid-card space-y-2">
          <div className="text-sm font-bold">🕵️ {MEMORY_MATCH_TITLE} · 实时预览</div>
          <HtmlPreview key={previewKey} html={html} height={640} interactive />
          <p className="text-xs text-center text-ink-soft">↑ 可以直接玩：闯关翻牌、看侦探记忆力排行榜</p>
        </div>

        <div className="kid-card-purple space-y-3 lg:sticky lg:top-4">
          <div className="text-sm font-bold">✏️ 输入修改内容</div>
          <p className="text-xs text-ink-soft leading-relaxed">
            在下面写清楚想怎么改（比如「卡背换成放大镜图案」「配对成功时加一段掌声音效」），AI 会直接改这个页面，改完自动保存新版本。
          </p>
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-ink-soft">🎤 语音输入</label>
            <VoiceInputButton onResult={(t) => setInstruction((p) => (p ? `${p} ` : '') + t)} />
          </div>
          <textarea
            className="kid-textarea !min-h-[120px]"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="例如：卡背换成放大镜图案，配色改成青绿色黑板风"
          />
          <button onClick={applyEdit} disabled={busy || !instruction.trim()} className="kid-button-primary w-full">
            {busy ? '✨ AI 正在修改并保存…' : '✨ 应用修改'}
          </button>
          {busy && <AiProgress label="AI 正在按你的要求修改游戏…" />}
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
          )}
          <AiWarning extra="每次修改都会自动保存一个新版本，可以放心多试几次。" />
        </div>
      </div>
    </div>
  );
}
