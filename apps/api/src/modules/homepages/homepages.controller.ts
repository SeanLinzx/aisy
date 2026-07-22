import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HomepagesService } from './homepages.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/roles.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('homepages')
@Controller('homepages')
export class HomepagesController {
  constructor(private readonly hp: HomepagesService) {}

  @Get('mine')
  mine(@CurrentUser() me: AuthUser) {
    return this.hp.myHomepage(me.id);
  }

  @Roles('student', 'teacher')
  @Get('plaza')
  classPlaza(@CurrentUser() me: AuthUser) {
    return this.hp.listClassPlaza(me.id, me.role);
  }

  @Patch('mine')
  updateMine(@CurrentUser() me: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.hp.updateMine(me.id, dto as Parameters<HomepagesService['updateMine']>[1]);
  }

  @Post('mine/featured-from-asset')
  setFeaturedFromAsset(@CurrentUser() me: AuthUser, @Body() dto: { assetId: string }) {
    return this.hp.setFeaturedFromAsset(me.id, dto.assetId);
  }

  @Roles('teacher', 'admin')
  @Get('teacher/student-links')
  teacherStudentLinks(@Query('classId') classId?: string) {
    return this.hp.listStudentLinks({ classId });
  }

  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.hp.bySlug(slug);
  }

  @Get('user/:userId')
  byUser(@Param('userId') userId: string) {
    return this.hp.myHomepage(userId);
  }
}
