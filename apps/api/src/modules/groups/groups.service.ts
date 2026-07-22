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

  async batchCreate(classId: string, names: string[]) {
    const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
    if (cleaned.length === 0) return { created: 0, groups: [] as Awaited<ReturnType<GroupsService['list']>> };
    await this.prisma.group.createMany({
      data: cleaned.map((name) => ({ classId, name })),
    });
    const groups = await this.list(classId);
    return { created: cleaned.length, groups };
  }

  private resolveStudentNames(
    names: string[],
    students: Array<{ id: string; displayName: string; username: string }>,
  ) {
    const matched: string[] = [];
    const unmatched: string[] = [];
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      const found = students.find(
        (s) =>
          s.displayName === name
          || s.username === name
          || s.displayName.replace(/\s/g, '') === name.replace(/\s/g, ''),
      );
      if (found) matched.push(found.id);
      else unmatched.push(name);
    }
    return { matched: [...new Set(matched)], unmatched };
  }

  private async classStudents(classId: string) {
    const rows = await this.prisma.classMember.findMany({
      where: { classId },
      include: { user: { select: { id: true, displayName: true, username: true, role: true } } },
    });
    return rows.filter((r) => r.user.role === 'student').map((r) => r.user);
  }

  async createWithMembers(classId: string, name: string, memberNames: string[] = []) {
    const students = await this.classStudents(classId);
    const group = await this.prisma.group.create({ data: { classId, name: name.trim() } });
    const { matched, unmatched } = this.resolveStudentNames(memberNames, students);
    for (const userId of matched) {
      await this.addMember(group.id, userId);
    }
    const full = await this.prisma.group.findUnique({
      where: { id: group.id },
      include: {
        class: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true } } } },
      },
    });
    return { group: full, unmatched };
  }

  async batchCreateWithMembers(
    classId: string,
    items: Array<{ name: string; memberNames?: string[] }>,
  ) {
    const students = await this.classStudents(classId);
    const results: Array<{ name: string; groupId: string; unmatched: string[] }> = [];
    for (const item of items) {
      const name = item.name.trim();
      if (!name) continue;
      const group = await this.prisma.group.create({ data: { classId, name } });
      const { matched, unmatched } = this.resolveStudentNames(item.memberNames ?? [], students);
      for (const userId of matched) {
        await this.addMember(group.id, userId);
      }
      results.push({ name, groupId: group.id, unmatched });
    }
    const groups = await this.list(classId);
    return { created: results.length, results, groups };
  }

  async addMembersByNames(groupId: string, memberNames: string[]) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('小组不存在');
    const students = await this.classStudents(group.classId);
    const { matched, unmatched } = this.resolveStudentNames(memberNames, students);
    for (const userId of matched) {
      await this.addMember(groupId, userId);
    }
    return { added: matched.length, unmatched, group: await this.list(group.classId).then((gs) => gs.find((g) => g.id === groupId)) };
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
