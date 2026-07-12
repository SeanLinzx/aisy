'use client';
import { useState } from 'react';
import { api, apiDownloadHref } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { PromptTemplates } from '@/components/prompt-templates';
import { AiProgress } from '@/components/course/ai-progress';
import { ExploreToolHeader } from '@/components/explore-tool-header';

interface Slide { title: string; body: string }

export default function PptPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function gen() {
    if (!prompt.trim()) return;
    setLoading(true); setError(null); setSlides([]); setAssetId(null);
    try {
      const r = await api.post('/ai-generate/ppt', { prompt });
      setSlides(r.data.slides || []);
      setAssetId(r.data.asset?.id ?? null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <ExploreToolHeader title="📊 AI 生成 PPT" desc="告诉 AI 想做什么主题，它会帮你写出 5~8 页的提纲。" />
      <div className="kid-card space-y-3">
        <PromptTemplates category="ppt" onPick={(t) => setPrompt(t.prompt)} />
        <label className="text-sm font-semibold">PPT 主题</label>
        <textarea className="kid-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：我的暑假学习计划，5 页" />
        <button onClick={gen} disabled={loading} className="kid-button-primary">{loading ? '生成中…' : '生成 PPT 内容'}</button>
        {loading && <AiProgress label="AI 正在写 PPT 提纲…" />}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      </div>

      {slides.length > 0 && (
        <div className="space-y-3">
          {assetId && (
            <div className="flex items-center gap-3">
              <a href={apiDownloadHref(`/exports/ppt/${assetId}.pptx`)} className="kid-button-primary text-sm">⬇️ 下载 .pptx</a>
              <span className="text-xs text-slate-500">可用 PowerPoint / Keynote / WPS 直接打开</span>
            </div>
          )}
          {slides.map((s, i) => (
            <div key={i} className="kid-card">
              <div className="text-xs text-slate-400">第 {i + 1} 页</div>
              <div className="text-lg font-bold text-brand-dark mt-1">{s.title}</div>
              <p className="text-slate-700 mt-2 whitespace-pre-wrap">{s.body}</p>
            </div>
          ))}
          <AiWarning />
        </div>
      )}
    </div>
  );
}
