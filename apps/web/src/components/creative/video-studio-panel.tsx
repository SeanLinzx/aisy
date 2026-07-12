'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { PromptTemplates } from '@/components/prompt-templates';
import { AiProgress } from '@/components/course/ai-progress';
import { FreeCreateFlow } from '@/components/creative/free-create-flow';
import { VideoGenTimeHint } from '@/components/video-gen-time-hint';
import { ReferenceImageField } from '@/components/reference-image-field';
import { VideoResultActions } from '@/components/media-result-actions';
import { InlineVideoPlayer } from '@/components/inline-video-player';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';
import type { TrackedCreationGame } from '@/lib/course-game-progress';
import { cn } from '@/lib/cn';

export type VideoStudioMode = 'guided' | 'free';

interface Job {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  output?: { videoUrl?: string };
  error?: string;
  prompt: string;
  assets?: Array<{ id: string }>;
}

export function VideoStudioPanel({
  progressSlug = 'video-guided',
  freeProgressSlug = 'video-free',
  initialMode = 'guided',
  refImageSeed,
  compact = false,
}: {
  progressSlug?: TrackedCreationGame;
  freeProgressSlug?: TrackedCreationGame;
  initialMode?: VideoStudioMode;
  refImageSeed?: string;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<VideoStudioMode>(initialMode);
  const [freeFrameMode, setFreeFrameMode] = useState<'no-frame' | 'with-frame'>('no-frame');
  const [prompt, setPrompt] = useState('');
  const [refImage, setRefImage] = useState(refImageSeed || '');
  const [duration, setDuration] = useState(5);
  const [ratio, setRatio] = useState('16:9');
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const report = useReportGameProgress(progressSlug);

  const syncProgress = useCallback(
    (nextJobs: Job[], opts?: { summary?: string; error?: string }) => {
      if (nextJobs.length === 0) return;
      const succeeded = nextJobs.filter((j) => j.status === 'succeeded');
      const pending = nextJobs.some((j) => j.status === 'queued' || j.status === 'running');
      const failed = nextJobs.some((j) => j.status === 'failed');
      const latestVideo = [...nextJobs].reverse().find((j) => j.output?.videoUrl)?.output?.videoUrl;
      const latestPrompt = nextJobs[nextJobs.length - 1]?.prompt;
      void report({
        status:
          opts?.error || (failed && succeeded.length === 0)
            ? 'failed'
            : pending
              ? 'generating'
              : succeeded.length > 0
                ? 'done'
                : 'generating',
        prompt: latestPrompt,
        videoUrl: latestVideo,
        thumbnailUrl: latestVideo,
        summary: opts?.summary ?? `已完成 ${succeeded.length}/${nextJobs.length} 个视频任务`,
        items: nextJobs.map((j, i) => ({
          url: j.output?.videoUrl,
          prompt: j.prompt,
          label: `任务 ${i + 1}`,
          status: j.status,
        })),
        error: opts?.error ?? (failed ? nextJobs.find((j) => j.error)?.error : undefined),
      });
    },
    [report],
  );

  useEffect(() => {
    if (refImageSeed) setRefImage(refImageSeed);
  }, [refImageSeed]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  async function loadJobs() {
    try {
      const r = await api.get('/ai-generate/jobs', { params: { type: 'video' } });
      setJobs(r.data || []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (mode !== 'guided') return;
    loadJobs();
    const t = setInterval(loadJobs, 4000);
    return () => clearInterval(t);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'guided' || jobs.length === 0) return;
    syncProgress(jobs);
  }, [jobs, mode, syncProgress]);

  async function submit() {
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    void report({ status: 'generating', prompt, summary: '已提交视频任务…' });
    try {
      const refs = refImage.trim()
        ? [{ type: 'image', url: refImage.trim(), role: 'reference_image' }]
        : undefined;
      await api.post('/ai-generate/video', {
        prompt,
        title: prompt.slice(0, 32) || 'AI 视频',
        mode: 'guided',
        references: refs,
        duration,
        ratio,
        generateAudio: true,
      });
      await loadJobs();
    } catch (e: unknown) {
      setError((e as Error).message);
      void report({ status: 'failed', prompt, error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function saveJobToLibrary(job: Job) {
    if (!job.output?.videoUrl) return;
    setSavingJobId(job.id);
    try {
      await api.post('/assets', {
        type: 'video',
        title: job.prompt.slice(0, 32) || 'AI 视频',
        url: job.output.videoUrl,
        meta: { jobId: job.id, manualSaved: true },
      });
      await loadJobs();
    } catch (e: unknown) {
      setError((e as Error).message || '保存失败');
    } finally {
      setSavingJobId(null);
    }
  }

  return (
    <div className={cn('space-y-4', compact ? '' : 'space-y-6')}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('guided')}
          className={cn(
            'text-sm px-4 py-2 rounded-xl font-bold border transition',
            mode === 'guided' ? 'bg-brand text-white border-brand' : 'bg-white border-orange-200 hover:bg-orange-50',
          )}
        >
          📋 模板生视频
        </button>
        <button
          type="button"
          onClick={() => setMode('free')}
          className={cn(
            'text-sm px-4 py-2 rounded-xl font-bold border transition',
            mode === 'free' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white border-orange-200 hover:bg-violet-50',
          )}
        >
          ✨ 自由生视频
        </button>
      </div>

      {mode === 'free' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFreeFrameMode('no-frame')}
              className={cn(
                'text-sm px-4 py-2 rounded-xl font-bold border transition',
                freeFrameMode === 'no-frame' ? 'bg-brand text-white border-brand' : 'bg-white border-orange-200 hover:bg-orange-50',
              )}
            >
              📝 无首帧
            </button>
            <button
              type="button"
              onClick={() => setFreeFrameMode('with-frame')}
              className={cn(
                'text-sm px-4 py-2 rounded-xl font-bold border transition',
                freeFrameMode === 'with-frame' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white border-orange-200 hover:bg-violet-50',
              )}
            >
              🖼️ 有首帧
            </button>
          </div>
          {freeFrameMode === 'no-frame' ? (
            <FreeCreateFlow kind="video" progressSlug={freeProgressSlug} refImageMode="optional" />
          ) : (
            <FreeCreateFlow kind="video" progressSlug={freeProgressSlug} refImageMode="required" />
          )}
        </div>
      ) : (
        <>
          <div className="kid-card space-y-3">
            <PromptTemplates category="video" onPick={(t) => setPrompt(t.prompt)} />
            <div>
              <label className="text-sm font-semibold">视频描述（必填）</label>
              <textarea
                className={cn('kid-textarea', compact && '!min-h-[80px] text-sm')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：一只小狐狸在森林里追着萤火虫跑"
              />
            </div>
            <ReferenceImageField
              value={refImage}
              onChange={setRefImage}
              label="参考图（可选）"
              hint="点这里上传或从素材库选一张图，AI 会参考它来生视频（不用填链接）"
            />
            {refImageSeed && refImage && (
              <p className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
                🎨 已从生图页面带入参考图，可以直接填写视频描述并提交。
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold">时长 (秒)</label>
                <select className="kid-input mt-2" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  <option value={5}>5 秒</option>
                  <option value={8}>8 秒</option>
                  <option value={11}>11 秒</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold">画面比例</label>
                <select className="kid-input mt-2" value={ratio} onChange={(e) => setRatio(e.target.value)}>
                  <option value="16:9">16:9 横屏</option>
                  <option value="9:16">9:16 竖屏</option>
                  <option value="1:1">1:1 方形</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => void submit()} disabled={busy} className="kid-button-primary">
                {busy ? '提交中…' : '提交视频任务'}
              </button>
              <VideoGenTimeHint />
            </div>
            <p className="text-xs text-slate-500">生成成功的视频会自动保存到你的素材库。</p>
            {error && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <div className="kid-card">
            <h3 className="font-semibold mb-3">我的视频任务</h3>
            {(busy || jobs.some((j) => j.status === 'queued' || j.status === 'running')) && (
              <div className="mb-3">
                <AiProgress label="AI 正在生成视频，完成后会自动保存到素材库…" estimate="平均每段约 3 分钟" />
              </div>
            )}
            {jobs.length === 0 && <div className="text-sm text-slate-500">暂时没有任务</div>}
            <div className="space-y-3">
              {jobs.map((j) => (
                <div key={j.id} className="border border-orange-100 rounded-2xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium truncate flex-1 pr-2">{j.prompt}</div>
                    <VideoJobStatusTag status={j.status} />
                  </div>
                  {j.status === 'succeeded' && j.output?.videoUrl && (
                    <>
                      <InlineVideoPlayer
                        src={resolveUploadPath(j.output.videoUrl)}
                        className="mt-3"
                        height={compact ? 'h-48' : 'h-72'}
                      />
                      <VideoResultActions
                        url={j.output.videoUrl}
                        title={j.prompt.slice(0, 20) || 'AI视频'}
                        savedToLibrary={!!j.assets?.[0]?.id}
                        assetId={j.assets?.[0]?.id}
                        saving={savingJobId === j.id}
                        onSave={j.assets?.[0]?.id ? undefined : () => void saveJobToLibrary(j)}
                      />
                    </>
                  )}
                  {j.status === 'failed' && <div className="text-xs text-rose-600 mt-2">{j.error}</div>}
                </div>
              ))}
            </div>
            {jobs.length > 0 && (
              <div className="mt-4">
                <AiWarning />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function VideoJobStatusTag({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: 'bg-slate-100 text-slate-600',
    running: 'bg-amber-100 text-amber-700',
    succeeded: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-rose-100 text-rose-700',
  };
  const label: Record<string, string> = {
    queued: '排队中',
    running: '生成中',
    succeeded: '已完成',
    failed: '失败',
  };
  return <span className={`text-xs px-2 py-1 rounded-full ${map[status] || ''}`}>{label[status] || status}</span>;
}
