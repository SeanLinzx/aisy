import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role } from '../../common/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { makeSlug } from '../../common/utils/slug';
import { sanitizeGeneratedHtml } from '../../common/utils/html-sanitize';

@Injectable()
export class WebProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: { ownerId?: string }) {
    return this.prisma.webProject.findMany({
      where: { ownerId: params.ownerId },
      include: {
        owner: { select: { id: true, displayName: true, username: true } },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(id: string, viewerId: string, viewerRole: Role) {
    const p = await this.prisma.webProject.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { version: 'desc' } },
        owner: { select: { id: true, displayName: true, username: true } },
      },
    });
    if (!p) throw new NotFoundException('项目不存在');
    if (p.ownerId !== viewerId && !['admin', 'teacher'].includes(viewerRole) && p.visibility === 'private') {
      throw new ForbiddenException('无权查看');
    }
    return p;
  }

  async getBySlug(slug: string) {
    const p = await this.prisma.webProject.findUnique({
      where: { slug },
      include: {
        owner: { select: { id: true, displayName: true, username: true } },
        versions: { orderBy: { version: 'desc' } },
      },
    });
    if (!p || p.status !== 'published') return null;
    return p;
  }

  async create(data: { ownerId: string; title: string; description?: string; html?: string; css?: string; js?: string; prompt?: string }) {
    const html = sanitizeGeneratedHtml(data.html ?? defaultTemplate(data.title));
    const project = await this.prisma.webProject.create({
      data: {
        ownerId: data.ownerId,
        title: data.title,
        description: data.description,
        currentVersion: 1,
        versions: {
          create: {
            version: 1,
            html,
            css: data.css ?? '',
            js: data.js ?? '',
            prompt: data.prompt,
          },
        },
      },
      include: { versions: true },
    });
    return project;
  }

  async addVersion(id: string, viewerId: string, viewerRole: Role, data: { html?: string; css?: string; js?: string; prompt?: string; notes?: string }) {
    const p = await this.prisma.webProject.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
    if (!p) throw new NotFoundException('项目不存在');
    if (p.ownerId !== viewerId && !['admin'].includes(viewerRole)) throw new ForbiddenException('无权编辑');

    const last = p.versions[0];
    const newVersion = (last?.version ?? 0) + 1;
    const html = sanitizeGeneratedHtml(data.html ?? last?.html ?? '');
    const version = await this.prisma.webProjectVersion.create({
      data: {
        projectId: id,
        version: newVersion,
        html,
        css: data.css ?? last?.css ?? '',
        js: data.js ?? last?.js ?? '',
        prompt: data.prompt,
        notes: data.notes,
      },
    });
    await this.prisma.webProject.update({
      where: { id },
      data: { currentVersion: newVersion, updatedAt: new Date() },
    });
    return version;
  }

  async update(id: string, viewerId: string, viewerRole: Role, data: any) {
    const p = await this.prisma.webProject.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('项目不存在');
    if (p.ownerId !== viewerId && !['admin'].includes(viewerRole)) throw new ForbiddenException('无权修改');
    return this.prisma.webProject.update({ where: { id }, data });
  }

  async publish(id: string, viewerId: string, viewerRole: Role) {
    const p = await this.prisma.webProject.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
    if (!p) throw new NotFoundException('项目不存在');
    if (p.ownerId !== viewerId && !['admin'].includes(viewerRole)) throw new ForbiddenException('无权发布');

    const version = p.versions[0];
    if (!version) throw new NotFoundException('没有可发布的版本');

    const slug = p.slug ?? makeSlug(p.title);
    return this.prisma.webProject.update({
      where: { id },
      data: {
        status: 'published',
        slug,
        publishedVersionId: version.id,
        visibility: 'public',
      },
    });
  }

  async remove(id: string, viewerId: string, viewerRole: Role) {
    const p = await this.prisma.webProject.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('项目不存在');
    if (p.ownerId !== viewerId && !['admin'].includes(viewerRole)) throw new ForbiddenException('无权删除');
    return this.prisma.webProject.delete({ where: { id } });
  }
}

function defaultTemplate(title: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  body { font-family: 'PingFang SC', system-ui, sans-serif; margin: 0; background: linear-gradient(135deg,#ffe9f0,#e9f4ff); color:#222; }
  main { max-width: 720px; margin: 40px auto; padding: 32px; background: white; border-radius: 20px; box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
  h1 { color:#ff6d88; }
</style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>欢迎来到我的 AI 作品集！这是一个空白模板，快去用 AI 提示词生成你自己的网页吧。</p>
  </main>
</body>
</html>`;
}
