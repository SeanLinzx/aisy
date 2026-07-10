import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QuotasService } from './quotas.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('quotas')
@Controller('quotas')
export class QuotasController {
  constructor(private readonly quotas: QuotasService) {}

  @Get('mine')
  mine(@CurrentUser() me: AuthUser) {
    return this.quotas.myAccount(me.id);
  }

  @Get()
  @Roles('admin', 'teacher')
  list() {
    return this.quotas.list();
  }

  @Post('grant/:userId')
  @Roles('admin', 'teacher')
  grant(@Param('userId') userId: string, @Body() body: { amount: number; reason?: string }, @CurrentUser() me: AuthUser) {
    return this.quotas.grant(userId, body.amount, me.id, body.reason);
  }
}
