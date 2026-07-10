import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseJsonArray, stringifyJson } from '../../common/utils/json';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { taskId?: string; studentId?: string }) {
    return this.prisma.taskSubmission.findMany({
      where: { taskId: params.taskId, studentId: params.studentId },
      include: {
        student: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
        task: { select: { id: true, title: true, type: true } },
        webProject: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const s = await this.prisma.taskSubmission.findUnique({
      where: { id },
      include: { student: true, task: true, webProject: true },
    });
    if (!s) throw new NotFoundException('提交不存在');
    const ids = parseJsonArray<string>(s.assetIds);
    const assets = ids.length ? await this.prisma.asset.findMany({ where: { id: { in: ids } } }) : [];
    return { ...s, assets };
  }

  async submit(data: { taskId: string; studentId: string; assetIds?: string[]; webProjectId?: string; comment?: string }) {
    const assetIdsStored = stringifyJson(data.assetIds ?? []);
    const existing = await this.prisma.taskSubmission.findFirst({
      where: { taskId: data.taskId, studentId: data.studentId },
    });
    if (existing) {
      return this.prisma.taskSubmission.update({
        where: { id: existing.id },
        data: {
          assetIds: assetIdsStored,
          webProjectId: data.webProjectId,
          comment: data.comment,
          status: 'submitted',
        },
      });
    }
    return this.prisma.taskSubmission.create({
      data: {
        taskId: data.taskId,
        studentId: data.studentId,
        assetIds: assetIdsStored,
        webProjectId: data.webProjectId,
        comment: data.comment,
      },
    });
  }

  review(id: string, data: { status?: 'reviewed' | 'returned'; score?: number; comment?: string; featured?: boolean }) {
    return this.prisma.taskSubmission.update({
      where: { id },
      data: {
        status: data.status,
        score: data.score,
        comment: data.comment,
        featured: data.featured,
      },
    });
  }
}
