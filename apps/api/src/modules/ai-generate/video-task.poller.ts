import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../ai/provider-registry';
import { AssetsService } from '../assets/assets.service';
import { parseJson, stringifyJson } from '../../common/utils/json';
import { persistVideoUrl, extractVideoThumbnail } from '../../common/utils/image-store';

type VideoJobRow = {
  id: string;
  userId: string;
  prompt: string | null;
  providerName: string;
  modelCode: string | null;
  externalTaskId: string | null;
  input: string | null;
  output: string | null;
};

/**
 * Lightweight replacement for Redis + BullMQ when running locally without Docker.
 * Each video task schedules a chained setTimeout that polls Ark / Mock until terminal.
 */
@Injectable()
export class VideoTaskPoller implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('VideoTaskPoller');
  /** jobId → next poll timer */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistry,
    private readonly assets: AssetsService,
  ) {}

  /** 服务重启后恢复未完成视频任务的轮询，并补全已成功但未入库的视频素材。 */
  async onModuleInit(): Promise<void> {
    try {
      const pending = await this.prisma.aiGenerationJob.findMany({
        where: {
          jobType: 'video',
          status: { in: ['queued', 'running'] },
          externalTaskId: { not: null },
        },
        select: { id: true },
      });
      for (const job of pending) {
        this.logger.log(`Resuming video poll for job ${job.id}`);
        this.schedule(job.id);
      }

      const missingAssets = await this.prisma.aiGenerationJob.findMany({
        where: {
          jobType: 'video',
          status: 'succeeded',
          assets: { none: {} },
        },
        take: 100,
      });
      for (const job of missingAssets) {
        const output = parseJson<{ videoUrl?: string; sourceUrls?: string[] }>(job.output, {});
        if (output.videoUrl) {
          await this.ensureVideoAsset(job, output.videoUrl, output.sourceUrls?.[0]);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Could not resume pending video jobs: ${e?.message}`);
    }
  }

  onModuleDestroy(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  /** 停止指定任务的轮询（用户取消或任务已终态时）。 */
  cancel(jobId: string): void {
    const tid = this.timers.get(jobId);
    if (tid) {
      clearTimeout(tid);
      this.timers.delete(jobId);
    }
  }

  /** 幂等：每个视频任务最多对应一条素材库记录 */
  private async ensureVideoAsset(
    dbJob: VideoJobRow,
    videoUrl: string,
    sourceUrl?: string,
  ) {
    const existing = await this.prisma.asset.findFirst({
      where: { jobId: dbJob.id, type: 'video', archived: false },
    });
    if (existing) return existing;

    const inputMeta = dbJob.input ? parseJson<Record<string, unknown>>(dbJob.input, {}) : {};
    const title =
      (typeof inputMeta.title === 'string' && inputMeta.title.trim())
      || dbJob.prompt?.slice(0, 32)
      || 'AI 视频';

    try {
      const thumbnailUrl = (await extractVideoThumbnail(videoUrl)) ?? undefined;
      return await this.assets.create({
        ownerId: dbJob.userId,
        type: 'video',
        title,
        url: videoUrl,
        thumbnailUrl,
        jobId: dbJob.id,
        meta: {
          provider: dbJob.providerName,
          model: dbJob.modelCode ?? undefined,
          taskId: dbJob.externalTaskId,
          sourceUrl: sourceUrl ?? videoUrl,
          originalPrompt: inputMeta.originalPrompt,
          prompt:
            (typeof inputMeta.originalPrompt === 'string' && inputMeta.originalPrompt.trim())
            || dbJob.prompt
            || undefined,
          mode: inputMeta.mode ?? 'guided',
          autoSaved: true,
        },
      });
    } catch (e: any) {
      this.logger.warn(`ensureVideoAsset failed for job ${dbJob.id}: ${e?.message}`);
      return null;
    }
  }

  /** 后台落盘 CDN 视频并更新 job 输出 + 素材库，避免 poll tick 阻塞 */
  private async backgroundPersistVideo(dbJob: VideoJobRow, sourceUrl: string) {
    const videoUrl = await persistVideoUrl(sourceUrl);
    if (!videoUrl) {
      await this.prisma.aiGenerationJob.update({
        where: { id: dbJob.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error: '视频任务已完成，但未返回可播放的视频地址',
        },
      });
      return;
    }
    await this.prisma.aiGenerationJob.update({
      where: { id: dbJob.id },
      data: {
        output: stringifyJson({
          videoUrl,
          sourceUrls: [sourceUrl],
          persistPending: false,
        }),
      },
    });
    await this.ensureVideoAsset(dbJob, videoUrl, sourceUrl);
  }

  /**
   * Starts background polling chain (once per AiGenerationJob).
   * `onSettled` (若提供) 会在任务到达终态（成功/失败/超时失败）时被调用一次，
   * 用于释放本地并发闸门名额（见 concurrency-gate.ts），让排队中的下一个任务开始。
   */
  schedule(jobId: string, onSettled?: () => void): void {
    if (this.timers.has(jobId)) return;

    let attempt = 0;
    const maxAttempts = 225; // ~15 min @ 4s spacing（多段分镜 Classroom 场景下单段可能排队+生成较久）
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      onSettled?.();
    };

    const scheduleNext = (delayMs: number) => {
      const tid = setTimeout(() => void tick(), delayMs);
      this.timers.set(jobId, tid);
    };

    const tick = async () => {
      this.timers.delete(jobId);

      attempt += 1;
      try {
        const dbJob = await this.prisma.aiGenerationJob.findUnique({ where: { id: jobId } });
        if (!dbJob) {
          this.logger.warn(`Video poll: job ${jobId} vanished`);
          settle();
          return;
        }
        if (dbJob.status === 'succeeded' || dbJob.status === 'failed' || dbJob.status === 'cancelled') {
          settle();
          return;
        }
        if (!dbJob.externalTaskId) {
          this.logger.warn(`Video poll: job ${jobId} missing externalTaskId`);
          settle();
          return;
        }

        const provider = this.registry.get(dbJob.providerName);
        const result = await provider.pollVideoTask(dbJob.externalTaskId);

        if (result.status === 'succeeded') {
          const rawVideoUrl = result.videoUrl;
          if (!rawVideoUrl) {
            await this.prisma.aiGenerationJob.update({
              where: { id: dbJob.id },
              data: {
                status: 'failed',
                finishedAt: new Date(),
                error: '视频任务已完成，但未返回可播放的视频地址',
                output: stringifyJson({ raw: result.raw ?? null }),
              },
            });
            settle();
            return;
          }
          await this.prisma.aiGenerationJob.update({
            where: { id: dbJob.id },
            data: {
              status: 'succeeded',
              finishedAt: new Date(),
              output: stringifyJson({
                videoUrl: rawVideoUrl,
                sourceUrls: rawVideoUrl ? [rawVideoUrl] : undefined,
                raw: result.raw ?? null,
                persistPending: Boolean(rawVideoUrl),
              }),
            },
          });
          if (rawVideoUrl) {
            void this.backgroundPersistVideo(dbJob, rawVideoUrl).catch((e) => {
              this.logger.warn(`Background video persist for ${dbJob.id}: ${e?.message}`);
            });
          }
          settle();
          return;
        }

        if (result.status === 'failed') {
          await this.prisma.aiGenerationJob.update({
            where: { id: dbJob.id },
            data: {
              status: 'failed',
              finishedAt: new Date(),
              error: result.error || 'video task failed',
            },
          });
          settle();
          return;
        }

        // still queued / running → continue
      } catch (e: any) {
        this.logger.warn(`Video poll attempt ${attempt} for ${jobId}: ${e?.message}`);
      }

      if (attempt >= maxAttempts) {
        await this.prisma.aiGenerationJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            finishedAt: new Date(),
            error: `video polling timed out after ${maxAttempts} attempts`,
          },
        });
        settle();
        return;
      }

      scheduleNext(4000);
    };

    scheduleNext(4000);
  }
}
