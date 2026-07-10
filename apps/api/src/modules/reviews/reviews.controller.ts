import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReviewStatus } from '../../common/enums';
import { ReviewsService } from './reviews.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('reviews')
@Roles('admin', 'teacher')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('pending')
  pending() {
    return this.reviews.pending();
  }

  @Post('asset/:id')
  reviewAsset(@Param('id') id: string, @Body() body: { status: ReviewStatus; reason?: string }, @CurrentUser() me: AuthUser) {
    return this.reviews.reviewAsset(id, me.id, body.status, body.reason);
  }

  @Post('web-project/:id')
  reviewWeb(@Param('id') id: string, @Body() body: { status: ReviewStatus; reason?: string }, @CurrentUser() me: AuthUser) {
    return this.reviews.reviewWebProject(id, me.id, body.status, body.reason);
  }
}
