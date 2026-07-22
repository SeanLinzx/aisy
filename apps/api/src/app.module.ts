import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
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
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 已登录用户按 userId 限流（UserThrottlerGuard），机房 NAT 共 IP 时不会全班抢一个桶。
    // 课堂 SSE 替代 classroom 高频轮询后，单人峰值 ≈ 80 req/min，600/min 仍留足余量。
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
  providers: [
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
  controllers: [HealthController],
})
export class AppModule {}
