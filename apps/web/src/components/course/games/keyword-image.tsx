'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { PromptKeywordPicker, emptySelection, type KeywordSelection } from '@/components/prompt-keyword-picker';
import { AiProgress } from '@/components/course/ai-progress';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';

export function KeywordImageGame() {
  const report = useReportGameProgress('keyword-image');
  const [keywords, setKeywords] = useState<KeywordSelection>(emptySelection());
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function gen() {
    if (!prompt.trim()) {
      setError('先点选几个关键词，拼出一句提示词吧！');
      return;
    }
    setLoading(true);
    setError(null);
    setUrls([]);
    void report({ status: 'generating', prompt: prompt.trim() });
    try {
      const r = await api.post('/ai-generate/image', {
        prompt,
        saveAsAsset: true,
        options: { size: '1K', n: 1 },
      });
      const nextUrls = r.data.imageUrls || [];
      setUrls(nextUrls);
      void report({
        status: 'done',
        prompt: prompt.trim(),
        imageUrls: nextUrls,
        thumbnailUrl: nextUrls[0],
      });
    } catch (e: any) {
      const msg = e?.message || '生成失败';
      setError(msg);
      void report({ status: 'failed', prompt: prompt.trim(), error: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-pink">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🧩 点选下面的关键词，也可以在每个模块里添加「我的词」；像搭积木一样拼出提示词，再让 AI 画出来！自定义词只保存在你的账号里。
        </p>
      </div>

      <div className="kid-card space-y-4">
        <PromptKeywordPicker
          selection={keywords}
          onChange={(sel, built) => {
            setKeywords(sel);
            setPrompt(built);
          }}
        />
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold">🪄 我的提示词（可以再改改）</label>
            <VoiceInputButton onResult={(t) => setPrompt((p) => (p ? p + '\n' : '') + t)} />
          </div>
          <textarea className="kid-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="点上面的关键词，这里会自动出现提示词" />
        </div>
        <button onClick={gen} disabled={loading} className="kid-button-primary">{loading ? '🎨 AI 正在画…' : '✨ 让 AI 画一张'}</button>
        {loading && <AiProgress label="AI 正在画你的图…" />}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      </div>

      {(urls.length > 0 || loading) && (
        <div className="kid-card">
          <h3 className="font-bold mb-3">🖼️ 你的作品</h3>
          {loading && <div className="text-slate-500 text-sm">⏳ 画师正在画…</div>}
          <div className="grid sm:grid-cols-2 gap-4">
            {urls.map((u) => (
              <a key={u} href={resolveUploadPath(u)} target="_blank" rel="noreferrer">
                <img src={resolveUploadPath(u)} alt="ai" className="w-full rounded-2xl border border-orange-100" />
              </a>
            ))}
          </div>
          {urls.length > 0 && <div className="mt-4"><AiWarning /></div>}
        </div>
      )}
    </div>
  );
}
