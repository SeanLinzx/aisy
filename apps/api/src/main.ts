import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function listenWithRetry(app: NestExpressApplication, port: number, retries = 8) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await app.listen(port, '0.0.0.0');
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EADDRINUSE' || attempt === retries) {
        throw err;
      }
      Logger.warn(
        `Port ${port} is busy (likely a stale dev process). Retrying in 1s... (${attempt}/${retries})`,
        'Bootstrap',
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    bodyParser: false,
  });

  const port = Number(process.env.API_PORT || 3001);
  const webOrigins = (process.env.WEB_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // 生产环境位于 Nginx / Next.js 反代之后：信任一层代理，
  // 使限流与日志拿到真实客户端 IP，而不是把全班流量算进同一个桶。
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api', { exclude: ['uploads/(.*)', 'p/(.*)', 's/(.*)', 'g/(.*)'] });
  // AI 生成可能携带 base64 参考图，默认 100kb 太小
  app.useBodyParser('json', { limit: '20mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '20mb' });
  app.use(cookieParser());
  // Windows / Edge 对 mp4 预览更依赖正确的 MIME 与 Range 支持
  app.use('/uploads', (req, res, next) => {
    if (/\.mp4(?:\?|$)/i.test(req.url || '')) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
    }
    next();
  });
  // SSE 端点（/course/*/stream）显式关闭中间层缓冲：机房场景常见 nginx / 校园网代理
  // 即使配了 proxy_buffering off，也建议尊重这个响应头，双重保险避免推送被攒批延迟。
  app.use((req, res, next) => {
    if (req.path.endsWith('/stream')) {
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
    }
    next();
  });
  app.enableShutdownHooks();
  app.enableCors({
    origin: [...new Set([...webOrigins, 'http://localhost:3000'])],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swagger = new DocumentBuilder()
    .setTitle('AI Camp API')
    .setDescription('Backend API for the Summer Camp AI creative platform')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addCookieAuth(process.env.COOKIE_NAME || 'ai_camp_token')
    .build();
  const doc = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api/docs', app, doc);

  await listenWithRetry(app, port);

  // 30 人机房场景下会有大量长连接（SSE）+ 并发上传下载：
  // 放宽 Node HTTP server 的连接级超时，避免课堂进行到一半时连接被服务端主动掐断。
  const server = app.getHttpServer();
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 330_000;
  server.requestTimeout = 0;
  server.maxConnections = 0; // 0 = 不限制（默认即不限制，这里显式声明避免被环境覆盖）

  Logger.log(`🚀 API ready at http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`📚 Swagger at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
