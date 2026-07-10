import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  async myChildren(parentId: string) {
    const rels = await this.prisma.parentStudentRelation.findMany({
      where: { parentId },
      include: {
        student: {
          include: {
            studentProfile: true,
            homepage: true,
            assets: { take: 6, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
    return rels.map((r) => r.student);
  }

  async growthReport(parentId: string, studentId: string) {
    const rel = await this.prisma.parentStudentRelation.findFirst({
      where: { parentId, studentId },
    });
    if (!rel) return null;
    const [assets, jobs, submissions] = await Promise.all([
      this.prisma.asset.count({ where: { ownerId: studentId } }),
      this.prisma.aiGenerationJob.count({ where: { userId: studentId } }),
      this.prisma.taskSubmission.findMany({
        where: { studentId },
        include: { task: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    const recent = await this.prisma.asset.findMany({
      where: { ownerId: studentId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    return { assets, jobs, submissions, recent };
  }

  bind(parentId: string, studentId: string, relation = 'parent') {
    return this.prisma.parentStudentRelation.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      create: { parentId, studentId, relation },
      update: {},
    });
  }
}
