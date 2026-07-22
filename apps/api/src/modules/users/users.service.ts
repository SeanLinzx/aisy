import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { makeSlug } from '../../common/utils/slug';

export interface CreateUserInput {
  username: string;
  password: string;
  role: Role;
  displayName: string;
  email?: string;
  phone?: string;
  createdById?: string;
  classId?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput, viewerRole?: Role) {
    const exists = await this.prisma.user.findUnique({ where: { username: input.username } });
    if (exists) throw new ConflictException('用户名已存在');
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash,
        passwordPlain: input.password,
        role: input.role,
        displayName: input.displayName,
        email: input.email,
        phone: input.phone,
        createdById: input.createdById,
      },
    });

    if (user.role === 'student') {
      await this.prisma.studentProfile.create({
        data: { userId: user.id, nickname: user.displayName },
      });
      await this.prisma.studentHomepage.create({
        data: {
          userId: user.id,
          slug: makeSlug(user.username),
          title: `${user.displayName} 的 AI 作品主页`,
        },
      });
      await this.prisma.quotaAccount.create({
        data: { userId: user.id, balance: 9999, monthly: 9999 },
      });
    }

    if (input.classId) {
      await this.prisma.classMember.create({
        data: { classId: input.classId, userId: user.id, role: user.role },
      });
    }

    return this.sanitize(user, { includePasswordPlain: viewerRole === 'admin' });
  }

  async batchCreateStudents(
    input: {
      students: Array<{ username: string; displayName: string; password?: string }>;
      classId?: string;
      createdById: string;
    },
    viewerRole?: Role,
  ) {
    const created: ReturnType<UsersService['sanitize']>[] = [];
    const failed: Array<{ row: number; username: string; displayName: string; reason: string }> = [];

    let row = 0;
    for (const item of input.students) {
      row += 1;
      const username = item.username?.trim();
      const displayName = item.displayName?.trim();
      const password = item.password?.trim() || '123456';

      if (!username || !displayName) {
        failed.push({ row, username: username || '', displayName: displayName || '', reason: '昵称和登录用户名不能为空' });
        continue;
      }
      if (password.length < 4) {
        failed.push({ row, username, displayName, reason: '初始密码至少 4 位' });
        continue;
      }

      try {
        const user = await this.create({
          username,
          displayName,
          password,
          role: 'student',
          createdById: input.createdById,
          classId: input.classId,
        }, viewerRole);
        created.push(user);
      } catch (e: unknown) {
        const reason = e instanceof Error ? e.message : '创建失败';
        failed.push({ row, username, displayName, reason });
      }
    }

    return {
      created,
      failed,
      summary: `成功 ${created.length} 个，失败 ${failed.length} 个`,
    };
  }

  async list(params: { role?: Role; q?: string; classId?: string }, viewerRole?: Role) {
    const where: any = { deletedAt: null };
    if (params.role) where.role = params.role;
    if (params.q) {
      where.OR = [
        { username: { contains: params.q, mode: 'insensitive' } },
        { displayName: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    if (params.classId) {
      where.classMemberships = { some: { classId: params.classId } };
    }
    const users = await this.prisma.user.findMany({
      where,
      ...(params.classId
        ? {
            include: {
              studentProfile: { select: { id: true, nickname: true } },
              classMemberships: { include: { class: { select: { id: true, name: true } } } },
            },
          }
        : {}),
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.sanitize(u, { includePasswordPlain: viewerRole === 'admin' }));
  }

  async findById(id: string, viewerRole?: Role) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true },
    });
    if (!u) throw new NotFoundException('用户不存在');
    return this.sanitize(u, { includePasswordPlain: viewerRole === 'admin' });
  }

  async update(id: string, data: Partial<{ displayName: string; email: string; phone: string; avatarUrl: string; password: string; status: 'active' | 'disabled' }>, viewerRole?: Role) {
    const patch: any = {};
    if (data.displayName !== undefined) patch.displayName = data.displayName;
    if (data.email !== undefined) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl;
    if (data.status !== undefined) patch.status = data.status;
    if (data.password) {
      patch.passwordHash = await bcrypt.hash(data.password, 10);
      patch.passwordPlain = data.password;
    }

    const u = await this.prisma.user.update({ where: { id }, data: patch });
    return this.sanitize(u, { includePasswordPlain: viewerRole === 'admin' });
  }

  async remove(id: string) {
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'disabled' } });
    return { ok: true };
  }

  private sanitize<T extends { passwordHash?: string; passwordPlain?: string | null }>(
    u: T,
    options?: { includePasswordPlain?: boolean },
  ) {
    const { passwordHash, passwordPlain, ...rest } = u as any;
    if (options?.includePasswordPlain) {
      return { ...rest, passwordPlain: passwordPlain ?? null };
    }
    return rest;
  }
}
