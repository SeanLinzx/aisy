import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { stringifyJson } from '../../common/utils/json';

export type GrowthKind = 'quiz' | 'game' | 'debate' | 'share' | 'creation';

export interface GrowthReportInput {
  kind: GrowthKind;
  gameSlug: string;
  title: string;
  summary?: string;
  detail?: unknown;
  mediaUrl?: string;
  /** true（默认）= 同一游戏同一类型 30 分钟内的旧记录会被覆盖，避免反复玩刷屏 */
  replaceRecent?: boolean;
}

const REPLACE_WINDOW_MS = 30 * 60 * 1000;

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  async report(studentId: string, input: GrowthReportInput) {
    const data = {
      studentId,
      kind: input.kind,
      gameSlug: input.gameSlug,
      title: input.title.slice(0, 100),
      summary: input.summary?.slice(0, 500),
      detail: input.detail !== undefined ? stringifyJson(input.detail) : undefined,
      mediaUrl: input.mediaUrl,
    };

    if (input.replaceRecent !== false) {
      const recent = await this.prisma.growthRecord.findFirst({
        where: {
          studentId,
          gameSlug: input.gameSlug,
          kind: input.kind,
          createdAt: { gte: new Date(Date.now() - REPLACE_WINDOW_MS) },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recent) {
        return this.prisma.growthRecord.update({
          where: { id: recent.id },
          data: { ...data, createdAt: new Date() },
        });
      }
    }
    return this.prisma.growthRecord.create({ data });
  }

  async listForStudent(studentId: string, take = 200) {
    return this.prisma.growthRecord.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  /** 家长查看孩子记录前的关系校验 */
  async assertParentOf(parentId: string, studentId: string) {
    const rel = await this.prisma.parentStudentRelation.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });
    if (!rel) throw new ForbiddenException('无权查看该学生的成长手册');
  }
}
