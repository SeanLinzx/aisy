'use client';
import { useState } from 'react';
import { api, apiDownloadHref } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { PromptTemplates } from '@/components/prompt-templates';
import { AiProgress } from '@/components/course/ai-progress';
import { ExploreToolHeader } from '@/components/explore-tool-header';

export default function PosterPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imageUrl?: string; html?: string; asset?: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function gen() {
    if (!prompt.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await api.post('/ai-generate/poster', { prompt });
      setResult(r.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <ExploreToolHeader
        title="🖼️ AI 生成海报"
        desc="说说你的海报需求，AI 会帮你生成图片或者一张可打印的海报网页。"
      />
      <div className="kid-card space-y-3">
        <PromptTemplates category="poster" onPick={(t) => setPrompt(t.prompt)} />
        <label className="text-sm font-semibold">海报描述</label>
        <textarea className="kid-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：一张「夏日读书会」的海报，主色蓝色，风格活泼" />
        <button onClick={gen} disabled={loading} className="kid-button-primary">{loading ? '生成中…' : '生成海报'}</button>
        {loading && <AiProgress label="AI 正在做海报…" />}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      </div>
      {result && (
        <div className="kid-card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold">海报效果</h3>
            {result.asset?.id && (
              <a href={apiDownloadHref(`/exports/poster/${result.asset.id}.pdf`)} className="kid-button-primary text-sm">⬇️ 下载 PDF</a>
            )}
          </div>
          {result.imageUrl && <img src={result.imageUrl} alt="poster" className="w-full max-w-md rounded-2xl border border-orange-100" />}
          {result.html && (
            <iframe sandbox="allow-scripts" srcDoc={result.html} className="w-full h-[600px] rounded-2xl border border-orange-100 bg-white" />
          )}
          <AiWarning />
        </div>
      )}
    </div>
  );
}
