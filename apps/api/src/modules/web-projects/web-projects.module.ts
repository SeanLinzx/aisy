import { Module } from '@nestjs/common';
import { WebProjectsController } from './web-projects.controller';
import { WebProjectsService } from './web-projects.service';

@Module({ controllers: [WebProjectsController], providers: [WebProjectsService], exports: [WebProjectsService] })
export class WebProjectsModule {}
