import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetType, TaskStatus } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { classId?: string; studentId?: string; ownerId?: string }) {
    const where: any = {};
    if (params.classId) where.classId = params.classId;
    if (params.ownerId) where.ownerId = params.ownerId;
    if (params.studentId) {
      const classIds = (
        await this.prisma.classMember.findMany({ where: { userId: params.studentId } })
      ).map((m) => m.classId);
      where.OR = [{ classId: null }, { classId: { in: classIds } }];
    }
    return this.prisma.task.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        owner: { select: { id: true, displayName: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const t = await this.prisma.task.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, displayName: true } },
        class: true,
        submissions: {
          include: { student: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!t) throw new NotFoundException('任务不存在');
    return t;
  }

  create(data: {
    title: string;
    description?: string;
    type?: AssetType;
    classId?: string;
    dueAt?: Date;
    status?: TaskStatus;
    ownerId: string;
  }) {
    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type ?? 'mixed',
        classId: data.classId,
        ownerId: data.ownerId,
        dueAt: data.dueAt,
        status: data.status ?? 'published',
      },
    });
  }

  update(id: string, data: Partial<{ title: string; description: string; dueAt: Date; status: TaskStatus; type: AssetType; classId: string | null }>) {
    return this.prisma.task.update({ where: { id }, data: data as any });
  }

  remove(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }
}
