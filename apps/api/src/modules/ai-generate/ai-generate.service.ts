import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { JobStatus, JobType, Role } from '../../common/enums';
import { buildCreationSessionHtml } from '../../common/utils/creation-session-html';
import { parseJson, stringifyJson, stringifyJsonOrNull } from '../../common/utils/json';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../ai/provider-registry';
import { AssetsService } from '../assets/assets.service';
import { ConfigsService } from '../configs/configs.service';
import { containsSensitive } from '../../common/utils/html-sanitize';
import { persistImageUrl, persistImageUrls } from '../../common/utils/image-store';
import { concatVideoFiles } from '../../common/utils/video-concat';
import { extractVideoThumbnail } from '../../common/utils/image-store';
import { sanitizeCopyrightTerms } from '../../common/utils/prompt-sanitize';
import { ReferenceMediaItem, AiProviderAdapter } from '../ai/ai.types';
import { VideoTaskPoller } from './video-task.poller';
import { MusicTaskPoller } from './music-task.poller';
import { WebProjectsService } from '../web-projects/web-projects.service';
import { publishPath } from '../../common/utils/public-url';
import { createMusicClient, getMusicLyricsMaxLength, getMiniMaxMusicModel } from '../ai/providers/music-client.factory';
import { resolveArkVideoModel } from '../ai/providers/volcengine-ark.provider';
import { ConcurrencyGate, readPositiveIntEnv } from './concurrency-gate';

export interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateTextDto {
  prompt: string;
  model?: string;
  providerName?: string;
  saveAsAsset?: boolean;
  title?: string;
  system?: string;
  messages?: ChatMessageDto[];
}
export interface GenerateImageDto extends GenerateTextDto {
  references?: ReferenceMediaItem[];
  options?: { size?: string; n?: number; seed?: number; guidance_scale?: number; watermark?: boolean };
  /** 自由创作：用户原始输入 */
  originalPrompt?: string;
  mode?: 'guided' | 'free';
}
export interface GenerateWebDto extends GenerateTextDto {
  /** 为已有页面加入点击/动画等 JS 交互（课程「小交互」等场景） */
  interactive?: boolean;
  /** PM 小应用：强制生成 __AI_CAMP__ 真实 AI 调用，禁止 mock */
  aiCamp?: boolean;
}
export interface GeneratePosterDto extends GenerateTextDto {}
export interface GeneratePptDto extends GenerateTextDto {}
export interface GenerateMixedDto extends GenerateTextDto {
  references?: ReferenceMediaItem[];
}
export interface SubmitVideoDto extends GenerateTextDto {
  references?: ReferenceMediaItem[];
  duration?: number;
  ratio?: string;
  generateAudio?: boolean;
  originalPrompt?: string;
  mode?: 'guided' | 'free';
}

export interface SubmitMusicDto {
  lyrics: string;
  genre?: string;
  mood?: string;
  gender?: string;
  timbre?: string;
  duration?: number;
  title?: string;
}

export interface GenerateMusicLyricsDto {
  theme: string;
  genre?: string;
  mood?: string;
  model?: string;
  providerName?: string;
}

export interface OptimizePromptDto {
  rawInput: string;
  target: 'image' | 'video';
  model?: string;
  providerName?: string;
}

export interface SaveCreationSessionDto {
  kind: 'image' | 'video';
  title: string;
  rawPrompt: string;
  optimizedPrompt: string;
  imageUrls?: string[];
  videoUrl?: string;
  resultAssetId?: string;
  jobId?: string;
  /** 提示词素材默认在素材库隐藏，可通过 showHidden 查看 */
  hidePromptInLibrary?: boolean;
}

export interface ConcatVideoDto {
  videoUrls: string[];
  title?: string;
  segmentJobIds?: string[];
  courseGame?: string;
}

@Injectable()
export class AiGenerateService implements OnModuleInit {
  private readonly logger = new Logger('AiGenerate');

  /**
   * 排队提醒：生图 / 生视频对接的火山方舟模型都有账号级并发上限，30 个账号几乎同时提交时
   * 容易触发供应商侧的并发超限报错。这两个闸门把超出上限的请求转为本地排队而不是直接报错，
   * 具体阈值可通过环境变量覆盖，默认值见 .env.example 注释。
   */
  private readonly imageGate = new ConcurrencyGate(readPositiveIntEnv('AI_IMAGE_MAX_CONCURRENCY', 50));
  private readonly videoGate = new ConcurrencyGate(readPositiveIntEnv('AI_VIDEO_MAX_CONCURRENCY', 10));

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistry,
    private readonly assets: AssetsService,
    private readonly configs: ConfigsService,
    private readonly videoPoller: VideoTaskPoller,
    private readonly musicPoller: MusicTaskPoller,
    private readonly webProjects: WebProjectsService,
  ) {}

  /**
   * 服务重启会丢失内存中的排队状态。把"重启前还没排到、没真正开始生成"的任务标记失败并提示重新提交，
   * 避免它们永久卡在 queued 状态；已经真正提交给供应商的任务不受影响（由 VideoTaskPoller 单独恢复轮询）。
   */
  async onModuleInit(): Promise<void> {
    try {
      const stuckImages = await this.prisma.aiGenerationJob.findMany({
        where: { jobType: 'image', status: 'queued' },
        select: { id: true },
      });
      const stuckVideos = await this.prisma.aiGenerationJob.findMany({
        where: { jobType: 'video', status: 'queued', externalTaskId: null },
        select: { id: true },
      });
      for (const job of [...stuckImages, ...stuckVideos]) {
        await this.finishJob(job.id, 'failed', null, '服务已重启，排队状态丢失，请重新提交该任务');
      }
      if (stuckImages.length || stuckVideos.length) {
        this.logger.warn(`Marked ${stuckImages.length} image + ${stuckVideos.length} video stuck-in-queue jobs as failed after restart`);
      }
    } catch (e: any) {
      this.logger.warn(`Could not clean up stuck queued jobs: ${e?.message}`);
    }
  }

  // ---- Common helpers ----

  private async checkPrompt(prompt: string) {
    if (!prompt || prompt.trim().length === 0) throw new BadRequestException('提示词不能为空');
    const words = await this.configs.getSensitiveWords();
    const hit = containsSensitive(prompt, words);
    if (hit) throw new BadRequestException(`提示词包含敏感词："${hit}"，请修改后再试。`);
  }

  private async createJob(userId: string, jobType: JobType, providerName: string, modelCode: string | undefined, prompt: string, input?: any) {
    if (!userId) {
      throw new BadRequestException('未登录，请重新登录后再试');
    }
    return this.prisma.aiGenerationJob.create({
      data: {
        userId, jobType, providerName, modelCode,
        prompt, input: stringifyJsonOrNull(input),
        status: 'queued',
      },
    });
  }

  private async finishJob(id: string, status: JobStatus, output?: any, error?: string, externalId?: string) {
    return this.prisma.aiGenerationJob.update({
      where: { id },
      data: {
        status,
        output: stringifyJsonOrNull(output),
        error,
        externalTaskId: externalId,
        finishedAt: status === 'succeeded' || status === 'failed' || status === 'cancelled' ? new Date() : undefined,
        startedAt: new Date(),
      },
    });
  }

  // ---- Text ----
  async generateText(userId: string, dto: GenerateTextDto) {
    await this.checkPrompt(dto.prompt);
    if (dto.system) await this.checkPrompt(dto.system);
    for (const msg of dto.messages ?? []) {
      await this.checkPrompt(msg.content);
    }
    const provider = this.registry.get(dto.providerName);
    const job = await this.createJob(userId, 'text', provider.name, dto.model, dto.prompt, {
      system: dto.system,
      messageCount: dto.messages?.length ?? 0,
    });
    try {
      const r = await provider.generateText({
        prompt: dto.prompt,
        model: dto.model,
        options: {
          system: dto.system,
          messages: dto.messages,
        },
      });
      await this.finishJob(job.id, 'succeeded', { text: r.text });
      const asset = dto.saveAsAsset
        ? await this.assets.create({
            ownerId: userId,
            type: 'text',
            title: dto.title || dto.prompt.slice(0, 24) || 'AI 文本',
            content: r.text,
            jobId: job.id,
            meta: { provider: provider.name, model: dto.model },
          })
        : null;
      return { jobId: job.id, text: r.text, asset };
    } catch (e: any) {
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
    }
  }

  /** 后台落盘：Ark CDN URL 可能过期，完成后切到本地 uploads。 */
  private backgroundPersistImages(jobId: string, assetId: string | null | undefined, sourceUrls: string[]) {
    void (async () => {
      try {
        const localUrls = await persistImageUrls(sourceUrls);
        await this.prisma.aiGenerationJob.update({
          where: { id: jobId },
          data: {
            output: stringifyJsonOrNull({
              imageUrls: localUrls,
              sourceUrls,
              persistPending: false,
            }),
          },
        });
        if (!assetId) return;
        const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
        if (!asset) return;
        const prevMeta = asset.meta ? parseJson<Record<string, unknown>>(asset.meta, {}) : {};
        await this.prisma.asset.update({
          where: { id: assetId },
          data: {
            url: localUrls[0],
            thumbnailUrl: localUrls[0],
            meta: stringifyJson({
              ...prevMeta,
              allUrls: localUrls,
              sourceUrls,
            }),
          },
        });
      } catch (e: any) {
        this.logger.warn(`background persist images for job ${jobId}: ${e?.message}`);
      }
    })();
  }

  // ---- Image ----
  async generateImage(userId: string, dto: GenerateImageDto) {
    await this.checkPrompt(dto.prompt);
    const provider = this.resolveImageProvider(dto.providerName);
    const job = await this.createJob(userId, 'image', provider.name, dto.model, dto.prompt, { references: dto.references, options: dto.options });

    // 并发闸门：名额充足时直接同步生成（行为与之前完全一致）；
    // 名额已满则立即返回"排队中 + 排在第几位"，生成任务转到后台，等轮到它再真正调用供应商。
    if (this.imageGate.tryAcquire()) {
      return this.runImageGeneration(job.id, userId, provider, dto);
    }
    const { position, wait } = this.imageGate.enqueue(job.id);
    void wait.then(() => this.runImageGeneration(job.id, userId, provider, dto).catch(() => {}));
    return { jobId: job.id, status: 'queued' as const, queued: true, queuePosition: position };
  }

  private async runImageGeneration(jobId: string, userId: string, provider: AiProviderAdapter, dto: GenerateImageDto) {
    try {
      const r = await provider.generateImage({ prompt: dto.prompt, model: dto.model, references: dto.references, options: dto.options });
      const sourceUrls = r.imageUrls;
      await this.finishJob(jobId, 'succeeded', {
        imageUrls: sourceUrls,
        sourceUrls,
        persistPending: true,
      });
      const asset = dto.saveAsAsset !== false
        ? await this.assets.create({
            ownerId: userId,
            type: 'image',
            title: dto.title || dto.prompt.slice(0, 24) || 'AI 图片',
            url: sourceUrls[0],
            thumbnailUrl: sourceUrls[0],
            meta: {
              provider: provider.name,
              model: dto.model,
              allUrls: sourceUrls,
              sourceUrls,
              originalPrompt: dto.originalPrompt,
              prompt: dto.originalPrompt || dto.prompt,
              mode: dto.mode ?? 'guided',
            },
            jobId,
          })
        : null;
      this.backgroundPersistImages(jobId, asset?.id, sourceUrls);
      return { jobId, imageUrls: sourceUrls, sourceUrls, asset };
    } catch (e: any) {
      this.logger.error(`Image generation failed (provider=${provider.name}): ${e?.message}`, e?.stack);
      await this.finishJob(jobId, 'failed', null, e.message);
      throw e;
    } finally {
      this.imageGate.release();
    }
  }

  /** Require a real provider with video capability — never fall back to mock. */
  private resolveVideoProvider(providerName?: string): AiProviderAdapter {
    const provider = this.registry.get(providerName);
    if (provider.name === 'mock') {
      throw new BadRequestException(
        '未配置真实 AI 视频服务。请在 .env.local 中设置 ARK_API_KEY 与 ARK_VIDEO_MODEL，并重启 API 服务。',
      );
    }
    if (!provider.capabilities.video) {
      throw new BadRequestException(
        '当前 AI 提供商未启用视频能力。请在 .env.local 中设置 ARK_VIDEO_MODEL（如 doubao-seedance-2-0-mini-260615）后重启 API。',
      );
    }
    return provider;
  }

  /** Require a real provider with image capability — never fall back to mock. */
  private resolveImageProvider(providerName?: string): AiProviderAdapter {
    const provider = this.registry.get(providerName);
    if (provider.name === 'mock') {
      throw new BadRequestException(
        '未配置真实 AI 生图服务。请在 .env.local 中设置 ARK_API_KEY 与 ARK_IMAGE_MODEL，并重启 API 服务。',
      );
    }
    if (!provider.capabilities.image) {
      throw new BadRequestException(
        '当前 AI 提供商未启用生图能力。请在 .env.local 中设置 ARK_IMAGE_MODEL（如 doubao-seedream-5-0-260128）后重启 API。',
      );
    }
    return provider;
  }

  // ---- Web page ----
  async generateWebPage(userId: string, dto: GenerateWebDto) {
    await this.checkPrompt(dto.prompt);
    if (dto.system) await this.checkPrompt(dto.system);
    for (const msg of dto.messages ?? []) {
      await this.checkPrompt(msg.content);
    }
    const provider = this.registry.get(dto.providerName);
    const job = await this.createJob(userId, 'web', provider.name, dto.model, dto.prompt, {
      interactive: dto.interactive,
      aiCamp: dto.aiCamp,
      messageCount: dto.messages?.length ?? 0,
    });

    void this.runWebGeneration(job.id, dto).catch((e) => {
      this.logger.warn(`Background web generation for ${job.id}: ${e?.message}`);
    });
    return { jobId: job.id, status: 'running' as const };
  }

  private async runWebGeneration(jobId: string, dto: GenerateWebDto) {
    try {
      const existing = await this.prisma.aiGenerationJob.findUnique({ where: { id: jobId } });
      if (!existing || existing.status === 'cancelled') return;

      await this.prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: { status: 'running', startedAt: new Date() },
      });

      const provider = this.registry.get(dto.providerName);
      const r = await provider.generateWebPage({
        prompt: dto.prompt,
        model: dto.model,
        options: {
          ...(dto.interactive ? { interactive: true } : {}),
          ...(dto.aiCamp ? { aiCamp: true } : {}),
          messages: dto.messages,
        },
      });
      await this.finishJob(jobId, 'succeeded', { html: r.html, css: r.css, js: r.js });
    } catch (e: any) {
      await this.finishJob(jobId, 'failed', null, e.message);
    }
  }

  // ---- Poster ----
  async generatePoster(userId: string, dto: GeneratePosterDto) {
    await this.checkPrompt(dto.prompt);
    const provider = this.registry.get(dto.providerName);
    const job = await this.createJob(userId, 'poster', provider.name, dto.model, dto.prompt);
    try {
      const r = await provider.generatePoster({ prompt: dto.prompt, model: dto.model });
      const imageUrl = r.imageUrl ? await persistImageUrl(r.imageUrl) : r.imageUrl;
      await this.finishJob(job.id, 'succeeded', { imageUrl, html: r.html });
      const asset = await this.assets.create({
        ownerId: userId,
        type: 'poster',
        title: dto.title || dto.prompt.slice(0, 24) || 'AI 海报',
        url: imageUrl,
        content: r.html,
        jobId: job.id,
        meta: { provider: provider.name, model: dto.model },
      });
      return { jobId: job.id, ...r, asset };
    } catch (e: any) {
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
    }
  }

  // ---- PPT ----
  async generatePpt(userId: string, dto: GeneratePptDto) {
    await this.checkPrompt(dto.prompt);
    const provider = this.registry.get(dto.providerName);
    const job = await this.createJob(userId, 'ppt', provider.name, dto.model, dto.prompt);
    try {
      const r = await provider.generatePpt({ prompt: dto.prompt, model: dto.model });
      await this.finishJob(job.id, 'succeeded', { slides: r.slides });
      const asset = await this.assets.create({
        ownerId: userId,
        type: 'ppt',
        title: dto.title || dto.prompt.slice(0, 24) || 'AI PPT',
        content: JSON.stringify(r.slides, null, 2),
        meta: { provider: provider.name, model: dto.model, slides: r.slides },
        jobId: job.id,
      });
      return { jobId: job.id, slides: r.slides, asset };
    } catch (e: any) {
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
    }
  }

  // ---- Mixed multimodal (text + image input) ----
  async generateMixed(userId: string, dto: GenerateMixedDto) {
    await this.checkPrompt(dto.prompt);
    const provider = this.registry.get(dto.providerName);
    const job = await this.createJob(userId, 'mixed', provider.name, dto.model, dto.prompt, { references: dto.references });
    try {
      const r = await provider.generateMixedContent({ prompt: dto.prompt, model: dto.model, references: dto.references });
      await this.finishJob(job.id, 'succeeded', { text: r.text, imageUrls: r.imageUrls });
      const asset = dto.saveAsAsset !== false
        ? await this.assets.create({
            ownerId: userId,
            type: 'mixed',
            title: dto.title || dto.prompt.slice(0, 24) || 'AI 图文回答',
            content: r.text,
            meta: { provider: provider.name, model: dto.model, references: dto.references },
            jobId: job.id,
          })
        : null;
      return { jobId: job.id, text: r.text, imageUrls: r.imageUrls, asset };
    } catch (e: any) {
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
    }
  }

  // ---- Code ----
  async generateCode(userId: string, dto: GenerateTextDto) {
    await this.checkPrompt(dto.prompt);
    const provider = this.registry.get(dto.providerName);
    const job = await this.createJob(userId, 'code', provider.name, dto.model, dto.prompt);
    try {
      const r = await provider.generateCode({ prompt: dto.prompt, model: dto.model });
      await this.finishJob(job.id, 'succeeded', { text: r.text });
      const asset = dto.saveAsAsset
        ? await this.assets.create({
            ownerId: userId,
            type: 'code',
            title: dto.title || dto.prompt.slice(0, 24) || 'AI 代码',
            content: r.text,
            meta: { provider: provider.name, model: dto.model },
            jobId: job.id,
          })
        : null;
      return { jobId: job.id, text: r.text, asset };
    } catch (e: any) {
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
    }
  }

  // ---- Video (async) ----
  async submitVideo(userId: string, dto: SubmitVideoDto) {
    const safePrompt = sanitizeCopyrightTerms(dto.prompt);
    await this.checkPrompt(safePrompt);
    const provider = this.resolveVideoProvider(dto.providerName);
    const videoModel = resolveArkVideoModel(dto.model, process.env.ARK_VIDEO_MODEL);
    const job = await this.createJob(userId, 'video', provider.name, videoModel, dto.prompt, {
      references: dto.references,
      duration: dto.duration,
      ratio: dto.ratio,
      generateAudio: dto.generateAudio,
      originalPrompt: dto.originalPrompt,
      mode: dto.mode ?? 'guided',
      sanitizedPrompt: safePrompt,
      title: dto.title,
      saveAsAsset: true,
    });

    // 名额充足时也先返回 jobId，后台再向供应商提交，避免 HTTP 连接在 Ark 受理前超时（Headers Timeout）。
    if (this.videoGate.tryAcquire()) {
      void this.runVideoSubmission(job.id, provider, { ...dto, model: videoModel }, safePrompt).catch((e) => {
        this.logger.warn(`Background video submission for ${job.id}: ${e?.message}`);
      });
      return { jobId: job.id, status: 'queued' as const };
    }
    const { position, wait } = this.videoGate.enqueue(job.id);
    void wait.then(() => this.runVideoSubmission(job.id, provider, { ...dto, model: videoModel }, safePrompt).catch(() => {}));
    return { jobId: job.id, status: 'queued' as const, queued: true, queuePosition: position };
  }

  private async runVideoSubmission(jobId: string, provider: AiProviderAdapter, dto: SubmitVideoDto, safePrompt: string) {
    try {
      const existing = await this.prisma.aiGenerationJob.findUnique({ where: { id: jobId } });
      if (!existing || existing.status === 'cancelled') return;

      const result = await provider.submitVideoTask({
        prompt: safePrompt,
        model: dto.model,
        references: dto.references,
        duration: dto.duration,
        ratio: dto.ratio,
        generateAudio: dto.generateAudio,
      });

      const updated = await this.prisma.aiGenerationJob.updateMany({
        where: { id: jobId, status: { not: 'cancelled' } },
        data: { externalTaskId: result.taskId, status: 'running', startedAt: new Date() },
      });
      if (updated.count === 0) return;

      // 名额在任务真正到达终态（成功/失败/超时）时才释放，见 video-task.poller.ts 的 onSettled。
      this.videoPoller.schedule(jobId, () => this.videoGate.release());
      return { jobId, taskId: result.taskId, status: 'queued' };
    } catch (e: any) {
      const existing = await this.prisma.aiGenerationJob.findUnique({ where: { id: jobId } });
      if (existing?.status === 'cancelled') return;
      this.videoGate.release();
      await this.finishJob(jobId, 'failed', null, e.message);
    }
  }

  /** 学生取消自己排队中或生成中的视频任务，释放本地并发名额。 */
  async cancelVideoJob(viewerId: string, viewerRole: Role, jobId: string) {
    const job = await this.prisma.aiGenerationJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('任务不存在');
    if (job.userId !== viewerId && !['admin', 'teacher'].includes(viewerRole)) {
      throw new ForbiddenException('无权操作该任务');
    }
    if (job.jobType !== 'video') {
      throw new BadRequestException('只能取消视频任务');
    }
    if (!['queued', 'running'].includes(job.status)) {
      throw new BadRequestException('该任务已结束，无法取消');
    }

    const wasWaitingInGate = this.videoGate.remove(jobId);
    this.videoPoller.cancel(jobId);

    await this.finishJob(jobId, 'cancelled', null, '用户已取消');

    // 已从本地闸门拿到名额、或正在生成中的任务，需要释放名额；仍在 waiters 中的任务从未占名额。
    if (!wasWaitingInGate) {
      this.videoGate.release();
    }

    return this.getJob(jobId);
  }

  /** 将多段已生成的视频按顺序拼接为完整视频，并写入素材库。 */
  async concatVideos(userId: string, dto: ConcatVideoDto) {
    const urls = (dto.videoUrls || []).map((u) => u?.trim()).filter(Boolean) as string[];
    if (urls.length < 2) {
      throw new BadRequestException('至少需要 2 段视频才能拼接');
    }

    let mergedUrl: string;
    try {
      mergedUrl = await concatVideoFiles(urls);
    } catch (e: any) {
      this.logger.warn(`concatVideos failed: ${e?.message}`);
      throw new BadRequestException(e?.message || '视频拼接失败，请稍后重试');
    }

    const title = dto.title?.trim() || `拼接视频 · ${urls.length} 段`;
    const thumbnailUrl = (await extractVideoThumbnail(mergedUrl)) ?? undefined;
    const asset = await this.assets.create({
      ownerId: userId,
      type: 'video',
      title,
      url: mergedUrl,
      thumbnailUrl,
      meta: {
        kind: 'concatenated',
        segmentCount: urls.length,
        segmentJobIds: dto.segmentJobIds,
        courseGame: dto.courseGame,
        sourceUrls: urls,
      },
    });

    return { videoUrl: mergedUrl, assetId: asset.id, asset };
  }

  // ---- Music (async) ----
  async generateMusicLyrics(userId: string, dto: GenerateMusicLyricsDto) {
    const theme = dto.theme?.trim();
    if (!theme || theme.length < 2) {
      throw new BadRequestException('主题至少需要 2 个字符');
    }
    if (theme.length > 200) {
      throw new BadRequestException('主题不能超过 200 个字符');
    }
    await this.checkPrompt(theme);

    const provider = this.registry.get(dto.providerName);
    const genreHint = dto.genre ? `曲风倾向：${dto.genre}` : '';
    const moodHint = dto.mood ? `情绪倾向：${dto.mood}` : '';
    const system = `你是面向 8-14 岁小学生的中文歌词创作助手。根据用户给出的主题，写出适合 AI 演唱生成的完整歌词。
要求：
- 使用中文，积极健康、适合儿童
- 结构清晰：主歌 + 副歌（可重复），每行一句，用换行分段
- 总长度 150～600 字（含标点）
- 语言口语化、有韵律感、易跟唱
- 不要使用真实影视/游戏/动漫角色名或品牌名
- 只输出歌词正文，不要标题说明、不要 markdown、不要引号包裹`;
    const userMsg = `创作主题：${theme}
${genreHint}
${moodHint}

请直接输出歌词：`;

    const job = await this.createJob(userId, 'text', provider.name, dto.model, theme, { musicLyrics: true });
    try {
      const r = await provider.generateText({
        prompt: userMsg,
        model: dto.model,
        options: { system },
      });
      let lyrics = sanitizeCopyrightTerms((r.text || '').trim());
      lyrics = lyrics.replace(/^```[\w]*\n?|```$/gm, '').trim();
      lyrics = lyrics.replace(/^["'「]|["'」]$/g, '').trim();
      if (lyrics.length < 5) {
        throw new BadRequestException('歌词生成失败，请换个主题重试');
      }
      const maxLen = getMusicLyricsMaxLength(createMusicClient());
      if (lyrics.length > maxLen) lyrics = lyrics.slice(0, maxLen);
      await this.finishJob(job.id, 'succeeded', { lyrics, theme });
      return { jobId: job.id, lyrics, theme };
    } catch (e: any) {
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
    }
  }

  async submitMusic(userId: string, dto: SubmitMusicDto) {
    const client = createMusicClient();
    const lyricsMax = getMusicLyricsMaxLength(client);
    const lyrics = dto.lyrics?.trim();
    if (!lyrics || lyrics.length < 5) {
      throw new BadRequestException('歌词至少需要 5 个字符');
    }
    if (lyrics.length > lyricsMax) {
      throw new BadRequestException(`歌词不能超过 ${lyricsMax} 个字符`);
    }
    await this.checkPrompt(lyrics);

    const providerName = client.providerName;
    const modelCode = providerName === 'minimax-music' ? getMiniMaxMusicModel() : 'GenSongV4';
    const job = await this.createJob(userId, 'music', providerName, modelCode, lyrics.slice(0, 80), {
      lyrics,
      genre: dto.genre,
      mood: dto.mood,
      gender: dto.gender,
      timbre: dto.timbre,
      duration: dto.duration,
      title: dto.title,
    });

    try {
      const result = await client.submitSongTask({
        lyrics,
        genre: dto.genre,
        mood: dto.mood,
        gender: dto.gender,
        timbre: dto.timbre,
        duration: dto.duration,
      });
      await this.prisma.aiGenerationJob.update({
        where: { id: job.id },
        data: { externalTaskId: result.taskId, status: 'running', startedAt: new Date() },
      });
      this.musicPoller.schedule(job.id);
      return { jobId: job.id, taskId: result.taskId, status: 'queued' };
    } catch (e: any) {
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
    }
  }

  private hydrateJob<T extends { id: string; jobType: string; status: string; output?: string | null; input?: string | null }>(job: T | null) {
    if (!job) return job;
    const hydrated = {
      ...job,
      output: job.output != null ? parseJson(job.output, null) : null,
      input: job.input != null ? parseJson(job.input, null) : null,
    };
    // 仍在本地排队（还没轮到、还没真正调用供应商）的任务，实时附加"前面还有几人"。
    if (job.status === 'queued') {
      const gate = job.jobType === 'image' ? this.imageGate : job.jobType === 'video' ? this.videoGate : null;
      const position = gate?.positionOf(job.id) ?? null;
      if (position != null) {
        return { ...hydrated, queuePosition: position };
      }
    }
    return hydrated;
  }

  async getJob(id: string) {
    const job = await this.prisma.aiGenerationJob.findUnique({
      where: { id },
      include: { assets: true },
    });
    return this.hydrateJob(job);
  }

  listJobs(userId: string, type?: JobType) {
    return this.prisma.aiGenerationJob
      .findMany({
        where: { userId, jobType: type, status: { not: 'cancelled' } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          assets: {
            where: { archived: false },
            take: 1,
            select: { id: true },
          },
        },
      })
      .then((rows) => rows.map((j) => this.hydrateJob(j)!));
  }

  /** 将用户原始创意改写成适合生图/生视频的简洁提示词 */
  async optimizePrompt(userId: string, dto: OptimizePromptDto) {
    await this.checkPrompt(dto.rawInput);
    const provider = this.registry.get(dto.providerName);
    const targetLabel = dto.target === 'image' ? 'AI 绘画' : 'AI 视频';
    const system = dto.target === 'image'
      ? `你是儿童 AI 创作助手的提示词优化器。把用户的模糊描述改写成适合 AI 绘画生成的简洁、具体、可直接使用的提示词。
要求：50-120 字；包含主体、场景、动作或氛围、可选风格；适合 8-14 岁；只输出优化后的提示词正文，不要解释、不要加引号。
重要：不要使用真实影视/游戏/动漫角色名或品牌名（如奶龙、奥特曼、迪士尼等），改用通用外观描述（如「奶黄色小恐龙」「科幻英雄」）。`
      : `你是儿童 AI 创作助手的视频提示词优化器（Seedance 2.0 Mini）。把用户的模糊描述改写成适合 AI 视频生成的简洁提示词。
要求：80-180 字；可含分镜时间轴（如「0-3 秒…4-6 秒…」）；描述主体、动作、镜头与氛围；适合 8-14 岁；只输出优化后的提示词正文，不要解释、不要加引号。
若有参考图/视频/音频，可在文案中用「图片1」「视频1」「音频1」指代；不要使用真实影视/游戏/动漫角色名或品牌名。`;
    const userMsg = `用户原始想法：\n${dto.rawInput.trim()}\n\n请输出优化后的${targetLabel}提示词：`;
    const job = await this.createJob(userId, 'text', provider.name, dto.model, dto.rawInput, {
      optimizeTarget: dto.target,
    });
    try {
      const r = await provider.generateText({
        prompt: userMsg,
        model: dto.model,
        options: { system },
      });
      const optimized = sanitizeCopyrightTerms((r.text || '').trim().replace(/^["'「]|["'」]$/g, ''));
      if (!optimized) throw new BadRequestException('提示词优化失败，请重试');
      await this.finishJob(job.id, 'succeeded', { optimized, target: dto.target });
      return { jobId: job.id, optimized, rawInput: dto.rawInput, target: dto.target };
    } catch (e: any) {
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
    }
  }

  /** 保存一次完整自由创作：提示词 + 作品 + 可发布的交互网页 */
  async saveCreationSession(userId: string, dto: SaveCreationSessionDto) {
    const title = dto.title.trim() || dto.optimizedPrompt.slice(0, 20) || '我的创作';
    const hidePrompt = dto.hidePromptInLibrary !== false;

    const promptContent = `【最初想法】\n${dto.rawPrompt}\n\n【AI 优化提示词】\n${dto.optimizedPrompt}`;
    const promptAsset = await this.assets.create({
      ownerId: userId,
      type: 'text',
      title: `创作提示词 · ${title}`,
      summary: dto.optimizedPrompt.slice(0, 80),
      content: promptContent,
      meta: {
        kind: 'prompt-pair',
        rawPrompt: dto.rawPrompt,
        optimizedPrompt: dto.optimizedPrompt,
        sessionKind: dto.kind,
        hiddenInLibrary: hidePrompt,
        resultAssetId: dto.resultAssetId,
        jobId: dto.jobId,
      },
    });

    const html = buildCreationSessionHtml({
      title,
      kind: dto.kind,
      rawPrompt: dto.rawPrompt,
      optimizedPrompt: dto.optimizedPrompt,
      imageUrls: dto.imageUrls,
      videoUrl: dto.videoUrl,
    });

    const project = await this.webProjects.create({
      ownerId: userId,
      title: `${dto.kind === 'image' ? '🎨' : '🎬'} ${title}`,
      description: `自由创作 · ${dto.kind === 'image' ? '生图' : '生视频'}`,
      html,
      prompt: dto.optimizedPrompt,
    });
    const published = await this.webProjects.publish(project.id, userId, 'student');
    const pageUrl = publishPath(published.slug!);

    const thumb =
      dto.kind === 'image' && dto.imageUrls?.[0]
        ? dto.imageUrls[0]
        : dto.videoUrl ?? undefined;

    const sessionAsset = await this.assets.create({
      ownerId: userId,
      type: 'web',
      title: `创作记录 · ${title}`,
      summary: `${dto.kind === 'image' ? '自由生图' : '自由生视频'}完整记录（含提示词与作品）`,
      url: pageUrl,
      thumbnailUrl: thumb,
      content: html,
      meta: {
        kind: 'creation-session',
        sessionKind: dto.kind,
        projectId: project.id,
        slug: published.slug,
        promptAssetId: promptAsset.id,
        resultAssetId: dto.resultAssetId,
        jobId: dto.jobId,
        rawPrompt: dto.rawPrompt,
        optimizedPrompt: dto.optimizedPrompt,
      },
    });

    return {
      promptAsset,
      sessionAsset,
      webProject: published,
      pageUrl,
    };
  }
}
