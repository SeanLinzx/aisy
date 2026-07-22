import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makeSlug } from '../../common/utils/slug';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.class.findMany({
      where: { deletedAt: null },
      include: {
        owner: { select: { id: true, displayName: true, username: true } },
        _count: { select: { members: true, groups: true, tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const c = await this.prisma.class.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, username: true, displayName: true, role: true, avatarUrl: true } } } },
        groups: { include: { members: { include: { user: { select: { id: true, displayName: true } } } } } },
        tasks: true,
      },
    });
    if (!c) throw new NotFoundException('班级不存在');
    return c;
  }

  create(data: { name: string; description?: string; ownerId: string }) {
    return this.prisma.class.create({
      data: { name: data.name, description: data.description, ownerId: data.ownerId, code: makeSlug(data.name) },
    });
  }

  update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.class.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.class.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  async addMember(classId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    return this.prisma.classMember.upsert({
      where: { classId_userId: { classId, userId } },
      create: { classId, userId, role: user.role },
      update: {},
    });
  }

  removeMember(classId: string, userId: string) {
    return this.prisma.classMember.delete({
      where: { classId_userId: { classId, userId } },
    });
  }

  async batchMembers(classId: string, action: 'add' | 'remove', userIds: string[]) {
    const uniqueIds = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { ok: true, success: 0, failed: 0, summary: '未选择任何学生' };
    }

    let success = 0;
    const failed: Array<{ userId: string; reason: string }> = [];

    if (action === 'add') {
      for (const userId of uniqueIds) {
        try {
          await this.addMember(classId, userId);
          success += 1;
        } catch (e: unknown) {
          failed.push({ userId, reason: e instanceof Error ? e.message : '加入失败' });
        }
      }
    } else {
      for (const userId of uniqueIds) {
        try {
          const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
          if (!user) {
            failed.push({ userId, reason: '用户不存在' });
            continue;
          }
          if (user.role === 'teacher') {
            failed.push({ userId, reason: '不能移除老师' });
            continue;
          }
          await this.removeMember(classId, userId);
          success += 1;
        } catch (e: unknown) {
          failed.push({ userId, reason: e instanceof Error ? e.message : '移除失败' });
        }
      }
    }

    return {
      ok: true,
      success,
      failed: failed.length,
      errors: failed,
      summary: action === 'add' ? `成功加入 ${success} 人` : `成功移除 ${success} 人`,
    };
  }

  myClasses(userId: string) {
    return this.prisma.class.findMany({
      where: {
        deletedAt: null,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        _count: { select: { members: true, tasks: true } },
      },
    });
  }
}
