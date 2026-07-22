import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.tuneSqliteForConcurrency();
    this.logger.log('Prisma connected');
  }

  /**
   * SQLite 默认 journal 模式在多端并发读写时会频繁 SQLITE_BUSY。
   * WAL 允许读写并行；busy_timeout 让写冲突排队等待而不是立刻报错。
   */
  private async tuneSqliteForConcurrency() {
    const url = process.env.DATABASE_URL || '';
    if (!url.startsWith('file:')) return;
    try {
      await this.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
      await this.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
      await this.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
      await this.$queryRawUnsafe('PRAGMA cache_size = -64000;');
      this.logger.log('SQLite tuned: WAL + busy_timeout=5000ms + cache=64MB');
    } catch (e: any) {
      this.logger.warn(`SQLite tuning skipped: ${e?.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
