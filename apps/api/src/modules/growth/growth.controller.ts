import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { GrowthService, type GrowthKind } from './growth.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class ReportGrowthDto {
  @IsIn(['quiz', 'game', 'debate', 'share', 'creation']) kind!: GrowthKind;
  @IsString() gameSlug!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() detail?: unknown;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsBoolean() replaceRecent?: boolean;
}

@ApiTags('growth')
@Controller('growth')
export class GrowthController {
  constructor(private readonly svc: GrowthService) {}

  @Post('report')
  @Roles('student', 'teacher', 'admin')
  report(@Body() dto: ReportGrowthDto, @CurrentUser() me: AuthUser) {
    return this.svc.report(me.id, dto);
  }

  @Get('mine')
  @Roles('student', 'teacher', 'admin')
  mine(@CurrentUser() me: AuthUser, @Query('take') take?: string) {
    return this.svc.listForStudent(me.id, take ? Number(take) : undefined);
  }

  @Get('student/:id')
  @Roles('parent', 'teacher', 'admin')
  async byStudent(@Param('id') studentId: string, @CurrentUser() me: AuthUser) {
    if (me.role === 'parent') {
      await this.svc.assertParentOf(me.id, studentId);
    }
    return this.svc.listForStudent(studentId);
  }
}
