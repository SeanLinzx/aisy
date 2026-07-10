import { Module } from '@nestjs/common';
import { HomepagesController } from './homepages.controller';
import { HomepagesService } from './homepages.service';

@Module({ controllers: [HomepagesController], providers: [HomepagesService] })
export class HomepagesModule {}
