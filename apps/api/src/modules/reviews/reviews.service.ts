import { Injectable } from '@nestjs/common';
import { ReviewStatus } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  pending() {
    // Anything currently flagged or pending across asset / web project
    return Promise.all([
      this.prisma.asset.findMany({
        where: { reviewStatus: { in: ['pending', 'auto_flagged'] } },
        include: { owner: { select: { id: true, displayName: true, username: true } } },
        take: 50,
      }),
      this.prisma.webProject.findMany({
        where: { reviewStatus: { in: ['pending', 'auto_flagged'] } },
        include: { owner: { select: { id: true, displayName: true, username: true } } },
        take: 50,
      }),
    ]).then(([assets, webProjects]) => ({ assets, webProjects }));
  }

  async reviewAsset(id: string, reviewerId: string, status: ReviewStatus, reason?: string) {
    await this.prisma.asset.update({ where: { id }, data: { reviewStatus: status } });
    return this.prisma.reviewRecord.create({
      data: { targetType: 'asset', targetId: id, reviewerId, status, reason },
    });
  }

  async reviewWebProject(id: string, reviewerId: string, status: ReviewStatus, reason?: string) {
    await this.prisma.webProject.update({ where: { id }, data: { reviewStatus: status } });
    return this.prisma.reviewRecord.create({
      data: { targetType: 'web_project', targetId: id, reviewerId, status, reason },
    });
  }
}
