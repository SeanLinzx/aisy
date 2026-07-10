import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { ConfigsModule } from '../configs/configs.module';

@Module({
  imports: [ConfigsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
