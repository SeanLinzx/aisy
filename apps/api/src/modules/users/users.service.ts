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

  async create(input: CreateUserInput) {
    const exists = await this.prisma.user.findUnique({ where: { username: input.username } });
    if (exists) throw new ConflictException('用户名已存在');
    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash,
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

    return this.sanitize(user);
  }

  async list(params: { role?: Role; q?: string; classId?: string }) {
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
      include: { studentProfile: true, classMemberships: { include: { class: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.sanitize(u));
  }

  async findById(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true },
    });
    if (!u) throw new NotFoundException('用户不存在');
    return this.sanitize(u);
  }

  async update(id: string, data: Partial<{ displayName: string; email: string; phone: string; avatarUrl: string; password: string; status: 'active' | 'disabled' }>) {
    const patch: any = {};
    if (data.displayName !== undefined) patch.displayName = data.displayName;
    if (data.email !== undefined) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl;
    if (data.status !== undefined) patch.status = data.status;
    if (data.password) patch.passwordHash = await bcrypt.hash(data.password, 10);

    const u = await this.prisma.user.update({ where: { id }, data: patch });
    return this.sanitize(u);
  }

  async remove(id: string) {
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'disabled' } });
    return { ok: true };
  }

  private sanitize<T extends { passwordHash?: string }>(u: T): Omit<T, 'passwordHash'> {
    const { passwordHash, ...rest } = u as any;
    return rest;
  }
}
