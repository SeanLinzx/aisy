'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { ImageUpload } from '@/components/course/image-upload';
import { AiProgress } from '@/components/course/ai-progress';
import { VideoGenTimeHint } from '@/components/video-gen-time-hint';
import { humanizeArkVideoError, sanitizeCopyrightTerms } from '@/lib/prompt-sanitize';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';

interface Segment {
  jobId: string;
  prompt: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  videoUrl?: string;
  error?: string;
  assetId?: string;
}

function extractVideoUrl(output: unknown): string | undefined {
  if (!output) return undefined;
  let obj: unknown = output;
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch {
      return undefined;
    }
  }
  if (typeof obj !== 'object' || obj === null) return undefined;
  const o = obj as Record<string, unknown>;
  if (typeof o.videoUrl === 'string' && o.videoUrl.trim()) return o.videoUrl.trim();
  const raw = o.raw;
  if (typeof raw === 'object' && raw !== null) {
    const r = raw as Record<string, unknown>;
    if (typeof r.videoUrl === 'string' && r.videoUrl.trim()) return r.videoUrl.trim();
  }
  return undefined;
}

function mapJobToSegment(
  seg: Segment,
  job: { status?: string; output?: unknown; error?: string | null; assets?: Array<{ id: string }> },
): Segment {
  const videoUrl = extractVideoUrl(job.output);
  const status = (job.status as Segment['status']) || seg.status;
  const assetId = job.assets?.[0]?.id || seg.assetId;
  return {
    ...seg,
    status,
    videoUrl: videoUrl || seg.videoUrl,
    error: humanizeArkVideoError(job.error) || seg.error,
    assetId,
  };
}

async function downloadVideo(url: string, filename: string) {
  const src = resolveUploadPath(url);
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(src, '_blank', 'noopener,noreferrer');
  }
}

export function FrameVideoGame() {
  const report = useReportGameProgress('frame-video');
  const [frames, setFrames] = useState<(string | null)[]>([null, null]);
  const [descs, setDescs] = useState<string[]>(['']);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergedVideo, setMergedVideo] = useState<{ url: string; assetId?: string } | null>(null);
  const autoSavingRef = useRef(new Set<string>());
  const segmentsRef = useRef<Segment[]>([]);
  segmentsRef.current = segments;

  const pollOnce = useCallback(async () => {
    const current = segmentsRef.current;
    if (current.length === 0) return;
    try {
      const updated = await Promise.all(
        current.map(async (seg) => {
          if (seg.status === 'succeeded' && seg.videoUrl) return seg;
          if (seg.status === 'failed') return seg;
          try {
            const r = await api.get(`/ai-generate/jobs/${seg.jobId}`);
            return mapJobToSegment(seg, r.data || {});
          } catch {
            try {
              const list = await api.get('/ai-generate/jobs', { params: { type: 'video' } });
              const jobs: Array<{ id: string; status?: string; output?: unknown; error?: string }> =
                list.data || [];
              const j = jobs.find((x) => x.id === seg.jobId);
              return j ? mapJobToSegment(seg, j) : seg;
            } catch {
              return seg;
            }
          }
        }),
      );
      setSegments(updated);

      // 后端自动入库的兜底：若任务已成功但尚未关联素材，客户端补存一次
      for (let i = 0; i < updated.length; i++) {
        const seg = updated[i];
        if (
          seg.status === 'succeeded'
          && seg.videoUrl
          && !seg.assetId
          && !autoSavingRef.current.has(seg.jobId)
        ) {
          autoSavingRef.current.add(seg.jobId);
          void (async () => {
            try {
              const r = await api.post('/assets', {
                type: 'video',
                title: `分镜视频·第${i + 1}段·${seg.prompt.slice(0, 16)}`,
                url: seg.videoUrl,
                meta: { courseGame: 'frame-video', segmentIndex: i, prompt: seg.prompt, jobId: seg.jobId, autoSaved: true },
              });
              setSegments((prev) =>
                prev.map((s) => (s.jobId === seg.jobId ? { ...s, assetId: r.data.id } : s)),
              );
            } catch {
              autoSavingRef.current.delete(seg.jobId);
            }
          })();
        }
      }
    } catch {
      /* ignore transient poll errors */
    }
  }, []);

  useEffect(() => {
    if (segments.length === 0) return;
    const pending = segments.some((s) => s.status === 'queued' || s.status === 'running');
    const missingUrl = segments.some((s) => s.status === 'succeeded' && !s.videoUrl);
    if (!pending && !missingUrl) return;

    void pollOnce();
    const timer = setInterval(() => void pollOnce(), 3000);
    return () => clearInterval(timer);
  }, [segments, pollOnce]);

  useEffect(() => {
    if (segments.length === 0) return;
    const doneCount = segments.filter((s) => s.status === 'succeeded').length;
    const pending = segments.some((s) => s.status === 'queued' || s.status === 'running');
    const failed = segments.some((s) => s.status === 'failed');
    const latestVideo = mergedVideo?.url || [...segments].reverse().find((s) => s.videoUrl)?.videoUrl;
    const status = failed && doneCount === 0 ? 'failed' : pending ? 'generating' : doneCount > 0 ? 'done' : 'generating';
    void report({
      status,
      summary: mergedVideo
        ? `已拼接为完整视频（共 ${segments.length} 段）`
        : `已完成 ${doneCount}/${segments.length} 段视频`,
      videoUrl: latestVideo,
      thumbnailUrl: latestVideo,
      items: segments.map((s, i) => ({
        url: s.videoUrl,
        prompt: s.prompt,
        label: `第 ${i + 1} 段`,
        status: s.status,
      })),
      error: failed ? segments.find((s) => s.error)?.error : undefined,
    });
  }, [segments, mergedVideo, report]);

  function setFrame(i: number, url: string) {
    setFrames((f) => f.map((v, idx) => (idx === i ? url : v)));
  }
  function setDesc(i: number, v: string) {
    setDescs((d) => d.map((x, idx) => (idx === i ? v : x)));
  }
  function addFrame() {
    setFrames((f) => [...f, null]);
    setDescs((d) => [...d, '']);
  }
  function removeFrameAt(k: number) {
    if (frames.length <= 2) return;
    const removeDesc = k === 0 ? 0 : k - 1;
    setFrames((f) => f.filter((_, idx) => idx !== k));
    setDescs((d) => d.filter((_, idx) => idx !== removeDesc));
  }

  function frameLabel(i: number) {
    if (i === 0) return '🎬 首帧';
    if (i === frames.length - 1) return '🏁 尾帧';
    return `帧 ${i + 1}`;
  }


  async function generate() {
    if (!frames.every((f) => !!f)) {
      setError('请先给每个分镜都上传图片。');
      return;
    }
    if (descs.some((d) => !d.trim())) {
      setError('请描述每两个分镜之间发生的事情。');
      return;
    }
    setBusy(true);
    setError(null);
    setSegments([]);
    setMergedVideo(null);
    setMergeError(null);
    void report({ status: 'generating', summary: '正在提交视频任务…' });
    try {
      const created: Segment[] = [];
      for (let i = 0; i < frames.length - 1; i++) {
        const safePrompt = sanitizeCopyrightTerms(descs[i].trim());
        const r = await api.post('/ai-generate/video', {
          prompt: safePrompt,
          title: `分镜视频·第${i + 1}段·${descs[i].trim().slice(0, 16)}`,
          references: [
            { type: 'image', url: frames[i], role: 'first_frame' },
            { type: 'image', url: frames[i + 1], role: 'last_frame' },
          ],
          duration: 5,
          ratio: '16:9',
          generateAudio: true,
        });
        created.push({ jobId: r.data.jobId, prompt: descs[i].trim(), status: 'queued' });
      }
      setSegments(created);
      setTimeout(() => void pollOnce(), 500);
    } catch (e: unknown) {
      setError((e as Error)?.message || '提交失败');
    } finally {
      setBusy(false);
    }
  }

  async function mergeVideos() {
    const urls = segments.filter((s) => s.status === 'succeeded' && s.videoUrl).map((s) => s.videoUrl!);
    if (urls.length < 2) {
      setMergeError('至少需要 2 段已完成的视频才能拼接。');
      return;
    }
    setMergeBusy(true);
    setMergeError(null);
    try {
      const r = await api.post('/ai-generate/video/concat', {
        videoUrls: urls,
        title: `分镜完整视频 · ${urls.length} 段`,
        segmentJobIds: segments.map((s) => s.jobId),
        courseGame: 'frame-video',
      });
      setMergedVideo({ url: r.data.videoUrl, assetId: r.data.assetId });
    } catch (e: unknown) {
      setMergeError((e as Error)?.message || '拼接失败，请稍后重试');
    } finally {
      setMergeBusy(false);
    }
  }

  const hasPending = segments.some((s) => s.status === 'queued' || s.status === 'running');
  const showResults = segments.length > 0;
  const succeededSegments = segments.filter((s) => s.status === 'succeeded' && s.videoUrl);
  const allSaved = succeededSegments.length > 0 && succeededSegments.every((s) => s.assetId);
  const canMerge = succeededSegments.length >= 2 && !hasPending;

  return (
    <div className="space-y-4">
      <div className="kid-card-sky">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🪄 上传关键帧图片并排好顺序，描述相邻两帧之间发生了什么，AI 就会生成把它们连起来的视频！<b>每段视频平均约 3 分钟</b>，生成完成后会<b>自动保存到素材库</b>，也可以下载到本机。点最右边的「➕ 添加分镜」可以加更多镜头。
        </p>
        <div className="mt-2">
          <VideoGenTimeHint />
        </div>
      </div>

      <div className="kid-card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold">🎞️ 我的分镜（共 {frames.length} 帧 · {frames.length - 1} 段视频）</div>
        </div>
        <div className="flex items-stretch gap-3 overflow-x-auto pb-2">
          {frames.map((url, i) => (
            <div key={i} className="flex items-stretch gap-3">
              <div className="w-44 shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{frameLabel(i)}</span>
                  {frames.length > 2 && (
                    <button onClick={() => removeFrameAt(i)} className="text-xs text-rose-500 hover:text-rose-600">
                      ✕ 删除
                    </button>
                  )}
                </div>
                <ImageUpload value={url} onChange={(u) => setFrame(i, u)} label="上传图片" />
              </div>
              {i < frames.length - 1 && <div className="flex items-center text-2xl text-ink-soft shrink-0">→</div>}
            </div>
          ))}
          <div className="w-44 shrink-0">
            <div className="text-xs font-bold mb-1 opacity-0">添加</div>
            <button
              onClick={addFrame}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 hover:border-emerald-400 transition flex flex-col items-center justify-center text-emerald-700"
            >
              <span className="text-3xl">➕</span>
              <span className="text-xs font-bold mt-1">添加分镜</span>
            </button>
          </div>
        </div>
      </div>

      <div className="kid-card space-y-3">
        <div className="text-sm font-bold">✏️ 每两帧之间发生了什么？</div>
        {descs.map((d, i) => (
          <div key={i}>
            <label className="text-xs font-bold text-ink-soft">
              第 {i + 1} 段：{frameLabel(i)} → {frameLabel(i + 1)}
            </label>
            <input
              className="kid-input !py-2"
              value={d}
              onChange={(e) => setDesc(i, e.target.value)}
              placeholder="例如：小恐龙慢慢变成公主（不要写具体角色名）"
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={generate} disabled={busy || hasPending} className="kid-button-primary">
            {busy ? '提交中…' : hasPending ? '🎬 视频生成中…' : '🎥 生成视频'}
          </button>
          <VideoGenTimeHint />
        </div>
        {(busy || hasPending) && (
          <AiProgress
            label="AI 正在生成视频，生成完成后会在下方自动播放并保存到素材库…"
            estimate="平均每段约 3 分钟"
          />
        )}
        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
        )}
      </div>

      {showResults && (
        <div className="kid-card space-y-3">
          <div className="text-sm font-bold">🎬 视频预览（按顺序）</div>
          {segments.map((s, i) => {
            const src = s.videoUrl ? resolveUploadPath(s.videoUrl) : '';
            return (
              <div key={s.jobId} className="border-2 border-orange-100 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm font-bold">第 {i + 1} 段：{s.prompt}</div>
                  <StatusTag status={s.status} />
                </div>

                {(s.status === 'queued' || s.status === 'running') && (
                  <div className="aspect-video rounded-xl bg-slate-100 flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
                    <span className="text-2xl animate-pulse">🎬</span>
                    <span>AI 正在生成这一段视频，请稍候…</span>
                    <VideoGenTimeHint />
                  </div>
                )}

                {s.status === 'succeeded' && src && (
                  <div className="space-y-2">
                    <video
                      key={src}
                      src={src}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-80 rounded-xl bg-black"
                    />
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => void downloadVideo(s.videoUrl!, `分镜视频-第${i + 1}段.mp4`)}
                        className="kid-button-ghost text-sm"
                      >
                        ⬇ 下载视频
                      </button>
                      {s.assetId ? (
                        <span className="inline-flex items-center text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                          ✅ 已自动保存到素材库
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          💾 正在写入素材库…
                        </span>
                      )}
                      <a
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-bold text-sky-600 hover:text-sky-700 px-3 py-2"
                      >
                        ↗ 新窗口打开
                      </a>
                    </div>
                  </div>
                )}

                {s.status === 'succeeded' && !src && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    任务已完成，但暂时拿不到视频地址，请稍等几秒或刷新页面。
                  </div>
                )}

                {s.status === 'failed' && (
                  <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    {humanizeArkVideoError(s.error) || s.error || '生成失败，请换一段描述再试一次。'}
                  </div>
                )}
              </div>
            );
          })}
          {allSaved && (
            <p className="text-sm text-emerald-700 font-semibold">
              ✅ 全部视频已自动保存到素材库。
              <Link href="/student/assets" className="underline font-bold ml-1">
                去素材库查看 →
              </Link>
            </p>
          )}

          {canMerge && (
            <div className="border-2 border-sky-200 bg-sky-50/60 rounded-2xl p-4 space-y-3">
              <div className="text-sm font-bold text-sky-900">🎞️ 拼接完整视频</div>
              <p className="text-sm text-sky-800">
                把上面 {succeededSegments.length} 段视频按顺序合成一条完整视频，方便下载或给老师看板展示。
              </p>
              {!mergedVideo && (
                <button
                  type="button"
                  onClick={() => void mergeVideos()}
                  disabled={mergeBusy}
                  className="kid-button-primary"
                >
                  {mergeBusy ? '正在拼接…' : '🔗 拼接为完整视频'}
                </button>
              )}
              {mergeError && (
                <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {mergeError}
                </div>
              )}
              {mergedVideo && (
                <div className="space-y-2">
                  <video
                    key={mergedVideo.url}
                    src={resolveUploadPath(mergedVideo.url)}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full max-h-96 rounded-xl bg-black"
                  />
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => void downloadVideo(mergedVideo.url, '分镜完整视频.mp4')}
                      className="kid-button-ghost text-sm"
                    >
                      ⬇ 下载完整视频
                    </button>
                    {mergedVideo.assetId ? (
                      <span className="inline-flex items-center text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                        ✅ 已保存到素材库
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setMergedVideo(null);
                        setMergeError(null);
                      }}
                      className="kid-button-ghost text-sm"
                    >
                      🔄 重新拼接
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <AiWarning />
        </div>
      )}
    </div>
  );
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: 'bg-slate-100 text-slate-600',
    running: 'bg-amber-100 text-amber-700',
    succeeded: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-rose-100 text-rose-700',
  };
  const label: Record<string, string> = { queued: '排队中', running: '生成中', succeeded: '已完成', failed: '失败' };
  return <span className={`text-xs px-2 py-1 rounded-full ${map[status] || ''}`}>{label[status] || status}</span>;
}
