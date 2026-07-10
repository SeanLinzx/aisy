import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('logs')
@Controller('logs')
@Roles('admin')
export class LogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('jobs')
  jobs(@Query('limit') limit = '50') {
    return this.prisma.aiGenerationJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 50,
      include: { user: { select: { id: true, displayName: true, username: true } } },
    });
  }

  @Get('audit')
  audit(@Query('limit') limit = '100') {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 100,
      include: { user: { select: { id: true, displayName: true } } },
    });
  }
}
