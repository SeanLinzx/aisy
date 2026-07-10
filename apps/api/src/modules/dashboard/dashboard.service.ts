import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [users, classes, assets, jobs, webProjects] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.class.count({ where: { deletedAt: null } }),
      this.prisma.asset.count(),
      this.prisma.aiGenerationJob.count(),
      this.prisma.webProject.count(),
    ]);
    const byRole = await this.prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const byJobType = await this.prisma.aiGenerationJob.groupBy({
      by: ['jobType'],
      _count: { _all: true },
    });
    const recentJobs = await this.prisma.aiGenerationJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { displayName: true } } },
    });
    return { users, classes, assets, jobs, webProjects, byRole, byJobType, recentJobs };
  }

  async studentOverview(studentId: string) {
    const [assets, jobs, projects, submissions] = await Promise.all([
      this.prisma.asset.count({ where: { ownerId: studentId } }),
      this.prisma.aiGenerationJob.count({ where: { userId: studentId } }),
      this.prisma.webProject.count({ where: { ownerId: studentId } }),
      this.prisma.taskSubmission.count({ where: { studentId } }),
    ]);
    const recent = await this.prisma.asset.findMany({
      where: { ownerId: studentId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    return { assets, jobs, projects, submissions, recent };
  }

  async classOverview(classId: string) {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        members: { include: { user: { select: { id: true, displayName: true, role: true } } } },
        tasks: { include: { _count: { select: { submissions: true } } } },
      },
    });
    return klass;
  }
}
