import { Module } from '@nestjs/common';
import { PublishController } from './publish.controller';
import { StudentHomePublishController, GrowthPublishController } from './student-public.controller';

@Module({ controllers: [PublishController, StudentHomePublishController, GrowthPublishController] })
export class PublishModule {}
