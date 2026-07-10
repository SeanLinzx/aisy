import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlazaService {
  constructor(private readonly prisma: PrismaService) {}

  list(filter?: { type?: string }) {
    return this.prisma.plazaItem.findMany({
      where: filter?.type ? { targetType: filter.type } : {},
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  add(data: { title: string; summary?: string; coverUrl?: string; targetType: string; targetId: string; studentId: string; featured?: boolean }) {
    return this.prisma.plazaItem.create({ data });
  }

  remove(id: string) {
    return this.prisma.plazaItem.delete({ where: { id } });
  }

  toggleFeatured(id: string, featured: boolean) {
    return this.prisma.plazaItem.update({ where: { id }, data: { featured } });
  }
}
