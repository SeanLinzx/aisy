import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigsService } from '../configs/configs.service';
import { containsSensitive } from '../../common/utils/html-sanitize';

export interface OpenConversationInput {
  // Caller is one party; the other party is provided.
  meId: string;
  meRole: Role;
  parentId?: string;
  teacherId?: string;
  studentId?: string;
}

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService, private readonly configs: ConfigsService) {}

  async listForUser(userId: string, role: Role) {
    const where = role === 'parent'
      ? { parentId: userId }
      : role === 'teacher' || role === 'admin'
        ? { teacherId: userId }
        : null;
    if (!where) return [];
    return this.prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        parent: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
        teacher: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  /** Open or reuse the (parent, teacher, student?) conversation. */
  async openConversation(input: OpenConversationInput) {
    let { parentId, teacherId, studentId } = input;
    // Ensure caller is one of the parties.
    if (input.meRole === 'parent') parentId = input.meId;
    if (input.meRole === 'teacher' || input.meRole === 'admin') teacherId = input.meId;

    if (!parentId || !teacherId) {
      throw new BadRequestException('需要同时提供家长与老师 id');
    }

    // Validate the relation: the student (if any) must belong to the parent
    // and be in a class owned by the teacher (or teacher is admin).
    if (studentId) {
      const rel = await this.prisma.parentStudentRelation.findFirst({ where: { parentId, studentId } });
      if (!rel) throw new ForbiddenException('该学生未绑定到此家长');
    }

    const found = await this.prisma.conversation.findUnique({
      where: { parentId_teacherId_studentId: { parentId, teacherId, studentId: studentId ?? null as any } },
    }).catch(() => null);
    if (found) return this.serialize(found.id, input.meId, input.meRole);

    const conv = await this.prisma.conversation.create({
      data: { parentId, teacherId, studentId: studentId ?? null },
    });
    return this.serialize(conv.id, input.meId, input.meRole);
  }

  async getConversation(id: string, viewerId: string, viewerRole: Role) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
        teacher: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 200 },
      },
    });
    if (!conv) throw new NotFoundException('会话不存在');
    if (!this.canView(conv, viewerId, viewerRole)) throw new ForbiddenException('无权查看该会话');

    // Reset unread for this side.
    if (viewerRole === 'parent' && conv.parentId === viewerId) {
      await this.prisma.conversation.update({ where: { id }, data: { parentUnread: 0 } });
    } else if ((viewerRole === 'teacher' || viewerRole === 'admin') && conv.teacherId === viewerId) {
      await this.prisma.conversation.update({ where: { id }, data: { teacherUnread: 0 } });
    }
    const student = conv.studentId
      ? await this.prisma.user.findUnique({
          where: { id: conv.studentId },
          select: { id: true, displayName: true, username: true, avatarUrl: true },
        })
      : null;
    return { ...conv, student };
  }

  async sendMessage(convId: string, viewerId: string, viewerRole: Role, body: string, attachmentUrl?: string) {
    if (!body || !body.trim()) throw new BadRequestException('消息内容不能为空');
    const conv = await this.prisma.conversation.findUnique({ where: { id: convId } });
    if (!conv) throw new NotFoundException('会话不存在');
    if (!this.canView(conv, viewerId, viewerRole)) throw new ForbiddenException('无权发言');

    // Soft sensitive-word check.
    const words = await this.configs.getSensitiveWords();
    const hit = containsSensitive(body, words);
    if (hit) throw new BadRequestException(`消息包含敏感词："${hit}"`);

    const isParent = viewerId === conv.parentId;
    const msg = await this.prisma.$transaction(async (tx) => {
      const m = await tx.message.create({
        data: { conversationId: convId, senderId: viewerId, body: body.trim(), attachmentUrl },
      });
      await tx.conversation.update({
        where: { id: convId },
        data: {
          lastMessageAt: new Date(),
          parentUnread: isParent ? 0 : { increment: 1 },
          teacherUnread: isParent ? { increment: 1 } : 0,
        },
      });
      return m;
    });
    return msg;
  }

  /** For parents: list teachers they can talk to. */
  async availableTeachersForParent(parentId: string) {
    const children = await this.prisma.parentStudentRelation.findMany({
      where: { parentId },
      include: {
        student: {
          include: {
            classMemberships: {
              include: {
                class: {
                  include: {
                    owner: { select: { id: true, displayName: true, username: true, avatarUrl: true, role: true } },
                    members: {
                      where: { role: 'teacher' },
                      include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true, role: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const teachers = new Map<string, any>();
    const items: Array<{ student: any; teachers: any[] }> = [];
    for (const rel of children) {
      const studentTeachers: any[] = [];
      for (const cm of rel.student.classMemberships) {
        const owner = cm.class.owner;
        if (owner) {
          teachers.set(owner.id, owner);
          studentTeachers.push({ ...owner, className: cm.class.name });
        }
        for (const m of cm.class.members) {
          if (m.user.role === 'teacher') {
            teachers.set(m.user.id, m.user);
            studentTeachers.push({ ...m.user, className: cm.class.name });
          }
        }
      }
      items.push({
        student: { id: rel.student.id, displayName: rel.student.displayName, username: rel.student.username, avatarUrl: rel.student.avatarUrl },
        teachers: dedupBy(studentTeachers, (t) => t.id),
      });
    }
    return items;
  }

  /** For teachers: list parents they can talk to (parents of their class students). */
  async availableParentsForTeacher(teacherId: string) {
    const classes = await this.prisma.class.findMany({
      where: { OR: [{ ownerId: teacherId }, { members: { some: { userId: teacherId } } }] },
      include: {
        members: {
          where: { role: 'student' },
          include: {
            user: {
              include: {
                studentOf: {
                  include: { parent: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
                },
              },
            },
          },
        },
      },
    });
    const items: Array<{ student: any; parents: any[]; className: string }> = [];
    for (const cls of classes) {
      for (const m of cls.members) {
        const parents = m.user.studentOf.map((rel) => rel.parent);
        items.push({
          student: { id: m.user.id, displayName: m.user.displayName, username: m.user.username, avatarUrl: m.user.avatarUrl },
          parents,
          className: cls.name,
        });
      }
    }
    return items;
  }

  // ---- helpers ----
  private canView(conv: { parentId: string; teacherId: string }, viewerId: string, role: Role): boolean {
    if (role === 'admin') return true;
    if (role === 'parent') return conv.parentId === viewerId;
    if (role === 'teacher') return conv.teacherId === viewerId;
    return false;
  }
  private async serialize(id: string, viewerId: string, viewerRole: Role) {
    return this.getConversation(id, viewerId, viewerRole);
  }
}

function dedupBy<T>(arr: T[], key: (v: T) => string): T[] {
  const m = new Map<string, T>();
  for (const v of arr) m.set(key(v), v);
  return [...m.values()];
}
