import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { makeSlug } from '../../common/utils/slug';
import { courseHomeUrl, growthUrl } from '../../common/utils/public-url';
import { parseJson } from '../../common/utils/json';

@Injectable()
export class HomepagesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureForUser(userId: string) {
    let hp = await this.prisma.studentHomepage.findUnique({ where: { userId } });
    if (!hp) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('用户不存在');
      hp = await this.prisma.studentHomepage.create({
        data: {
          userId,
          title: `${user.displayName} 的 AI 作品主页`,
          slug: makeSlug(user.username),
        },
      });
    }
    return hp;
  }

  private attachLinks<T extends { slug: string }>(hp: T) {
    return {
      ...hp,
      courseHomeUrl: courseHomeUrl(hp.slug),
      growthUrl: growthUrl(hp.slug),
    };
  }

  async myHomepage(userId: string) {
    const hp = await this.ensureForUser(userId);
    const [assets, webProjects, featuredWebProject] = await Promise.all([
      this.prisma.asset.findMany({
        where: { ownerId: userId, archived: false },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.webProject.findMany({
        where: { ownerId: userId, status: 'published' },
        orderBy: { updatedAt: 'desc' },
      }),
      hp.featuredWebProjectId
        ? this.prisma.webProject.findUnique({ where: { id: hp.featuredWebProjectId } })
        : null,
    ]);
    return this.attachLinks({ ...hp, assets, webProjects, featuredWebProject });
  }

  async bySlug(slug: string) {
    const hp = await this.prisma.studentHomepage.findUnique({
      where: { slug },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true, username: true } } },
    });
    if (!hp || !hp.published) return null;
    const assets = await this.prisma.asset.findMany({
      where: { ownerId: hp.userId, archived: false, visibility: { not: 'private' } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const webProjects = await this.prisma.webProject.findMany({
      where: { ownerId: hp.userId, status: 'published' },
      orderBy: { updatedAt: 'desc' },
    });
    return this.attachLinks({ ...hp, assets, webProjects });
  }

  async updateMine(
    userId: string,
    data: Partial<{
      title: string;
      intro: string;
      coverUrl: string;
      published: boolean;
      autoLayout: boolean;
      layout: unknown;
      featuredWebProjectId: string | null;
    }>,
  ) {
    const hp = await this.ensureForUser(userId);
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.intro !== undefined) updateData.intro = data.intro;
    if (data.coverUrl !== undefined) updateData.coverUrl = data.coverUrl;
    if (data.published !== undefined) updateData.published = data.published;
    if (data.autoLayout !== undefined) updateData.autoLayout = data.autoLayout;
    if (data.layout !== undefined) updateData.layout = data.layout;

    if (data.featuredWebProjectId !== undefined) {
      const pid = data.featuredWebProjectId;
      if (pid) {
        const wp = await this.prisma.webProject.findFirst({
          where: { id: pid, ownerId: userId, status: 'published' },
        });
        if (!wp) throw new BadRequestException('只能选用自己已发布的网页作品');
      }
      updateData.featuredWebProjectId = pid;
    }

    const updated = await this.prisma.studentHomepage.update({
      where: { id: hp.id },
      data: updateData,
      include: {
        featuredWebProject: { select: { id: true, title: true, slug: true } },
      },
    });
    return this.attachLinks(updated);
  }

  /** 从素材库网页素材设为主页展示页 */
  async setFeaturedFromAsset(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, ownerId: userId, archived: false, type: 'web' },
    });
    if (!asset) throw new NotFoundException('网页素材不存在');

    const meta = asset.meta ? parseJson<Record<string, unknown>>(asset.meta, {}) : {};
    let projectId = typeof meta.projectId === 'string' ? meta.projectId : null;

    if (!projectId && asset.url) {
      const m = asset.url.match(/\/p\/([^/?#]+)/);
      if (m) {
        const wp = await this.prisma.webProject.findUnique({ where: { slug: m[1] } });
        if (wp?.ownerId === userId) projectId = wp.id;
      }
    }

    if (!projectId) throw new BadRequestException('该素材没有关联的已发布网页项目，请先在网页工作台发布');
    return this.updateMine(userId, { featuredWebProjectId: projectId });
  }

  /** 教师：列出学生及其公开链接 */
  async listStudentLinks(params: { classId?: string }) {
    const where: { role: string; classMemberships?: { some: { classId: string } } } = { role: 'student' };
    if (params.classId) {
      where.classMemberships = { some: { classId: params.classId } };
    }
    const students = await this.prisma.user.findMany({
      where,
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        homepage: {
          select: {
            slug: true,
            title: true,
            published: true,
            featuredWebProjectId: true,
            featuredWebProject: { select: { title: true, slug: true } },
          },
        },
      },
    });

    return students.map((s) => {
      const slug = s.homepage?.slug;
      return {
        id: s.id,
        username: s.username,
        displayName: s.displayName,
        homepageSlug: slug ?? null,
        homepageTitle: s.homepage?.title ?? null,
        published: s.homepage?.published ?? false,
        featuredWebProject: s.homepage?.featuredWebProject ?? null,
        courseHomeUrl: slug ? courseHomeUrl(slug) : null,
        growthUrl: slug ? growthUrl(slug) : null,
      };
    });
  }
}
