import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProviderAdapter } from './ai.types';
import { MockProvider } from './providers/mock.provider';
import { VolcengineArkProvider, DEFAULT_ARK_VIDEO_MODEL } from './providers/volcengine-ark.provider';

/**
 * Holds the live provider instances. The DB acts as the source of truth for
 * which providers are *enabled*; env vars provide the secrets. If the env key
 * for a provider is missing, that provider is silently disabled and we fall
 * back to mock so the system always has a usable default.
 */
@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger('ProviderRegistry');
  private providers = new Map<string, AiProviderAdapter>();
  private defaultName = 'mock';

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refresh();
  }

  /** Re-read the providers table and rebuild the in-memory registry. */
  async refresh() {
    const next = new Map<string, AiProviderAdapter>();
    next.set('mock', new MockProvider());

    const arkKey = process.env.ARK_API_KEY;
    if (arkKey) {
      next.set('volcengine-ark', new VolcengineArkProvider({
        apiKey: arkKey,
        baseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
        responsesPath: process.env.ARK_RESPONSES_PATH || '/responses',
        videoTasksPath: process.env.ARK_VIDEO_TASKS_PATH || '/contents/generations/tasks',
        imagesPath: process.env.ARK_IMAGES_PATH || '/images/generations',
        textModel: process.env.ARK_TEXT_MODEL || undefined,
        imageModel: process.env.ARK_IMAGE_MODEL || undefined,
        videoModel: process.env.ARK_VIDEO_MODEL || DEFAULT_ARK_VIDEO_MODEL,
        multimodalModel: process.env.ARK_MULTIMODAL_MODEL || undefined,
        webModel: process.env.ARK_WEB_MODEL || undefined,
        chatCompletionsPath: process.env.ARK_CHAT_COMPLETIONS_PATH || '/chat/completions',
      }));
    }

    // Honor the DB "active" flag.
    try {
      const dbProviders = await this.prisma.aiProvider.findMany();
      for (const p of dbProviders) {
        if (p.status !== 'active' && next.has(p.name)) {
          next.delete(p.name);
        }
      }
    } catch (e) {
      this.logger.warn('Could not read AiProvider table (DB not ready yet?)');
    }

    this.providers = next;

    const wanted = process.env.DEFAULT_AI_PROVIDER || 'volcengine-ark';
    this.defaultName = this.providers.has(wanted) ? wanted : 'mock';
    this.logger.log(`Active providers: ${[...this.providers.keys()].join(', ')} (default=${this.defaultName})`);
  }

  list(): string[] {
    return [...this.providers.keys()];
  }

  getDefaultName(): string {
    return this.defaultName;
  }

  get(name?: string): AiProviderAdapter {
    const target = name && this.providers.has(name) ? name : this.defaultName;
    const adapter = this.providers.get(target) ?? this.providers.get('mock');
    if (!adapter) throw new Error('No AI provider available, not even mock');
    return adapter;
  }
}
