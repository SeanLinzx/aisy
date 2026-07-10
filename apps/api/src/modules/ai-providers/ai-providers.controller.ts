import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiProvidersService } from './ai-providers.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('ai-providers')
@Controller('ai-providers')
export class AiProvidersController {
  constructor(private readonly providers: AiProvidersService) {}

  @Get()
  @Roles('admin')
  list() {
    return this.providers.list();
  }

  @Get('enabled')
  enabled() {
    return this.providers.listEnabledForUser();
  }

  @Patch(':id/status')
  @Roles('admin')
  setStatus(@Param('id') id: string, @Body('status') status: 'active' | 'disabled') {
    return this.providers.setStatus(id, status);
  }

  @Post(':id/models')
  @Roles('admin')
  upsertModel(@Param('id') id: string, @Body() body: any) {
    return this.providers.upsertModel(id, body);
  }

  @Patch('models/:modelId/enabled')
  @Roles('admin')
  toggleModel(@Param('modelId') modelId: string, @Body('enabled') enabled: boolean) {
    return this.providers.toggleModel(modelId, enabled);
  }
}
