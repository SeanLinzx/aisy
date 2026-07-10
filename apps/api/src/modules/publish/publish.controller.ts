import { Controller, Get, Header, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/roles.decorator';
import { sanitizeGeneratedHtml } from '../../common/utils/html-sanitize';
import { assemblePublishedHtml } from './html-utils';

/**
 * Publishes web projects at /p/:slug. Returns the sanitized published-version
 * HTML wrapped with a tiny watermark footer. The Next.js public page also exposes
 * a friendlier wrapper at /p/[slug] but this endpoint is what the iframe loads.
 */
@ApiTags('publish')
@Controller('p')
export class PublishController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(':slug')
  @Header('content-type', 'text/html; charset=utf-8')
  async serve(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    const project = await this.prisma.webProject.findUnique({
      where: { slug },
      include: { versions: { orderBy: { version: 'desc' } }, owner: { select: { displayName: true } } },
    });
    if (!project || project.status !== 'published') throw new NotFoundException('页面不存在或未发布');
    const v = project.versions.find((x) => x.id === project.publishedVersionId) ?? project.versions[0];
    if (!v) throw new NotFoundException('页面无内容');
    const safeHtml = sanitizeGeneratedHtml(v.html || '');
    return assemblePublishedHtml(
      { html: safeHtml, css: v.css, js: v.js },
      project.title,
      project.owner.displayName,
    );
  }
}
