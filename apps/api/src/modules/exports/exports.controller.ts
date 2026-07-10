import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ExportsService } from './exports.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('exports')
@Controller('exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get('ppt/:assetId.pptx')
  async ppt(@Param('assetId') assetId: string, @CurrentUser() me: AuthUser, @Res() res: Response) {
    const { buffer, filename } = await this.exports.exportPpt(assetId, me.id, me.role);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.end(buffer);
  }

  @Get('poster/:assetId.pdf')
  async poster(@Param('assetId') assetId: string, @CurrentUser() me: AuthUser, @Res() res: Response) {
    const { buffer, filename } = await this.exports.exportPosterPdf(assetId, me.id, me.role);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.end(buffer);
  }

  @Roles('teacher', 'admin')
  @Get('student-qrcodes.zip')
  async studentQrcodes(
    @Query('kind') kind: string,
    @Query('classId') classId: string | undefined,
    @Res() res: Response,
  ) {
    const k = kind === 'growth' || kind === 'both' ? kind : 'course';
    const { buffer, filename } = await this.exports.exportStudentQrcodesZip({ kind: k, classId });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.end(buffer);
  }
}
