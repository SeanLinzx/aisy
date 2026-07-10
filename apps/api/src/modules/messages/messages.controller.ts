import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { MessagesService } from './messages.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class OpenDto {
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() teacherId?: string;
  @IsOptional() @IsString() studentId?: string;
}
class SendDto {
  @IsString() body!: string;
  @IsOptional() @IsString() attachmentUrl?: string;
}

@ApiTags('messages')
@Controller('messages')
@Roles('parent', 'teacher', 'admin')
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  @Get('conversations')
  list(@CurrentUser() me: AuthUser) {
    return this.svc.listForUser(me.id, me.role);
  }

  @Post('conversations')
  open(@Body() dto: OpenDto, @CurrentUser() me: AuthUser) {
    return this.svc.openConversation({
      meId: me.id,
      meRole: me.role,
      parentId: dto.parentId,
      teacherId: dto.teacherId,
      studentId: dto.studentId,
    });
  }

  @Get('conversations/:id')
  get(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.svc.getConversation(id, me.id, me.role);
  }

  @Post('conversations/:id/messages')
  send(@Param('id') id: string, @Body() dto: SendDto, @CurrentUser() me: AuthUser) {
    return this.svc.sendMessage(id, me.id, me.role, dto.body, dto.attachmentUrl);
  }

  @Get('available-teachers')
  @Roles('parent')
  availableTeachers(@CurrentUser() me: AuthUser) {
    return this.svc.availableTeachersForParent(me.id);
  }

  @Get('available-parents')
  @Roles('teacher', 'admin')
  availableParents(@CurrentUser() me: AuthUser) {
    return this.svc.availableParentsForTeacher(me.id);
  }
}
