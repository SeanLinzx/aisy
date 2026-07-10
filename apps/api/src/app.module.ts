import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClassesModule } from './modules/classes/classes.module';
import { GroupsModule } from './modules/groups/groups.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AssetsModule } from './modules/assets/assets.module';
import { WebProjectsModule } from './modules/web-projects/web-projects.module';
import { HomepagesModule } from './modules/homepages/homepages.module';
import { AiProvidersModule } from './modules/ai-providers/ai-providers.module';
import { AiGenerateModule } from './modules/ai-generate/ai-generate.module';
import { AiModule } from './modules/ai/ai.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { QuotasModule } from './modules/quotas/quotas.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ConfigsModule } from './modules/configs/configs.module';
import { LogsModule } from './modules/logs/logs.module';
import { StorageModule } from './modules/storage/storage.module';
import { ParentsModule } from './modules/parents/parents.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { PlazaModule } from './modules/plaza/plaza.module';
import { PublishModule } from './modules/publish/publish.module';
import { ExportsModule } from './modules/exports/exports.module';
import { MessagesModule } from './modules/messages/messages.module';
import { CourseModule } from './modules/course/course.module';
import { GrowthModule } from './modules/growth/growth.module';
import { HealthController } from './health.controller';

const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // trust proxy 开启后按真实客户端 IP 限流。
    // 课堂模式下每个学生有多个 3s 轮询（课堂状态/进度/消息），单人峰值 ≈ 80 req/min，
    // 留足余量到 600/min；短窗口档防止单端瞬时打爆。
    ThrottlerModule.forRoot([
      { name: 'burst', ttl: 1_000, limit: 30 },
      { name: 'sustained', ttl: 60_000, limit: 600 },
    ]),
    ServeStaticModule.forRoot({
      rootPath: uploadDir,
      serveRoot: '/uploads',
      // 上传文件名随机且不复用，可放心让多端浏览器缓存，减少重复流量
      serveStaticOptions: { index: false, fallthrough: true, maxAge: 3_600_000, immutable: true },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClassesModule,
    GroupsModule,
    TasksModule,
    SubmissionsModule,
    AssetsModule,
    WebProjectsModule,
    HomepagesModule,
    AiModule,
    AiProvidersModule,
    AiGenerateModule,
    ReviewsModule,
    QuotasModule,
    DashboardModule,
    ConfigsModule,
    LogsModule,
    StorageModule,
    ParentsModule,
    PlazaModule,
    PublishModule,
    ExportsModule,
    MessagesModule,
    CourseModule,
    GrowthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  controllers: [HealthController],
})
export class AppModule {}
