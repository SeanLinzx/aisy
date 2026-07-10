import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @Roles('admin', 'teacher')
  overview() {
    return this.dashboard.overview();
  }

  @Get('mine')
  mine(@CurrentUser() me: AuthUser) {
    return this.dashboard.studentOverview(me.id);
  }

  @Get('class/:id')
  @Roles('admin', 'teacher')
  classOverview(@Param('id') id: string) {
    return this.dashboard.classOverview(id);
  }
}
