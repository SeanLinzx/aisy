import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParentsService } from './parents.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('parents')
@Controller('parents')
export class ParentsController {
  constructor(private readonly parents: ParentsService) {}

  @Get('children')
  @Roles('parent')
  myChildren(@CurrentUser() me: AuthUser) {
    return this.parents.myChildren(me.id);
  }

  @Get('children/:id/report')
  @Roles('parent')
  report(@Param('id') studentId: string, @CurrentUser() me: AuthUser) {
    return this.parents.growthReport(me.id, studentId);
  }

  @Post('bind')
  @Roles('admin', 'teacher')
  bind(@Body() body: { parentId: string; studentId: string; relation?: string }) {
    return this.parents.bind(body.parentId, body.studentId, body.relation);
  }
}
