import { Module } from '@nestjs/common';
import { AiGenerateController } from './ai-generate.controller';
import { AiGenerateService } from './ai-generate.service';
import { VideoTaskPoller } from './video-task.poller';
import { MusicTaskPoller } from './music-task.poller';
import { AssetsModule } from '../assets/assets.module';
import { ConfigsModule } from '../configs/configs.module';
import { WebProjectsModule } from '../web-projects/web-projects.module';

@Module({
  imports: [AssetsModule, ConfigsModule, WebProjectsModule],
  controllers: [AiGenerateController],
  providers: [AiGenerateService, VideoTaskPoller, MusicTaskPoller],
  exports: [AiGenerateService],
})
export class AiGenerateModule {}
