import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SubmissionsService } from './submissions.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class SubmitDto {
  @IsString() taskId!: string;
  @IsOptional() assetIds?: string[];
  @IsOptional() @IsString() webProjectId?: string;
  @IsOptional() @IsString() comment?: string;
}

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Get()
  list(@CurrentUser() me: AuthUser, @Query('taskId') taskId?: string, @Query('studentId') studentId?: string) {
    if (me.role === 'student') return this.submissions.list({ taskId, studentId: me.id });
    return this.submissions.list({ taskId, studentId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.submissions.get(id);
  }

  @Post()
  @Roles('student')
  submit(@Body() dto: SubmitDto, @CurrentUser() me: AuthUser) {
    return this.submissions.submit({ ...dto, studentId: me.id });
  }

  @Patch(':id/review')
  @Roles('admin', 'teacher')
  review(@Param('id') id: string, @Body() dto: any) {
    return this.submissions.review(id, dto);
  }
}
