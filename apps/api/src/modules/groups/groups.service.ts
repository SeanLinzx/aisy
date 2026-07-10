import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  list(classId?: string) {
    return this.prisma.group.findMany({
      where: classId ? { classId } : {},
      include: {
        class: { select: { id: true, name: true } },
        members: {
          include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
        },
      },
      orderBy: [{ points: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(data: { classId: string; name: string; description?: string }) {
    return this.prisma.group.create({ data });
  }

  update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.group.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.group.delete({ where: { id } });
  }

  addMember(groupId: string, userId: string) {
    return this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId },
      update: {},
    });
  }

  removeMember(groupId: string, userId: string) {
    return this.prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId } } });
  }

  async addPoints(groupId: string, delta: number) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('小组不存在');
    const next = Math.max(0, group.points + delta);
    return this.prisma.group.update({
      where: { id: groupId },
      data: { points: next },
      include: {
        class: { select: { id: true, name: true } },
        members: {
          include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
        },
      },
    });
  }

  async setPoints(groupId: string, points: number) {
    return this.prisma.group.update({
      where: { id: groupId },
      data: { points: Math.max(0, points) },
      include: {
        class: { select: { id: true, name: true } },
        members: {
          include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
        },
      },
    });
  }

  resetClassPoints(classId: string) {
    return this.prisma.group.updateMany({ where: { classId }, data: { points: 0 } });
  }

  scoreboard(classId: string) {
    return this.list(classId);
  }

  async myScore(userId: string) {
    const membership = await this.prisma.groupMember.findFirst({
      where: { userId },
      include: {
        group: {
          include: {
            class: { select: { id: true, name: true } },
            members: {
              include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    if (!membership) {
      return { myGroup: null, rank: null, totalGroups: 0, leaderboard: [] as Awaited<ReturnType<GroupsService['list']>> };
    }

    const leaderboard = await this.list(membership.group.classId);
    const rank = leaderboard.findIndex((g) => g.id === membership.groupId) + 1;

    return {
      myGroup: membership.group,
      rank: rank > 0 ? rank : null,
      totalGroups: leaderboard.length,
      leaderboard,
    };
  }
}
