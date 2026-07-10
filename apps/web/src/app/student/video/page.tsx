'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { PromptTemplates } from '@/components/prompt-templates';
import { AiProgress } from '@/components/course/ai-progress';
import { ExploreToolHeader } from '@/components/explore-tool-header';
import { FreeCreateFlow } from '@/components/creative/free-create-flow';
import { VideoGenTimeHint } from '@/components/video-gen-time-hint';
import { ReferenceImageField } from '@/components/reference-image-field';
import { VideoResultActions } from '@/components/media-result-actions';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';

type Mode = 'guided' | 'free';

interface Job {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  output?: { videoUrl?: string };
  error?: string;
  prompt: string;
  assets?: Array<{ id: string }>;
}

function VideoPageContent() {
  const searchParams = useSearchParams();
  const fromCourse = searchParams.get('from') === 'course';
  const lessonSlug = searchParams.get('lesson') || 'lesson3';
  const modeParam = searchParams.get('mode');
  const backHref = fromCourse ? `/student/course/${lessonSlug}` : '/student/explore';
  const backLabel = fromCourse ? '← 返回课程' : '← 返回探索模式';

  const [mode, setMode] = useState<Mode>(modeParam === 'free' ? 'free' : 'guided');
  const [prompt, setPrompt] = useState('');
  const [refImage, setRefImage] = useState('');
  const [duration, setDuration] = useState(5);
  const [ratio, setRatio] = useState('16:9');
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const report = useReportGameProgress('video-guided');

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
    const ref = searchParams.get('refImage');
    if (ref) setRefImage(ref);
  }, [searchParams]);

  useEffect(() => {
    if (modeParam === 'free' || modeParam === 'guided') setMode(modeParam);
  }, [modeParam]);

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
    <div className="space-y-6 max-w-4xl">
      <ExploreToolHeader
        title="🎬 AI 生成视频"
        desc={
          fromCourse
            ? '课程第 4 课配套工具：模板提交视频任务，或自由生视频（AI 先优化提示词）。'
            : '用模板快速提交任务，或使用「自由生视频」—— AI 先优化提示词，生成后可保存完整创作网页到「我的网页」。'
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
          📋 模板生视频
        </button>
        <button
          type="button"
          onClick={() => setMode('free')}
          className={`text-sm px-4 py-2 rounded-xl font-bold border transition ${
            mode === 'free' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white border-orange-200 hover:bg-violet-50'
          }`}
        >
          ✨ 自由生视频
        </button>
      </div>

      {mode === 'free' ? (
        <FreeCreateFlow kind="video" progressSlug="video-free" />
      ) : (
        <>
          <div className="kid-card space-y-4">
            <PromptTemplates category="video" onPick={(t) => setPrompt(t.prompt)} />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">视频描述（必填）</label>
                <VoiceInputButton onResult={(t) => setPrompt((p) => (p ? `${p}\n${t}` : t))} />
              </div>
              <textarea
                className="kid-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：一只小狐狸在森林里追着萤火虫跑"
              />
            </div>
            <ReferenceImageField
              value={refImage}
              onChange={setRefImage}
              hint="上传或选择一张图片，AI 会参考它来生视频（不用填链接）"
            />
            {searchParams.get('refImage') && refImage && (
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
              <button onClick={submit} disabled={busy} className="kid-button-primary">
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
                    <StatusTag status={j.status} />
                  </div>
                  {j.status === 'succeeded' && j.output?.videoUrl && (
                    <>
                      <video
                        src={resolveUploadPath(j.output.videoUrl)}
                        controls
                        className="mt-3 w-full max-h-72 rounded-xl bg-black"
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

export default function VideoPage() {
  return (
    <Suspense fallback={<div className="text-slate-500 p-6">加载中…</div>}>
      <VideoPageContent />
    </Suspense>
  );
}

function StatusTag({ status }: { status: string }) {
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
