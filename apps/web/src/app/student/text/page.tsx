'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { ExploreToolHeader } from '@/components/explore-tool-header';
import { VoiceInputButton } from '@/components/voice-input';
import { PromptTemplates } from '@/components/prompt-templates';
import { AiProgress } from '@/components/course/ai-progress';

export default function TextGenPage() {
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [savedAsset, setSavedAsset] = useState<any>(null);

  async function generate(save: boolean) {
    if (!prompt.trim()) return;
    setLoading(true); setError(null); setResult(''); setSavedAsset(null);
    try {
      const r = await api.post('/ai-generate/text', { prompt, title, saveAsAsset: save });
      setResult(r.data.text);
      setSavedAsset(r.data.asset);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <ExploreToolHeader
        title="✍️ AI 写文字"
        desc="写下你想要 AI 写的内容，比如「写一个关于太空小狗的故事」。"
      />
      <div className="kid-card space-y-4">
        <PromptTemplates category="text" onPick={(t) => setPrompt(t.prompt)} />
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold">提示词 Prompt</label>
            <VoiceInputButton onResult={(t) => setPrompt((p) => (p ? p + '\n' : '') + t)} />
          </div>
          <textarea className="kid-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：用 100 字写一个会变魔法的小猫的故事" />
        </div>
        <div>
          <label className="text-sm font-semibold">标题（可选）</label>
          <input className="kid-input mt-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="保存到素材库时显示的标题" />
        </div>
        <div className="flex gap-3">
          <button onClick={() => generate(false)} disabled={loading} className="kid-button-ghost">{loading ? '生成中…' : '只生成预览'}</button>
          <button onClick={() => generate(true)} disabled={loading} className="kid-button-primary">{loading ? '生成中…' : '生成并保存到素材库'}</button>
        </div>
        {loading && <AiProgress label="AI 正在写…" />}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      </div>

      {(result || loading) && (
        <div className="kid-card">
          <h3 className="font-semibold mb-3">AI 输出</h3>
          {loading && <div className="text-slate-500 text-sm">⏳ 正在思考…</div>}
          {result && (
            <>
              <pre className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed">{result}</pre>
              <div className="mt-4"><AiWarning /></div>
              {savedAsset && <div className="mt-3 text-xs text-emerald-600">✅ 已保存到素材库（标题：{savedAsset.title}）</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
