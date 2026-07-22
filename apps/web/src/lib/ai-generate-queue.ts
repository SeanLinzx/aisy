import { api } from './api';

/**
 * 生图接口在并发达到上限时不会直接报错，而是返回 `{ queued: true, queuePosition }`，
 * 由前端改为轮询任务状态并展示"前面还有 XX 人排队"。这个辅助函数把两种情况统一封装：
 * 名额充足时和以前一样直接拿到结果；排队时自动轮询直到成功/失败，期间通过 onQueueUpdate
 * 回调实时上报排队位置，供页面展示排队提醒。
 */

export interface ImageGenerationResponse {
  jobId: string;
  imageUrls?: string[];
  sourceUrls?: string[];
  asset?: { id: string } | null;
  queued?: boolean;
  queuePosition?: number;
}

export interface WebGenerationResponse {
  jobId: string;
  html?: string;
  css?: string;
  js?: string;
  status?: string;
}

const POLL_BASE_MS = 2500;
const POLL_MAX_MS = 10_000;
const MAX_WAIT_MS = 10 * 60 * 1000;

function nextPollDelay(attempt: number): number {
  const delay = POLL_BASE_MS * Math.pow(1.6, attempt);
  return Math.min(Math.round(delay), POLL_MAX_MS);
}

async function pollJobUntilSettled<T>(
  jobId: string,
  parseSuccess: (job: {
    status: string;
    output?: Record<string, unknown>;
    error?: string;
    queuePosition?: number;
  }) => T | null,
  onQueueUpdate?: (position: number) => void,
): Promise<T> {
  const startedAt = Date.now();
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() - startedAt > MAX_WAIT_MS) {
      throw new Error('排队等待超时，请稍后重试');
    }
    await new Promise((resolve) => setTimeout(resolve, nextPollDelay(attempt)));
    attempt += 1;
    const r = await api.get(`/ai-generate/jobs/${jobId}`);
    const job = r.data as {
      status: string;
      output?: Record<string, unknown>;
      error?: string;
      queuePosition?: number;
    };
    if (job.status === 'succeeded') {
      const parsed = parseSuccess(job);
      if (parsed != null) return parsed;
      throw new Error('任务已完成但缺少输出内容');
    }
    if (job.status === 'failed' || job.status === 'cancelled') {
      throw new Error(job.error || '生成失败');
    }
    if (typeof job.queuePosition === 'number') onQueueUpdate?.(job.queuePosition);
  }
}

export async function generateImageWithQueue(
  payload: Record<string, unknown>,
  onQueueUpdate?: (position: number) => void,
): Promise<ImageGenerationResponse> {
  const r = await api.post('/ai-generate/image', payload);
  const data = r.data as ImageGenerationResponse;
  if (!data.queued) return data;

  onQueueUpdate?.(data.queuePosition ?? 0);
  return pollJobUntilSettled(
    data.jobId,
    (job) => ({
      jobId: data.jobId,
      imageUrls: (job.output?.imageUrls as string[]) || [],
      sourceUrls: job.output?.sourceUrls as string[] | undefined,
      asset: null,
    }),
    onQueueUpdate,
  );
}

/** 网页生成：API 立即返回 jobId，前端轮询直到 html/css/js 就绪 */
export async function generateWebWithQueue(
  payload: Record<string, unknown>,
  onStatusUpdate?: (status: string) => void,
): Promise<WebGenerationResponse> {
  const r = await api.post('/ai-generate/web', payload);
  const data = r.data as WebGenerationResponse;

  if (data.html != null && data.status !== 'running' && data.status !== 'queued') {
    return data;
  }

  onStatusUpdate?.(data.status || 'running');
  return pollJobUntilSettled(
    data.jobId,
    (job) => ({
      jobId: data.jobId,
      html: (job.output?.html as string) || '',
      css: (job.output?.css as string) || '',
      js: (job.output?.js as string) || '',
      status: 'succeeded',
    }),
    (pos) => onStatusUpdate?.(`queued:${pos}`),
  );
}
