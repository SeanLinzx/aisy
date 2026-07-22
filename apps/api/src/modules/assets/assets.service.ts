import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AssetType, Role, Visibility, ReviewStatus } from '../../common/enums';
import { parseJson, stringifyJson, stringifyJsonOrNull } from '../../common/utils/json';
import { extractVideoThumbnail, isVideoThumbnailImage } from '../../common/utils/image-store';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

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

const TEACHER_DELETABLE_TYPES = new Set<AssetType>([
  'text',
  'ppt',
  'image',
  'video',
  'poster',
  'mixed',
  'audio',
]);

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 列表接口默认不 SELECT content，避免 30 人同时拉取 HTML 大字段 */
  private assetListSelect(includeContent: boolean): Prisma.AssetSelect {
    const base: Prisma.AssetSelect = {
      id: true,
      ownerId: true,
      type: true,
      title: true,
      summary: true,
      url: true,
      thumbnailUrl: true,
      meta: true,
      visibility: true,
      reviewStatus: true,
      archived: true,
      jobId: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, displayName: true, username: true } },
      job: { select: { id: true, prompt: true, status: true } },
    };
    if (includeContent) return { ...base, content: true };
    return base;
  }

  private filterHiddenRows<T extends { meta: string | null }>(
    rows: T[],
    showHidden?: boolean,
  ): T[] {
    if (showHidden) return rows;
    return rows.filter((a) => {
      const meta = a.meta ? parseJson<Record<string, unknown>>(a.meta, {}) : {};
      return !meta.hiddenInLibrary;
    });
  }

  private async assertStudentOwner(ownerId: string) {
    const owner = await this.prisma.user.findFirst({
      where: { id: ownerId, role: 'student', deletedAt: null },
    });
    if (!owner) throw new BadRequestException('目标用户必须是有效学生账号');
    return owner;
  }

  async create(input: CreateAssetInput, staffRole?: Role) {
    if (staffRole && input.ownerId) {
      await this.assertStudentOwner(input.ownerId);
      if (staffRole === 'teacher' && !TEACHER_DELETABLE_TYPES.has(input.type) && input.type !== 'text') {
        throw new ForbiddenException('老师只能为学生创建文字、图片或视频类素材');
      }
    }
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
    includeContent?: boolean;
  }) {
    const where: any = {};
    if (params.ownerId) where.ownerId = params.ownerId;
    if (params.type) where.type = params.type;
    if (!params.includeArchived) where.archived = false;
    return this.prisma.asset
      .findMany({
        where,
        select: this.assetListSelect(Boolean(params.includeContent)),
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) =>
        this.filterHiddenRows(rows as Array<{ meta: string | null }>, params.showHidden),
      );
  }

  async listOwnerAssetsPage(params: {
    ownerId: string;
    type?: AssetType;
    types?: AssetType[];
    q?: string;
    includeArchived?: boolean;
    showHidden?: boolean;
    includeContent?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 48, 1), 100);
    const skip = (page - 1) * limit;
    const where: Prisma.AssetWhereInput = { ownerId: params.ownerId };
    if (params.types?.length) {
      where.type = { in: params.types };
    } else if (params.type) {
      where.type = params.type;
    }
    if (!params.includeArchived) where.archived = false;
    if (params.q?.trim()) {
      const q = params.q.trim();
      where.OR = [{ title: { contains: q } }, { summary: { contains: q } }];
    }

    const [rows, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        select: this.assetListSelect(Boolean(params.includeContent)),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    const items = this.filterHiddenRows(
      rows as Array<{ meta: string | null }>,
      params.showHidden,
    );

    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + rows.length < total,
    };
  }

  listStudentAssets(params: {
    ownerId?: string;
    type?: AssetType;
    types?: AssetType[];
    q?: string;
    includeArchived?: boolean;
    showHidden?: boolean;
    includeContent?: boolean;
  }) {
    const where = this.studentAssetsWhere(params);
    return this.prisma.asset
      .findMany({
        where,
        select: this.assetListSelect(Boolean(params.includeContent)),
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) =>
        this.filterHiddenRows(rows as Array<{ meta: string | null }>, params.showHidden),
      );
  }

  async listStudentAssetsPage(params: {
    ownerId?: string;
    types?: AssetType[];
    q?: string;
    includeArchived?: boolean;
    showHidden?: boolean;
    includeContent?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 48, 1), 100);
    const skip = (page - 1) * limit;
    const where = this.studentAssetsWhere(params);

    const [rows, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        select: this.assetListSelect(Boolean(params.includeContent)),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    const items = this.filterHiddenRows(
      rows as Array<{ meta: string | null }>,
      params.showHidden,
    );

    return {
      items,
      total,
      page,
      limit,
      hasMore: skip + rows.length < total,
    };
  }

  private studentAssetsWhere(params: {
    ownerId?: string;
    type?: AssetType;
    types?: AssetType[];
    q?: string;
    includeArchived?: boolean;
  }): Prisma.AssetWhereInput {
    const where: Prisma.AssetWhereInput = {
      owner: { role: 'student', deletedAt: null },
    };
    if (params.ownerId) where.ownerId = params.ownerId;
    if (params.types?.length) {
      where.type = { in: params.types };
    } else if (params.type) {
      where.type = params.type;
    }
    if (!params.includeArchived) where.archived = false;
    if (params.q?.trim()) {
      const q = params.q.trim();
      where.OR = [{ title: { contains: q } }, { summary: { contains: q } }];
    }
    return where;
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
    const a = await this.prisma.asset.findUnique({
      where: { id },
      include: { owner: { select: { role: true } } },
    });
    if (!a) throw new NotFoundException('素材不存在');
    if (a.ownerId !== viewerId) {
      if (viewerRole === 'admin') {
        // ok
      } else if (viewerRole === 'teacher' && a.owner.role === 'student') {
        // ok
      } else {
        throw new ForbiddenException('无权归档');
      }
    }
    return this.prisma.asset.update({ where: { id }, data: { archived: true } });
  }

  async restore(id: string, viewerRole: Role) {
    const a = await this.prisma.asset.findUnique({
      where: { id },
      include: { owner: { select: { role: true } } },
    });
    if (!a) throw new NotFoundException('素材不存在');
    if (!['admin', 'teacher'].includes(viewerRole)) {
      throw new ForbiddenException('只有老师可以恢复素材');
    }
    if (viewerRole === 'teacher' && a.owner.role !== 'student') {
      throw new ForbiddenException('无权恢复');
    }
    if (!a.archived) return a;
    return this.prisma.asset.update({ where: { id }, data: { archived: false } });
  }

  async remove(id: string, viewerId: string, viewerRole: Role) {
    const a = await this.prisma.asset.findUnique({
      where: { id },
      include: { owner: { select: { role: true } } },
    });
    if (!a) throw new NotFoundException('素材不存在');
    if (a.ownerId === viewerId) {
      if (viewerRole === 'student') {
        throw new ForbiddenException('请从素材库删除；如需找回可请老师恢复');
      }
      return this.prisma.asset.delete({ where: { id } });
    }
    if (viewerRole === 'admin') {
      return this.prisma.asset.delete({ where: { id } });
    }
    if (viewerRole === 'teacher' && a.owner.role === 'student') {
      if (!TEACHER_DELETABLE_TYPES.has(a.type as AssetType)) {
        throw new ForbiddenException('老师只能删除学生的文字、图片或视频类素材');
      }
      return this.prisma.asset.delete({ where: { id } });
    }
    throw new ForbiddenException('无权删除');
  }

  /** 为缺少封面的视频素材截取第一帧并写入 thumbnailUrl。 */
  async backfillVideoThumbnails(params: { ids?: string[]; limit?: number }) {
    const limit = Math.min(Math.max(params.limit ?? 12, 1), 30);
    const where: {
      type: string;
      archived: boolean;
      url: { not: null };
      id?: { in: string[] };
    } = {
      type: 'video',
      archived: false,
      url: { not: null },
    };
    if (params.ids?.length) {
      where.id = { in: params.ids.slice(0, limit) };
    }

    const rows = await this.prisma.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.ids?.length ? undefined : limit,
    });

    const targets = rows.filter((a) => a.url && !isVideoThumbnailImage(a.thumbnailUrl, a.url));
    const updated: typeof rows = [];

    for (const asset of targets.slice(0, limit)) {
      const thumb = await extractVideoThumbnail(asset.url!);
      if (!thumb) continue;
      const row = await this.prisma.asset.update({
        where: { id: asset.id },
        data: { thumbnailUrl: thumb },
      });
      updated.push(row);
    }

    return { updated: updated.length, ids: updated.map((a) => a.id) };
  }
}
