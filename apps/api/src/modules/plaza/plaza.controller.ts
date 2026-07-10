import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlazaService } from './plaza.service';
import { Roles, Public } from '../../common/decorators/roles.decorator';

@ApiTags('plaza')
@Controller('plaza')
export class PlazaController {
  constructor(private readonly plaza: PlazaService) {}

  @Public()
  @Get()
  list(@Query('type') type?: string) {
    return this.plaza.list({ type });
  }

  @Post()
  @Roles('admin', 'teacher')
  add(@Body() body: any) {
    return this.plaza.add(body);
  }

  @Patch(':id/featured')
  @Roles('admin', 'teacher')
  feature(@Param('id') id: string, @Body('featured') featured: boolean) {
    return this.plaza.toggleFeatured(id, featured);
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  remove(@Param('id') id: string) {
    return this.plaza.remove(id);
  }
}
