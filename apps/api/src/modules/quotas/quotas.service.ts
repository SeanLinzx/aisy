import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QuotasService {
  constructor(private readonly prisma: PrismaService) {}

  async myAccount(userId: string) {
    let acct = await this.prisma.quotaAccount.findUnique({ where: { userId } });
    if (!acct) acct = await this.prisma.quotaAccount.create({ data: { userId } });
    const recent = await this.prisma.quotaTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { account: acct, recent };
  }

  list() {
    return this.prisma.quotaAccount.findMany({
      include: { user: { select: { id: true, displayName: true, username: true, role: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async grant(userId: string, amount: number, operatorId: string, reason = '老师分配额度') {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.quotaAccount.upsert({
        where: { userId },
        create: { userId, balance: amount, monthly: amount },
        update: { balance: { increment: amount }, monthly: { increment: amount } },
      });
      await tx.quotaTransaction.create({
        data: { userId, amount, type: 'grant', operatorId, reason },
      });
      return account;
    });
  }

  async consume(userId: string, amount: number, reason = 'AI 生成消耗') {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.quotaAccount.upsert({
        where: { userId },
        create: { userId, balance: 9999 - amount },
        update: { balance: { decrement: amount } },
      });
      await tx.quotaTransaction.create({
        data: { userId, amount: -amount, type: 'consume', reason },
      });
      return account;
    });
  }
}
