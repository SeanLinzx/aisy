import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigsService } from './configs.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('configs')
@Controller('configs')
export class ConfigsController {
  constructor(private readonly svc: ConfigsService) {}

  @Get()
  @Roles('admin')
  list() {
    return this.svc.listConfigs();
  }

  @Patch(':key')
  @Roles('admin')
  set(@Param('key') key: string, @Body('value') value: any) {
    return this.svc.setConfig(key, value);
  }

  @Get('sensitive-words')
  @Roles('admin', 'teacher')
  listSensitive() {
    return this.svc.listSensitive();
  }

  @Post('sensitive-words')
  @Roles('admin')
  addSensitive(@Body() body: { word: string; severity?: number; category?: string }) {
    return this.svc.addSensitive(body.word, body.severity, body.category);
  }

  @Patch('sensitive-words/:id')
  @Roles('admin')
  toggleSensitive(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.svc.toggleSensitive(id, enabled);
  }

  @Delete('sensitive-words/:id')
  @Roles('admin')
  removeSensitive(@Param('id') id: string) {
    return this.svc.removeSensitive(id);
  }

  @Get('templates')
  listTemplates(@Query('category') category?: string) {
    return this.svc.listTemplates(category);
  }

  @Post('templates')
  @Roles('admin', 'teacher')
  createTemplate(@Body() body: any) {
    return this.svc.createTemplate(body);
  }

  @Patch('templates/:id')
  @Roles('admin', 'teacher')
  updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @Roles('admin')
  removeTemplate(@Param('id') id: string) {
    return this.svc.removeTemplate(id);
  }
}
