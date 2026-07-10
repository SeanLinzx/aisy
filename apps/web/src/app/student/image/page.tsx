'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { PromptTemplates } from '@/components/prompt-templates';
import { PromptKeywordPicker, emptySelection, type KeywordSelection } from '@/components/prompt-keyword-picker';
import { AiProgress } from '@/components/course/ai-progress';
import { ExploreToolHeader } from '@/components/explore-tool-header';
import { FreeCreateFlow } from '@/components/creative/free-create-flow';
import { ReferenceImageField } from '@/components/reference-image-field';
import { ImageResultActions } from '@/components/media-result-actions';

type Mode = 'guided' | 'free';

function ImagePageContent() {
  const searchParams = useSearchParams();
  const fromCourse = searchParams.get('from') === 'course';
  const lessonSlug = searchParams.get('lesson') || 'lesson2';
  const modeParam = searchParams.get('mode');
  const backHref = fromCourse ? `/student/course/${lessonSlug}` : '/student/explore';
  const backLabel = fromCourse ? '← 返回课程' : '← 返回探索模式';

  const [mode, setMode] = useState<Mode>(modeParam === 'free' ? 'free' : 'guided');
  const [prompt, setPrompt] = useState('');
  const [keywords, setKeywords] = useState<KeywordSelection>(emptySelection());
  const [size, setSize] = useState('1K');
  const [n, setN] = useState(1);
  const [refImage, setRefImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (modeParam === 'free' || modeParam === 'guided') setMode(modeParam);
  }, [modeParam]);

  async function gen() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setUrls([]);
    setSavedToLibrary(false);
    try {
      const refs = refImage.trim() ? [{ type: 'image', url: refImage.trim() }] : undefined;
      const r = await api.post('/ai-generate/image', {
        prompt,
        saveAsAsset: true,
        mode: 'guided',
        title: prompt.slice(0, 24) || 'AI 图片',
        references: refs,
        options: { size, n },
      });
      setUrls(r.data.imageUrls || []);
      setSavedToLibrary(!!r.data.asset?.id);
    } catch (e: unknown) {
      setError((e as Error).message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <ExploreToolHeader
        title="🎨 AI 画图"
        desc={
          fromCourse
            ? '课程第 2 课配套工具：关键词生图，或自由生图（AI 先优化提示词）。'
            : '关键词快速生图，或使用「自由生图」——先让 AI 帮你优化提示词，再生成作品并保存完整创作记录。'
        }
        backHref={backHref}
        backLabel={backLabel}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('guided')}
          className={`text-sm px-4 py-2 rounded-xl font-bold border transition ${
            mode === 'guided' ? 'bg-brand text-white border-brand' : 'bg-white border-orange-200 hover:bg-orange-50'
          }`}
        >
          🧩 关键词生图
        </button>
        <button
          type="button"
          onClick={() => setMode('free')}
          className={`text-sm px-4 py-2 rounded-xl font-bold border transition ${
            mode === 'free' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white border-orange-200 hover:bg-violet-50'
          }`}
        >
          ✨ 自由生图
        </button>
      </div>

      {mode === 'free' ? (
        <FreeCreateFlow kind="image" />
      ) : (
        <>
          <div className="kid-card space-y-4">
            <PromptTemplates category="image" onPick={(t) => setPrompt(t.prompt)} />
            <PromptKeywordPicker
              selection={keywords}
              onChange={(sel, built) => {
                setKeywords(sel);
                setPrompt(built);
              }}
            />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">提示词 Prompt</label>
                <VoiceInputButton onResult={(t) => setPrompt((p) => (p ? `${p}\n${t}` : t))} />
              </div>
              <textarea
                className="kid-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：一只在彩虹上跳舞的小猫，水彩风格"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold">尺寸</label>
                <select className="kid-input mt-2" value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="1K">1K 标清（更快，推荐）</option>
                  <option value="2K">2K 高清</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold">张数</label>
                <select className="kid-input mt-2" value={n} onChange={(e) => setN(Number(e.target.value))}>
                  <option value={1}>1 张</option>
                  <option value={2}>2 张</option>
                  <option value={4}>4 张</option>
                </select>
              </div>
            </div>
            <ReferenceImageField value={refImage} onChange={setRefImage} />
            <button onClick={gen} disabled={loading} className="kid-button-primary">
              {loading ? '生成中…' : '让 AI 画一张'}
            </button>
            {loading && <AiProgress label="AI 正在画图…" />}
            {error && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {(urls.length > 0 || loading) && (
            <div className="kid-card">
              <h3 className="font-semibold mb-3">作品</h3>
              {loading && <div className="text-slate-500 text-sm">⏳ 画师正在画…</div>}
              <div className="grid sm:grid-cols-2 gap-4">
                {urls.map((u, i) => (
                  <div key={u}>
                    <img src={resolveUploadPath(u)} alt="ai" className="w-full rounded-2xl border border-orange-100" />
                    <ImageResultActions
                      url={u}
                      title={`AI图片-${i + 1}`}
                      savedToLibrary={savedToLibrary}
                      fromCourse={fromCourse}
                      lessonSlug={lessonSlug}
                    />
                  </div>
                ))}
              </div>
              {urls.length > 0 && (
                <div className="mt-4">
                  <AiWarning />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ImagePage() {
  return (
    <Suspense fallback={<div className="text-slate-500 p-6">加载中…</div>}>
      <ImagePageContent />
    </Suspense>
  );
}
