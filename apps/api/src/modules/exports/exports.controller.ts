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
  @Get('students-import-template.csv')
  studentsImportTemplate(@Res() res: Response) {
    const { buffer, filename } = this.exports.studentImportTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.end(buffer);
  }

  @Roles('teacher', 'admin')
  @Get('student-qrcodes.xlsx')
  async studentQrcodesXlsx(
    @Query('kind') kind: string,
    @Query('classId') classId: string | undefined,
    @Query('ids') ids: string | undefined,
    @Res() res: Response,
  ) {
    const k = kind === 'growth' || kind === 'both' ? kind : 'course';
    const userIds = ids
      ? ids
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;
    const { buffer, filename } = await this.exports.exportStudentQrcodesXlsx({ kind: k, classId, userIds });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.end(buffer);
  }

  @Roles('teacher', 'admin')
  @Get('student-qrcodes.zip')
  async studentQrcodes(
    @Query('kind') kind: string,
    @Query('classId') classId: string | undefined,
    @Query('ids') ids: string | undefined,
    @Res() res: Response,
  ) {
    const k = kind === 'growth' || kind === 'both' ? kind : 'course';
    const userIds = ids
      ? ids
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;
    const { buffer, filename } = await this.exports.exportStudentQrcodesZip({ kind: k, classId, userIds });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.end(buffer);
  }
}
