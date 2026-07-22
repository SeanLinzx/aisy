import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { request } from 'undici';
import PDFDocument = require('pdfkit');
import PptxGenJS from 'pptxgenjs';
import QRCode from 'qrcode';
import { ZipArchive } from 'archiver';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { parseJson } from '../../common/utils/json';
import { courseHomeUrl, growthUrl } from '../../common/utils/public-url';

interface Slide { title: string; body: string; imageUrl?: string }

@Injectable()
export class ExportsService {
  private readonly logger = new Logger('Exports');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build a .pptx in-memory from a slides array. Slides come from either the
   * Asset.meta.slides field (real path) or the Asset.content field (JSON string fallback).
   */
  async exportPpt(assetId: string, viewerId: string, viewerRole: string): Promise<{ buffer: Buffer; filename: string }> {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('素材不存在');
    if (asset.type !== 'ppt') throw new BadRequestException('只能导出 PPT 类型素材');
    if (asset.ownerId !== viewerId && !['admin', 'teacher', 'parent'].includes(viewerRole)) {
      throw new BadRequestException('无权下载该素材');
    }

    const slides = this.extractSlides(asset);
    if (slides.length === 0) throw new BadRequestException('该素材没有可导出的幻灯片内容');

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.title = asset.title;

    // Reusable theme.
    const titleColor = 'C44A2C';
    const bgColors = ['FFF7ED', 'FEF3C7', 'DBEAFE', 'FCE7F3', 'DCFCE7', 'F3E8FF', 'FFE4E6', 'CFFAFE'];

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const slide = pptx.addSlide();
      slide.background = { color: bgColors[i % bgColors.length] };
      slide.addText(s.title, {
        x: 0.6, y: 0.5, w: 12, h: 1.3,
        fontSize: 32, bold: true, color: titleColor, fontFace: 'PingFang SC',
      });
      slide.addText(s.body || '', {
        x: 0.8, y: 2.0, w: 11.5, h: 4.5,
        fontSize: 20, color: '1F2937', fontFace: 'PingFang SC', valign: 'top',
        paraSpaceAfter: 12,
      });
      slide.addText(`AI Camp · ${i + 1}/${slides.length}`, {
        x: 10.5, y: 6.9, w: 2, h: 0.4, fontSize: 10, color: '94A3B8', align: 'right',
      });
    }

    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
    return { buffer: buf, filename: `${this.safeFilename(asset.title)}.pptx` };
  }

  /**
   * Build a single-page A4 PDF poster from an Asset.
   * - If the asset has an image URL, embed it as the centerpiece.
   * - Otherwise fall back to a typographic poster with the prompt/title text.
   */
  async exportPosterPdf(assetId: string, viewerId: string, viewerRole: string): Promise<{ buffer: Buffer; filename: string }> {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('素材不存在');
    if (asset.type !== 'poster' && asset.type !== 'image') {
      throw new BadRequestException('只能导出海报或图片素材');
    }
    if (asset.ownerId !== viewerId && !['admin', 'teacher', 'parent'].includes(viewerRole)) {
      throw new BadRequestException('无权下载该素材');
    }

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve) => {
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const pageWidth = 595.28;
    const pageHeight = 841.89;

    // Soft background
    doc.rect(0, 0, pageWidth, pageHeight).fill('#FFF7ED');
    doc.fillColor('#1f2937');

    doc.fontSize(28).fillColor('#C44A2C').text(asset.title, 36, 60, { width: pageWidth - 72, align: 'center' });
    if (asset.summary) {
      doc.moveDown(0.4).fontSize(14).fillColor('#475569')
        .text(asset.summary, { width: pageWidth - 72, align: 'center' });
    }

    if (asset.url) {
      try {
        const buf = await this.fetchImage(asset.url);
        if (buf) {
          // Fit-to-box: 480 wide centered
          const imgW = 460; const imgH = imgW * 4 / 3;
          const x = (pageWidth - imgW) / 2;
          const y = 200;
          doc.image(buf, x, y, { fit: [imgW, imgH], align: 'center', valign: 'center' });
        }
      } catch (e: any) {
        this.logger.warn(`embed image failed: ${e.message}`);
      }
    } else if (asset.content) {
      doc.moveDown(2).fontSize(16).fillColor('#1f2937')
        .text(asset.content.slice(0, 800), { width: pageWidth - 72, align: 'left', lineGap: 6 });
    }

    doc.fontSize(10).fillColor('#94A3B8').text('由 AI Camp 创作 · 内容请家长老师协助核对', 36, pageHeight - 40, { width: pageWidth - 72, align: 'center' });
    doc.end();

    const buffer = await done;
    return { buffer, filename: `${this.safeFilename(asset.title)}.pdf` };
  }

  // ---- helpers ----

  private extractSlides(asset: any): Slide[] {
    const meta = asset.meta ? parseJson<Record<string, unknown>>(asset.meta, {}) : {};
    if (Array.isArray((meta as { slides?: unknown }).slides))
      return (meta as { slides: Slide[] }).slides;
    if (typeof asset.content === 'string') {
      try {
        const parsed = JSON.parse(asset.content);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  }

  private async fetchImage(url: string): Promise<Buffer | null> {
    if (url.startsWith('data:')) {
      const m = url.match(/^data:[^;]+;base64,(.*)$/);
      if (!m) return null;
      return Buffer.from(m[1], 'base64');
    }
    try {
      const res = await request(url, { method: 'GET' });
      if (res.statusCode >= 400) return null;
      const ab = await res.body.arrayBuffer();
      return Buffer.from(ab);
    } catch {
      return null;
    }
  }

  private safeFilename(s: string): string {
    return (s || 'export').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) || 'export';
  }

  private async fetchStudentsForQrcodeExport(params: {
    classId?: string;
    userIds?: string[];
  }) {
    const where: {
      role: 'student';
      id?: { in: string[] };
      classMemberships?: { some: { classId: string } };
    } = { role: 'student' };

    if (params.userIds?.length) {
      where.id = { in: params.userIds };
    } else if (params.classId) {
      where.classMemberships = { some: { classId: params.classId } };
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { displayName: 'asc' },
      include: { homepage: { select: { slug: true } } },
    });
  }

  private qrcodeScopeLabel(params: { classId?: string; userIds?: string[] }): string {
    if (params.userIds?.length) return `已选${params.userIds.length}人`;
    if (params.classId) return '班级';
    return '全部';
  }

  private async qrPng(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url, { type: 'png', width: 256, margin: 2, errorCorrectionLevel: 'M' });
  }

  /** 批量导出学生二维码 Excel 表格（含二维码图片列） */
  async exportStudentQrcodesXlsx(params: {
    kind: 'course' | 'growth' | 'both';
    classId?: string;
    userIds?: string[];
  }): Promise<{ buffer: Buffer; filename: string }> {
    const students = await this.fetchStudentsForQrcodeExport(params);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AI Camp';
    const sheet = workbook.addWorksheet('学生二维码');

    const QR_SIZE = { width: 108, height: 108 };
    const ROW_HEIGHT = 88;

    if (params.kind === 'both') {
      sheet.columns = [
        { header: '昵称', key: 'name', width: 14 },
        { header: '登录用户名', key: 'username', width: 16 },
        { header: '课程主页链接', key: 'courseUrl', width: 44 },
        { header: '课程主页二维码', key: 'courseQr', width: 18 },
        { header: '成长历程链接', key: 'growthUrl', width: 44 },
        { header: '成长历程二维码', key: 'growthQr', width: 18 },
      ];
    } else {
      const linkHeader = params.kind === 'course' ? '课程主页链接' : '成长历程链接';
      sheet.columns = [
        { header: '昵称', key: 'name', width: 14 },
        { header: '登录用户名', key: 'username', width: 16 },
        { header: linkHeader, key: 'url', width: 48 },
        { header: '二维码', key: 'qr', width: 18 },
      ];
    }

    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.height = 22;

    let rowIndex = 2;
    let count = 0;

    for (const s of students) {
      const slug = s.homepage?.slug;
      if (!slug) continue;

      const courseUrl = courseHomeUrl(slug);
      const growth = growthUrl(slug);
      const row = sheet.addRow(
        params.kind === 'both'
          ? { name: s.displayName, username: s.username, courseUrl, growthUrl: growth }
          : {
              name: s.displayName,
              username: s.username,
              url: params.kind === 'course' ? courseUrl : growth,
            },
      );
      row.height = ROW_HEIGHT;
      row.alignment = { vertical: 'middle', wrapText: true };

      if (params.kind === 'both') {
        const coursePng = await this.qrPng(courseUrl);
        const growthPng = await this.qrPng(growth);
        const courseImg = workbook.addImage({ base64: coursePng.toString('base64'), extension: 'png' });
        const growthImg = workbook.addImage({ base64: growthPng.toString('base64'), extension: 'png' });
        sheet.addImage(courseImg, { tl: { col: 3, row: rowIndex - 1 }, ext: QR_SIZE });
        sheet.addImage(growthImg, { tl: { col: 5, row: rowIndex - 1 }, ext: QR_SIZE });
      } else {
        const url = params.kind === 'course' ? courseUrl : growth;
        const png = await this.qrPng(url);
        const img = workbook.addImage({ base64: png.toString('base64'), extension: 'png' });
        sheet.addImage(img, { tl: { col: 3, row: rowIndex - 1 }, ext: QR_SIZE });
      }

      rowIndex++;
      count++;
    }

    if (count === 0) throw new BadRequestException('没有可导出的学生二维码（请确认学生已创建主页）');

    const raw = await workbook.xlsx.writeBuffer();
    const kindLabel = params.kind === 'both' ? '全部二维码' : params.kind === 'course' ? '课程主页' : '成长历程';
    const scopeLabel = this.qrcodeScopeLabel(params);
    return {
      buffer: Buffer.from(raw),
      filename: `学生${kindLabel}_${scopeLabel}.xlsx`,
    };
  }

  /** 批量导出学生二维码 ZIP（教师/管理员） */
  async exportStudentQrcodesZip(params: {
    kind: 'course' | 'growth' | 'both';
    classId?: string;
    userIds?: string[];
  }): Promise<{ buffer: Buffer; filename: string }> {
    const students = await this.fetchStudentsForQrcodeExport(params);

    const chunks: Buffer[] = [];
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const done = new Promise<Buffer>((resolve, reject) => {
      archive.on('data', (c: Buffer) => chunks.push(c));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });

    let count = 0;
    for (const s of students) {
      const slug = s.homepage?.slug;
      if (!slug) continue;
      const base = `${this.safeFilename(s.displayName)}_${this.safeFilename(s.username)}`;
      const urls: Array<{ label: string; url: string }> = [];
      if (params.kind === 'course' || params.kind === 'both') {
        urls.push({ label: '课程主页', url: courseHomeUrl(slug) });
      }
      if (params.kind === 'growth' || params.kind === 'both') {
        urls.push({ label: '成长历程', url: growthUrl(slug) });
      }
      for (const { label, url } of urls) {
        const png = await QRCode.toBuffer(url, { type: 'png', width: 512, margin: 2, errorCorrectionLevel: 'M' });
        archive.append(png, { name: `${base}_${label}.png` });
        count++;
      }
    }

    if (count === 0) throw new BadRequestException('没有可导出的学生二维码（请确认学生已创建主页）');
    await archive.finalize();
    const buffer = await done;
    const kindLabel = params.kind === 'both' ? '全部二维码' : params.kind === 'course' ? '课程主页' : '成长历程';
    const scopeLabel = this.qrcodeScopeLabel(params);
    return { buffer, filename: `学生${kindLabel}_${scopeLabel}.zip` };
  }

  /** 批量导入学生账号用的 CSV 模板（UTF-8 BOM，Excel 可直接打开） */
  studentImportTemplateCsv(): { buffer: Buffer; filename: string } {
    const lines = [
      '昵称,登录用户名,初始密码',
      '小爱,xiaoai,',
      '小博,xiaobo,123456',
    ];
    const body = `\ufeff${lines.join('\n')}\n`;
    return { buffer: Buffer.from(body, 'utf8'), filename: '学生账号导入模板.csv' };
  }
}
