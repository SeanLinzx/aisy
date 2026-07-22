import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { stringifyJson } from '../../common/utils/json';

@Injectable()
export class ConfigsService {
  constructor(private readonly prisma: PrismaService) {}

  private sensitiveCache: { words: string[]; at: number } | null = null;
  private templateCache = new Map<string, { rows: unknown[]; at: number }>();
  private static readonly CACHE_TTL_MS = 60_000;

  private bustSensitiveCache() {
    this.sensitiveCache = null;
  }

  private bustTemplateCache(category?: string) {
    if (category) this.templateCache.delete(category);
    else this.templateCache.clear();
  }

  listConfigs() {
    return this.prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
  }

  setConfig(key: string, value: any) {
    const stored = typeof value === 'string' ? value : stringifyJson(value);
    return this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value: stored },
      update: { value: stored },
    });
  }

  listSensitive() {
    return this.prisma.sensitiveWord.findMany({ orderBy: { createdAt: 'desc' } });
  }

  addSensitive(word: string, severity = 1, category?: string) {
    this.bustSensitiveCache();
    return this.prisma.sensitiveWord.upsert({
      where: { word },
      create: { word, severity, category },
      update: { severity, category, enabled: true },
    });
  }

  toggleSensitive(id: string, enabled: boolean) {
    this.bustSensitiveCache();
    return this.prisma.sensitiveWord.update({ where: { id }, data: { enabled } });
  }

  removeSensitive(id: string) {
    this.bustSensitiveCache();
    return this.prisma.sensitiveWord.delete({ where: { id } });
  }

  async getSensitiveWords(): Promise<string[]> {
    const now = Date.now();
    if (this.sensitiveCache && now - this.sensitiveCache.at < ConfigsService.CACHE_TTL_MS) {
      return this.sensitiveCache.words;
    }
    const list = await this.prisma.sensitiveWord.findMany({ where: { enabled: true } });
    const words = list.map((s) => s.word);
    this.sensitiveCache = { words, at: now };
    return words;
  }

  // Prompt templates
  listTemplates(category?: string) {
    const key = category || '__all__';
    const cached = this.templateCache.get(key);
    const now = Date.now();
    if (cached && now - cached.at < ConfigsService.CACHE_TTL_MS) {
      return Promise.resolve(cached.rows);
    }
    return this.prisma.promptTemplate
      .findMany({
        where: category ? { category: category as any, enabled: true } : { enabled: true },
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) => {
        this.templateCache.set(key, { rows, at: now });
        return rows;
      });
  }

  createTemplate(data: any) {
    this.bustTemplateCache(data?.category);
    this.bustTemplateCache();
    const { tags, ...rest } = data ?? {};
    const tagsStr = typeof tags === 'string' ? tags : stringifyJson(tags ?? []);
    return this.prisma.promptTemplate.create({ data: { ...rest, tags: tagsStr } });
  }

  updateTemplate(id: string, data: any) {
    this.bustTemplateCache(data?.category);
    this.bustTemplateCache();
    const patch = { ...(data ?? {}) };
    if (patch.tags !== undefined) {
      const { tags } = patch;
      patch.tags = typeof tags === 'string' ? tags : stringifyJson(tags ?? []);
    }
    return this.prisma.promptTemplate.update({ where: { id }, data: patch });
  }

  removeTemplate(id: string) {
    this.bustTemplateCache();
    return this.prisma.promptTemplate.delete({ where: { id } });
  }
}
