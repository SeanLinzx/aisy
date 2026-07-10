import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { stringifyJson } from '../../common/utils/json';
import { persistAudioUrl } from '../../common/utils/image-store';
import { createMusicClient } from '../ai/providers/volcengine-music.client';

@Injectable()
export class MusicTaskPoller implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('MusicTaskPoller');
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly client = createMusicClient();

  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: AssetsService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const pending = await this.prisma.aiGenerationJob.findMany({
        where: {
          jobType: 'music',
          status: { in: ['queued', 'running'] },
          externalTaskId: { not: null },
        },
        select: { id: true },
      });
      for (const job of pending) {
        this.logger.log(`Resuming music poll for job ${job.id}`);
        this.schedule(job.id);
      }
    } catch (e: any) {
      this.logger.warn(`Could not resume pending music jobs: ${e?.message}`);
    }
  }

  onModuleDestroy(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  schedule(jobId: string): void {
    if (this.timers.has(jobId)) return;

    let attempt = 0;
    const maxAttempts = 90;

    const scheduleNext = (delayMs: number) => {
      const tid = setTimeout(() => void tick(), delayMs);
      this.timers.set(jobId, tid);
    };

    const tick = async () => {
      this.timers.delete(jobId);
      attempt += 1;
      try {
        const dbJob = await this.prisma.aiGenerationJob.findUnique({ where: { id: jobId } });
        if (!dbJob) return;
        if (dbJob.status === 'succeeded' || dbJob.status === 'failed') return;
        if (!dbJob.externalTaskId) return;

        const result = await this.client.pollSongTask(dbJob.externalTaskId);

        if (result.status === 'succeeded') {
          const audioUrl = result.audioUrl ? await persistAudioUrl(result.audioUrl) : undefined;
          if (!audioUrl) {
            await this.prisma.aiGenerationJob.update({
              where: { id: dbJob.id },
              data: {
                status: 'failed',
                finishedAt: new Date(),
                error: '音乐任务已完成，但未返回可播放的音频地址',
                output: stringifyJson({ raw: result.raw ?? null }),
              },
            });
            return;
          }
          await this.prisma.aiGenerationJob.update({
            where: { id: dbJob.id },
            data: {
              status: 'succeeded',
              finishedAt: new Date(),
              output: stringifyJson({ audioUrl, raw: result.raw ?? null }),
            },
          });
          await this.assets.create({
            ownerId: dbJob.userId,
            type: 'audio',
            title: dbJob.prompt?.slice(0, 32) || 'AI 音乐',
            url: audioUrl,
            jobId: dbJob.id,
            meta: {
              provider: 'volcengine-music',
              taskId: dbJob.externalTaskId,
              sourceUrl: result.audioUrl,
            },
          });
          return;
        }

        if (result.status === 'failed') {
          await this.prisma.aiGenerationJob.update({
            where: { id: dbJob.id },
            data: {
              status: 'failed',
              finishedAt: new Date(),
              error: result.error || 'music task failed',
            },
          });
          return;
        }
      } catch (e: any) {
        this.logger.warn(`Music poll attempt ${attempt} for ${jobId}: ${e?.message}`);
      }

      if (attempt >= maxAttempts) {
        await this.prisma.aiGenerationJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            finishedAt: new Date(),
            error: `music polling timed out after ${maxAttempts} attempts`,
          },
        });
        return;
      }

      scheduleNext(4000);
    };

    scheduleNext(4000);
  }
}
