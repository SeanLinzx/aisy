import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { JobStatus, JobType } from '../../common/enums';
import { buildCreationSessionHtml } from '../../common/utils/creation-session-html';
import { parseJson, stringifyJson, stringifyJsonOrNull } from '../../common/utils/json';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../ai/provider-registry';
import { AssetsService } from '../assets/assets.service';
import { ConfigsService } from '../configs/configs.service';
import { containsSensitive } from '../../common/utils/html-sanitize';
import { persistImageUrl, persistImageUrls } from '../../common/utils/image-store';
import { concatVideoFiles } from '../../common/utils/video-concat';
import { sanitizeCopyrightTerms } from '../../common/utils/prompt-sanitize';
import { ReferenceMediaItem, AiProviderAdapter } from '../ai/ai.types';
import { VideoTaskPoller } from './video-task.poller';
import { MusicTaskPoller } from './music-task.poller';
import { WebProjectsService } from '../web-projects/web-projects.service';
import { publishPath } from '../../common/utils/public-url';
import { createMusicClient } from '../ai/providers/volcengine-music.client';

export interface GenerateTextDto {
  prompt: string;
  model?: string;
  providerName?: string;
  saveAsAsset?: boolean;
  title?: string;
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
export class AiGenerateService {
  private readonly logger = new Logger('AiGenerate');

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistry,
    private readonly assets: AssetsService,
    private readonly configs: ConfigsService,
    private readonly videoPoller: VideoTaskPoller,
    private readonly musicPoller: MusicTaskPoller,
    private readonly webProjects: WebProjectsService,
  ) {}

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
        finishedAt: status === 'succeeded' || status === 'failed' ? new Date() : undefined,
        startedAt: new Date(),
      },
    });
  }

  // ---- Text ----
  async generateText(userId: string, dto: GenerateTextDto) {
    await this.checkPrompt(dto.prompt);
    const provider = this.registry.get(dto.providerName);
    const job = await this.createJob(userId, 'text', provider.name, dto.model, dto.prompt);
    try {
      const r = await provider.generateText({ prompt: dto.prompt, model: dto.model });
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
    try {
      const r = await provider.generateImage({ prompt: dto.prompt, model: dto.model, references: dto.references, options: dto.options });
      const sourceUrls = r.imageUrls;
      await this.finishJob(job.id, 'succeeded', {
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
              mode: dto.mode ?? 'guided',
            },
            jobId: job.id,
          })
        : null;
      this.backgroundPersistImages(job.id, asset?.id, sourceUrls);
      return { jobId: job.id, imageUrls: sourceUrls, sourceUrls, asset };
    } catch (e: any) {
      this.logger.error(`Image generation failed (provider=${provider.name}): ${e?.message}`, e?.stack);
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
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
    const provider = this.registry.get(dto.providerName);
    const job = await this.createJob(userId, 'web', provider.name, dto.model, dto.prompt);
    try {
      const r = await provider.generateWebPage({
        prompt: dto.prompt,
        model: dto.model,
        options: dto.interactive ? { interactive: true } : undefined,
      });
      await this.finishJob(job.id, 'succeeded', { html: r.html, css: r.css, js: r.js });
      return { jobId: job.id, html: r.html, css: r.css ?? '', js: r.js ?? '' };
    } catch (e: any) {
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
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
    const job = await this.createJob(userId, 'video', provider.name, dto.model, dto.prompt, {
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

    try {
      const result = await provider.submitVideoTask({
        prompt: safePrompt,
        model: dto.model,
        references: dto.references,
        duration: dto.duration,
        ratio: dto.ratio,
        generateAudio: dto.generateAudio,
      });
      await this.prisma.aiGenerationJob.update({
        where: { id: job.id },
        data: { externalTaskId: result.taskId, status: 'running', startedAt: new Date() },
      });
      this.videoPoller.schedule(job.id);
      return { jobId: job.id, taskId: result.taskId, status: 'queued' };
    } catch (e: any) {
      await this.finishJob(job.id, 'failed', null, e.message);
      throw e;
    }
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
    const asset = await this.assets.create({
      ownerId: userId,
      type: 'video',
      title,
      url: mergedUrl,
      thumbnailUrl: mergedUrl,
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
  async submitMusic(userId: string, dto: SubmitMusicDto) {
    const lyrics = dto.lyrics?.trim();
    if (!lyrics || lyrics.length < 5) {
      throw new BadRequestException('歌词至少需要 5 个字符');
    }
    if (lyrics.length > 700) {
      throw new BadRequestException('歌词不能超过 700 个字符');
    }
    await this.checkPrompt(lyrics);

    const client = createMusicClient();
    const providerName = client.constructor.name === 'VolcengineMusicClient' ? 'volcengine-music' : 'mock-music';
    const job = await this.createJob(userId, 'music', providerName, 'GenSongV4', lyrics.slice(0, 80), {
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

  private hydrateJob<T extends { output?: string | null; input?: string | null }>(job: T | null) {
    if (!job) return job;
    return {
      ...job,
      output: job.output != null ? parseJson(job.output, null) : null,
      input: job.input != null ? parseJson(job.input, null) : null,
    };
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
        where: { userId, jobType: type },
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
    const system = `你是儿童 AI 创作助手的提示词优化器。把用户的模糊描述改写成适合${targetLabel}生成的简洁、具体、可直接使用的提示词。
要求：50-120 字；包含主体、场景、动作或氛围、可选风格；适合 8-14 岁；只输出优化后的提示词正文，不要解释、不要加引号。
重要：不要使用真实影视/游戏/动漫角色名或品牌名（如奶龙、奥特曼、迪士尼等），改用通用外观描述（如「奶黄色小恐龙」「科幻英雄」）。`;
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
