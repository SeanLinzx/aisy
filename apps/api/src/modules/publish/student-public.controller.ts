import { Controller, Get, Header, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/roles.decorator';
import { sanitizeGeneratedHtml } from '../../common/utils/html-sanitize';
import { renderCourseHomePage, renderGrowthPage } from './page-renderers';
import { assemblePublishedHtml } from './html-utils';

/** 学生课程主页 /s/:slug */
@ApiTags('publish')
@Controller('s')
export class StudentHomePublishController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':slug')
  @Header('content-type', 'text/html; charset=utf-8')
  async serve(@Param('slug') slug: string) {
    const hp = await this.prisma.studentHomepage.findUnique({
      where: { slug },
      include: {
        user: { select: { displayName: true } },
        featuredWebProject: {
          include: { versions: { orderBy: { version: 'desc' } }, owner: { select: { displayName: true } } },
        },
      },
    });
    if (!hp || !hp.published) throw new NotFoundException('主页不存在或未公开');

    if (hp.featuredWebProject?.status === 'published' && hp.featuredWebProject.slug) {
      const p = hp.featuredWebProject;
      const v = p.versions.find((x) => x.id === p.publishedVersionId) ?? p.versions[0];
      if (v?.html) {
        const safeHtml = sanitizeGeneratedHtml(v.html);
        return assemblePublishedHtml(
          { html: safeHtml, css: v.css, js: v.js },
          p.title,
          p.owner.displayName,
        );
      }
    }

    const [assets, webProjects] = await Promise.all([
      this.prisma.asset.findMany({
        where: { ownerId: hp.userId, archived: false, visibility: { not: 'private' } },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { title: true, type: true, url: true, thumbnailUrl: true },
      }),
      this.prisma.webProject.findMany({
        where: { ownerId: hp.userId, status: 'published' },
        orderBy: { updatedAt: 'desc' },
        select: { title: true, slug: true },
      }),
    ]);

    return renderCourseHomePage({
      title: hp.title,
      intro: hp.intro,
      ownerName: hp.user.displayName,
      featuredHtml: null,
      assets,
      webProjects: webProjects.filter((w) => w.slug) as Array<{ title: string; slug: string }>,
    });
  }
}

/** 学生成长历程 /g/:slug */
@ApiTags('publish')
@Controller('g')
export class GrowthPublishController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':slug')
  @Header('content-type', 'text/html; charset=utf-8')
  async serve(@Param('slug') slug: string) {
    const hp = await this.prisma.studentHomepage.findUnique({
      where: { slug },
      include: { user: { select: { id: true, displayName: true } } },
    });
    if (!hp || !hp.published) throw new NotFoundException('成长页不存在或未公开');

    const userId = hp.userId;
    const [assets, jobs, submissions, recent, records, classMemberships, assetTypeGroups, gameRecords] =
      await Promise.all([
        this.prisma.asset.count({ where: { ownerId: userId, archived: false } }),
        this.prisma.aiGenerationJob.count({ where: { userId } }),
        this.prisma.taskSubmission.findMany({
          where: { studentId: userId },
          include: { task: { select: { title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.asset.findMany({
          where: { ownerId: userId, archived: false },
          orderBy: { createdAt: 'desc' },
          take: 18,
          select: { title: true, type: true, url: true, createdAt: true },
        }),
        this.prisma.growthRecord.findMany({
          where: { studentId: userId },
          orderBy: { createdAt: 'desc' },
          take: 60,
          select: {
            kind: true,
            gameSlug: true,
            title: true,
            summary: true,
            mediaUrl: true,
            createdAt: true,
          },
        }),
        this.prisma.classMember.findMany({
          where: { userId },
          include: { class: { select: { name: true, owner: { select: { displayName: true } } } } },
          orderBy: { joinedAt: 'desc' },
        }),
        this.prisma.asset.groupBy({
          by: ['type'],
          where: { ownerId: userId, archived: false },
          _count: { _all: true },
        }),
        this.prisma.growthRecord.findMany({
          where: { studentId: userId },
          orderBy: { createdAt: 'desc' },
          take: 500,
          select: { kind: true, gameSlug: true, summary: true, createdAt: true },
        }),
      ]);

    // gameRecords 按创建时间倒序：同一 gameSlug 第一次出现即为最近一次记录
    const gameOrder: string[] = [];
    const gameAgg = new Map<string, { kind: string; playCount: number; lastAt: Date; lastSummary: string | null }>();
    for (const r of gameRecords) {
      const cur = gameAgg.get(r.gameSlug);
      if (cur) {
        cur.playCount += 1;
      } else {
        gameAgg.set(r.gameSlug, { kind: r.kind, playCount: 1, lastAt: r.createdAt, lastSummary: r.summary });
        gameOrder.push(r.gameSlug);
      }
    }
    const games = gameOrder.map((gameSlug) => ({ gameSlug, ...gameAgg.get(gameSlug)! }));

    return renderGrowthPage({
      ownerName: hp.user.displayName,
      assets,
      jobs,
      submissions: submissions.map((s) => ({
        taskTitle: s.task?.title || '任务',
        status: s.status,
        createdAt: s.createdAt,
      })),
      recent,
      records,
      classes: classMemberships.map((m) => ({
        name: m.class.name,
        teacherName: m.class.owner.displayName,
        joinedAt: m.joinedAt,
      })),
      assetTypeStats: assetTypeGroups.map((g) => ({ type: g.type, count: g._count._all })),
      games,
    });
  }
}
