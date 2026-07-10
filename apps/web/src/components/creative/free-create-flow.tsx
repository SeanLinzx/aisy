'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { buildCreationSessionHtml } from '@/lib/creation-session-html';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { AiProgress } from '@/components/course/ai-progress';
import { VideoGenTimeHint } from '@/components/video-gen-time-hint';
import { ReferenceImageField } from '@/components/reference-image-field';
import { ImageResultActions, VideoResultActions } from '@/components/media-result-actions';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';
import type { TrackedCreationGame } from '@/lib/course-game-progress';

type Kind = 'image' | 'video';
type Step = 'input' | 'optimize' | 'generate' | 'done';

interface JobRow {
  id: string;
  status: string;
  prompt: string;
  output?: { videoUrl?: string };
  error?: string;
  assets?: Array<{ id: string }>;
}

export function FreeCreateFlow({
  kind,
  progressSlug,
}: {
  kind: Kind;
  progressSlug?: TrackedCreationGame;
}) {
  const reportProgress = useReportGameProgress(progressSlug || 'video-free');
  const report = useCallback(
    (payload: Parameters<typeof reportProgress>[0]) => {
      if (!progressSlug) return;
      void reportProgress(payload);
    },
    [progressSlug, reportProgress],
  );
  const [step, setStep] = useState<Step>('input');
  const [rawInput, setRawInput] = useState('');
  const [optimized, setOptimized] = useState('');
  const [title, setTitle] = useState('');
  const [size, setSize] = useState('1K');
  const [n, setN] = useState(1);
  const [duration, setDuration] = useState(5);
  const [ratio, setRatio] = useState('16:9');
  const [refImage, setRefImage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [resultAssetId, setResultAssetId] = useState<string | null>(null);
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);

  const previewHtml = useMemo(
    () =>
      buildCreationSessionHtml({
        title: title || optimized.slice(0, 16) || '我的创作',
        kind,
        rawPrompt: rawInput,
        optimizedPrompt: optimized,
        imageUrls: imageUrls.map(resolveUploadPath),
        videoUrl: videoUrl ? resolveUploadPath(videoUrl) : undefined,
      }),
    [title, kind, rawInput, optimized, imageUrls, videoUrl],
  );

  useEffect(() => {
    if (kind !== 'video' || !videoJobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await api.get(`/ai-generate/jobs/${videoJobId}`);
        const job = r.data as JobRow;
        if (cancelled) return;
        if (job.status === 'succeeded' && job.output?.videoUrl) {
          setVideoUrl(job.output.videoUrl);
          const assets = (job as JobRow & { assets?: Array<{ id: string }> }).assets;
          if (assets?.[0]?.id) {
            setResultAssetId(assets[0].id);
            setSavedToLibrary(true);
          }
          void report({
            status: 'done',
            prompt: job.prompt,
            videoUrl: job.output.videoUrl,
            thumbnailUrl: job.output.videoUrl,
            summary: '自由生视频已完成',
          });
          setStep('done');
          setBusy(false);
          return;
        }
        if (job.status === 'failed') {
          setError(job.error || '视频生成失败');
          void report({ status: 'failed', prompt: job.prompt, error: job.error || '视频生成失败' });
          setBusy(false);
          return;
        }
        void report({
          status: 'generating',
          prompt: job.prompt,
          summary: '自由生视频生成中…',
        });
        setTimeout(poll, 4000);
      } catch {
        if (!cancelled) setTimeout(poll, 4000);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [kind, videoJobId, report]);

  async function runOptimize() {
    if (!rawInput.trim()) return;
    setBusy(true);
    setError(null);
    setSessionSaved(false);
    setPageUrl(null);
    setSavedToLibrary(false);
    try {
      const r = await api.post('/ai-generate/optimize-prompt', {
        rawInput: rawInput.trim(),
        target: kind,
      });
      setOptimized(r.data.optimized);
      if (!title) setTitle(rawInput.trim().slice(0, 20));
      setStep('optimize');
    } catch (e: unknown) {
      setError((e as Error).message || '优化失败');
    } finally {
      setBusy(false);
    }
  }

  async function runGenerate(promptOverride?: string) {
    const prompt = (promptOverride ?? optimized).trim();
    if (!prompt) return;
    if (promptOverride) {
      setOptimized(promptOverride);
      if (!title) setTitle(promptOverride.slice(0, 20));
    }
    setBusy(true);
    setError(null);
    setImageUrls([]);
    setVideoUrl(null);
    setResultAssetId(null);
    setSessionSaved(false);
    setPageUrl(null);
    setSavedToLibrary(false);
    setStep('generate');
    try {
      if (kind === 'image') {
        const refs = refImage.trim() ? [{ type: 'image', url: refImage.trim() }] : undefined;
        const r = await api.post('/ai-generate/image', {
          prompt,
          originalPrompt: rawInput,
          mode: 'free',
          saveAsAsset: true,
          title: title || prompt.slice(0, 20),
          references: refs,
          options: { size, n },
        });
        setImageUrls(r.data.imageUrls || []);
        setResultAssetId(r.data.asset?.id ?? null);
        setSavedToLibrary(!!r.data.asset?.id);
        setStep('done');
      } else {
        const refs = refImage.trim()
          ? [{ type: 'image', url: refImage.trim(), role: 'reference_image' }]
          : undefined;
        const r = await api.post('/ai-generate/video', {
          prompt,
          title: title || prompt.slice(0, 20),
          originalPrompt: rawInput,
          mode: 'free',
          references: refs,
          duration,
          ratio,
          generateAudio: true,
        });
        setVideoJobId(r.data.jobId);
        void report({ status: 'generating', prompt, summary: '已提交自由生视频任务…' });
      }
    } catch (e: unknown) {
      setError((e as Error).message || '生成失败');
      void report({ status: 'failed', prompt, error: (e as Error).message || '生成失败' });
      setStep('optimize');
    } finally {
      if (kind === 'image') setBusy(false);
    }
  }

  async function saveSession() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post('/ai-generate/creation-sessions', {
        kind,
        title: title || optimized.slice(0, 20) || '我的创作',
        rawPrompt: rawInput,
        optimizedPrompt: optimized,
        imageUrls: kind === 'image' ? imageUrls : undefined,
        videoUrl: kind === 'video' ? videoUrl : undefined,
        resultAssetId: resultAssetId ?? undefined,
        jobId: videoJobId ?? undefined,
        hidePromptInLibrary: true,
      });
      setSessionSaved(true);
      setPageUrl(r.data.pageUrl);
    } catch (e: unknown) {
      setError((e as Error).message || '保存失败');
    } finally {
      setBusy(false);
    }
  }

  async function saveVideoToLibrary() {
    if (!videoUrl) return;
    setSavingVideo(true);
    setError(null);
    try {
      const r = await api.post('/assets', {
        type: 'video',
        title: title || optimized.slice(0, 20) || 'AI 视频',
        url: videoUrl,
        meta: { jobId: videoJobId, manualSaved: true },
      });
      setResultAssetId(r.data.id);
      setSavedToLibrary(true);
    } catch (e: unknown) {
      setError((e as Error).message || '保存失败');
    } finally {
      setSavingVideo(false);
    }
  }

  const canSave =
    step === 'done' &&
    !sessionSaved &&
    optimized &&
    (kind === 'image' ? imageUrls.length > 0 : !!videoUrl);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 text-xs">
        {(['input', 'optimize', 'generate', 'done'] as Step[]).map((s, i) => {
          const labels = ['① 说出想法', '② 优化提示词', '③ 生成作品', '④ 保存记录'];
          const active = step === s;
          const done =
            (s === 'input' && rawInput) ||
            (s === 'optimize' && optimized) ||
            (s === 'generate' && (imageUrls.length > 0 || videoJobId)) ||
            (s === 'done' && (imageUrls.length > 0 || videoUrl));
          return (
            <span
              key={s}
              className={`px-3 py-1.5 rounded-full font-bold border ${
                active
                  ? 'bg-brand text-white border-brand'
                  : done
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-500 border-orange-100'
              }`}
            >
              {labels[i]}
            </span>
          );
        })}
      </div>

      <div className="kid-card space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold">💭 用你自己的话描述想做什么</label>
            <VoiceInputButton onResult={(t) => setRawInput((p) => (p ? `${p}\n${t}` : t))} />
          </div>
          <textarea
            className="kid-textarea min-h-[100px]"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={
              kind === 'image'
                ? '例如：我想画一只在彩虹上跳舞的小猫，背景是星空，水彩风格'
                : '例如：一只小狐狸在夏天的森林里追着萤火虫跑，镜头慢慢推进'
            }
          />
        </div>

        {step === 'input' && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runOptimize}
              disabled={busy || !rawInput.trim()}
              className="kid-button-primary"
            >
              {busy ? 'AI 正在优化…' : '✨ AI 优化提示词'}
            </button>
            <button
              type="button"
              onClick={() => void runGenerate(rawInput.trim())}
              disabled={busy || !rawInput.trim()}
              className="kid-button-ghost text-sm"
            >
              {busy ? '生成中…' : '直接生成（不优化提示词）'}
            </button>
          </div>
        )}

        {(step === 'optimize' || step === 'generate' || step === 'done') && (
          <>
            <div>
              <label className="text-sm font-semibold">✨ 优化后的提示词（可修改）</label>
              <textarea
                className="kid-textarea mt-2 min-h-[80px]"
                value={optimized}
                onChange={(e) => setOptimized(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">觉得不合适？直接改一改，再点生成。</p>
            </div>
            <div>
              <label className="text-sm font-semibold">作品标题（保存时用）</label>
              <input
                className="kid-input mt-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给这次创作起个名字"
              />
            </div>

            {kind === 'image' ? (
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
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold">时长</label>
                  <select
                    className="kid-input mt-2"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  >
                    <option value={5}>5 秒</option>
                    <option value={8}>8 秒</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold">比例</label>
                  <select className="kid-input mt-2" value={ratio} onChange={(e) => setRatio(e.target.value)}>
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="1:1">1:1</option>
                  </select>
                </div>
              </div>
            )}
            <ReferenceImageField value={refImage} onChange={setRefImage} />

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStep('input')} className="kid-button-ghost text-sm">
                ← 重新输入想法
              </button>
              <button
                type="button"
                onClick={runOptimize}
                disabled={busy}
                className="kid-button-ghost text-sm"
              >
                重新优化
              </button>
              <button
                type="button"
                onClick={() => void runGenerate()}
                disabled={busy || !optimized.trim()}
                className="kid-button-primary"
              >
                {busy && kind === 'video' ? '已提交，生成中…' : busy ? '生成中…' : kind === 'image' ? '🎨 开始生图' : '🎬 开始生视频'}
              </button>
              {kind === 'video' && <VideoGenTimeHint />}
            </div>
          </>
        )}

        {busy && (
          <AiProgress
            label={kind === 'image' ? 'AI 正在画图…' : 'AI 正在生成视频，完成后会自动保存到素材库…'}
            estimate={kind === 'video' ? '平均每段约 3 分钟' : undefined}
          />
        )}
        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {(imageUrls.length > 0 || videoUrl || (kind === 'video' && videoJobId && step !== 'input')) && (
        <div className="kid-card space-y-4">
          <h3 className="font-semibold">🖼️ 生成结果</h3>
          {kind === 'image' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {imageUrls.map((u, i) => (
                <div key={u}>
                  <img
                    src={resolveUploadPath(u)}
                    alt="作品"
                    className="w-full rounded-2xl border border-orange-100"
                  />
                  <ImageResultActions
                    url={u}
                    title={title || `AI图片-${i + 1}`}
                    savedToLibrary={savedToLibrary}
                  />
                </div>
              ))}
            </div>
          )}
          {kind === 'video' && videoUrl && (
            <>
              <video src={resolveUploadPath(videoUrl)} controls className="w-full max-h-80 rounded-xl bg-black" />
              <VideoResultActions
                url={videoUrl}
                title={title || optimized.slice(0, 20) || 'AI视频'}
                savedToLibrary={savedToLibrary}
                assetId={resultAssetId}
                saving={savingVideo}
                onSave={savedToLibrary ? undefined : () => void saveVideoToLibrary()}
              />
            </>
          )}
          {kind === 'video' && !videoUrl && videoJobId && (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">视频任务已提交，请稍等…页面会自动刷新结果。</p>
              <VideoGenTimeHint />
            </div>
          )}
          <AiWarning />
        </div>
      )}

      {(optimized || imageUrls.length > 0 || videoUrl) && (
        <div className="kid-card space-y-3">
          <h3 className="font-semibold">📄 创作页预览</h3>
          <p className="text-xs text-slate-500">
            保存后会生成独立网页，包含原始想法、优化提示词和作品，并同步到「我的网页」。
          </p>
          <iframe
            title="创作页预览"
            srcDoc={previewHtml}
            className="w-full h-80 rounded-2xl border-2 border-orange-100 bg-white"
            sandbox="allow-same-origin"
          />
          {canSave && (
            <button type="button" onClick={saveSession} disabled={busy} className="kid-button-primary">
              💾 保存完整创作记录（提示词 + 作品 + 网页）
            </button>
          )}
          {sessionSaved && (
            <div className="text-sm text-emerald-600 space-y-1">
              <div>✅ 已保存！提示词、{kind === 'image' ? '图片' : '视频'}和创作网页都已入库。</div>
              {pageUrl && (
                <Link href={pageUrl} target="_blank" className="text-brand font-bold underline">
                  打开创作网页 →
                </Link>
              )}
              <Link href="/student/projects" className="block text-brand font-bold">
                去「我的网页」查看 →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
