import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AssetType, Role, Visibility, ReviewStatus } from '../../common/enums';
import { parseJson, stringifyJson, stringifyJsonOrNull } from '../../common/utils/json';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAssetInput {
  ownerId: string;
  type: AssetType;
  title: string;
  summary?: string;
  content?: string;
  url?: string;
  thumbnailUrl?: string;
  meta?: any;
  jobId?: string;
  visibility?: Visibility;
  reviewStatus?: ReviewStatus;
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAssetInput) {
    return this.prisma.asset.create({
      data: {
        ...input,
        meta: stringifyJsonOrNull(input.meta),
      },
    });
  }

  list(params: {
    ownerId?: string;
    type?: AssetType;
    includeArchived?: boolean;
    showHidden?: boolean;
    viewerRole?: Role;
  }) {
    const where: any = {};
    if (params.ownerId) where.ownerId = params.ownerId;
    if (params.type) where.type = params.type;
    if (!params.includeArchived) where.archived = false;
    return this.prisma.asset
      .findMany({
        where,
        include: { owner: { select: { id: true, displayName: true, username: true } }, job: true },
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) => {
        if (params.showHidden) return rows;
        return rows.filter((a) => {
          const meta = a.meta ? parseJson<Record<string, unknown>>(a.meta, {}) : {};
          return !meta.hiddenInLibrary;
        });
      });
  }

  async get(id: string, viewerId: string, viewerRole: Role) {
    const a = await this.prisma.asset.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('素材不存在');
    if (
      a.ownerId !== viewerId &&
      !['admin', 'teacher'].includes(viewerRole) &&
      a.visibility === 'private'
    ) {
      throw new ForbiddenException('无权查看');
    }
    return a;
  }

  async update(id: string, viewerId: string, viewerRole: Role, data: any) {
    const a = await this.prisma.asset.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('素材不存在');
    if (a.ownerId !== viewerId && !['admin', 'teacher'].includes(viewerRole)) {
      throw new ForbiddenException('无权修改');
    }
    const patch = { ...data };
    if (patch.meta !== undefined) {
      const prev = a.meta ? parseJson<Record<string, unknown>>(a.meta, {}) : {};
      patch.meta =
        typeof patch.meta === 'object' && patch.meta !== null
          ? stringifyJson({ ...prev, ...patch.meta })
          : patch.meta;
    }
    return this.prisma.asset.update({ where: { id }, data: patch });
  }

  async setLibraryHidden(id: string, viewerId: string, viewerRole: Role, hidden: boolean) {
    const a = await this.prisma.asset.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('素材不存在');
    if (a.ownerId !== viewerId && !['admin', 'teacher'].includes(viewerRole)) {
      throw new ForbiddenException('无权修改');
    }
    const meta = a.meta ? parseJson<Record<string, unknown>>(a.meta, {}) : {};
    meta.hiddenInLibrary = hidden;
    return this.prisma.asset.update({
      where: { id },
      data: { meta: stringifyJson(meta) },
    });
  }

  async archive(id: string, viewerId: string, viewerRole: Role) {
    const a = await this.prisma.asset.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('素材不存在');
    if (a.ownerId !== viewerId && !['admin'].includes(viewerRole)) {
      throw new ForbiddenException('无权归档');
    }
    return this.prisma.asset.update({ where: { id }, data: { archived: true } });
  }

  async remove(id: string, viewerId: string, viewerRole: Role) {
    const a = await this.prisma.asset.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('素材不存在');
    if (a.ownerId !== viewerId && !['admin'].includes(viewerRole)) {
      throw new ForbiddenException('无权删除');
    }
    return this.prisma.asset.delete({ where: { id } });
  }
}
