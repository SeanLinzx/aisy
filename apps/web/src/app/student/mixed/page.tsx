'use client';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { ExploreToolHeader } from '@/components/explore-tool-header';

export default function MixedPage() {
  const [prompt, setPrompt] = useState('请告诉我这张图里有什么？');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(f: File) {
    setUploading(true); setError(null);
    try {
      const fd = new FormData(); fd.append('file', f);
      const r = await api.post('/storage/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImageUrl(r.data.url);
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  }

  async function gen() {
    if (!prompt.trim() || !imageUrl) { setError('请先上传或填入图片 URL'); return; }
    setLoading(true); setError(null); setText('');
    try {
      const r = await api.post('/ai-generate/mixed', {
        prompt,
        references: [{ type: 'image', url: imageUrl }],
        saveAsAsset: true,
      });
      setText(r.data.text || '');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <ExploreToolHeader title="🧠 图文理解 / 多模态" desc="上传一张图片，让 AI 看一看并回答你的问题。" />

      <div className="kid-card space-y-4">
        <div>
          <label className="text-sm font-semibold">第一步：选一张图片</label>
          <div className="mt-2 flex gap-3 items-center">
            <input type="file" accept="image/*" ref={fileRef} className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="kid-button-ghost">
              {uploading ? '上传中…' : '📤 上传图片'}
            </button>
            <span className="text-xs text-slate-400">或粘贴图片 URL：</span>
            <input className="kid-input flex-1" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          {imageUrl && <img src={imageUrl} alt="upload" className="mt-3 max-h-64 rounded-xl border border-orange-100" />}
        </div>

        <div>
          <label className="text-sm font-semibold">第二步：你想问什么？</label>
          <textarea className="kid-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>

        <button onClick={gen} disabled={loading || !imageUrl} className="kid-button-primary">
          {loading ? '思考中…' : '让 AI 看一看'}
        </button>
        {loading && <AiProgress label="AI 正在仔细看图…" />}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      </div>

      {(text || loading) && (
        <div className="kid-card">
          <h3 className="font-semibold mb-3">AI 回答</h3>
          {loading && <div className="text-slate-500 text-sm">⏳ AI 正在仔细看图…</div>}
          {text && <pre className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed">{text}</pre>}
          {text && <div className="mt-4"><AiWarning /></div>}
        </div>
      )}
    </div>
  );
}
