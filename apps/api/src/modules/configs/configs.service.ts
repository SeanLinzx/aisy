import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { stringifyJson } from '../../common/utils/json';

@Injectable()
export class ConfigsService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.sensitiveWord.upsert({
      where: { word },
      create: { word, severity, category },
      update: { severity, category, enabled: true },
    });
  }

  toggleSensitive(id: string, enabled: boolean) {
    return this.prisma.sensitiveWord.update({ where: { id }, data: { enabled } });
  }

  removeSensitive(id: string) {
    return this.prisma.sensitiveWord.delete({ where: { id } });
  }

  async getSensitiveWords(): Promise<string[]> {
    const list = await this.prisma.sensitiveWord.findMany({ where: { enabled: true } });
    return list.map((s) => s.word);
  }

  // Prompt templates
  listTemplates(category?: string) {
    return this.prisma.promptTemplate.findMany({
      where: category ? { category: category as any, enabled: true } : { enabled: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createTemplate(data: any) {
    const { tags, ...rest } = data ?? {};
    const tagsStr = typeof tags === 'string' ? tags : stringifyJson(tags ?? []);
    return this.prisma.promptTemplate.create({ data: { ...rest, tags: tagsStr } });
  }

  updateTemplate(id: string, data: any) {
    const patch = { ...(data ?? {}) };
    if (patch.tags !== undefined) {
      const { tags } = patch;
      patch.tags = typeof tags === 'string' ? tags : stringifyJson(tags ?? []);
    }
    return this.prisma.promptTemplate.update({ where: { id }, data: patch });
  }

  removeTemplate(id: string) {
    return this.prisma.promptTemplate.delete({ where: { id } });
  }
}
