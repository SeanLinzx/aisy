import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistry } from '../ai/provider-registry';

@Injectable()
export class AiProvidersService {
  constructor(private readonly prisma: PrismaService, private readonly registry: ProviderRegistry) {}

  list() {
    return this.prisma.aiProvider.findMany({
      include: { models: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async setStatus(id: string, status: 'active' | 'disabled') {
    const r = await this.prisma.aiProvider.update({ where: { id }, data: { status } });
    await this.registry.refresh();
    return r;
  }

  upsertModel(providerId: string, data: any) {
    return this.prisma.aiModel.upsert({
      where: { providerId_code: { providerId, code: data.code } },
      create: {
        providerId,
        code: data.code,
        displayName: data.displayName ?? data.code,
        capability: data.capability,
        enabled: data.enabled ?? true,
        cost: data.cost ?? 1,
      },
      update: {
        displayName: data.displayName ?? data.code,
        capability: data.capability,
        enabled: data.enabled ?? true,
        cost: data.cost ?? 1,
      },
    });
  }

  toggleModel(modelId: string, enabled: boolean) {
    return this.prisma.aiModel.update({ where: { id: modelId }, data: { enabled } });
  }

  async listEnabledForUser() {
    const providers = await this.prisma.aiProvider.findMany({
      where: { status: 'active' },
      include: { models: { where: { enabled: true } } },
    });
    return providers.map((p) => ({
      name: p.name,
      displayName: p.displayName,
      models: p.models.map((m) => ({ id: m.id, code: m.code, displayName: m.displayName, capability: m.capability, cost: m.cost })),
    }));
  }
}
