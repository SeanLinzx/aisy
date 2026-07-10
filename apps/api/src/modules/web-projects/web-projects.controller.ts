import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { WebProjectsService } from './web-projects.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreateWebProjectDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() html?: string;
  @IsOptional() @IsString() css?: string;
  @IsOptional() @IsString() js?: string;
  @IsOptional() @IsString() prompt?: string;
}

class AddVersionDto {
  @IsOptional() @IsString() html?: string;
  @IsOptional() @IsString() css?: string;
  @IsOptional() @IsString() js?: string;
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsString() notes?: string;
}

@ApiTags('web-projects')
@Controller('web-projects')
export class WebProjectsController {
  constructor(private readonly projects: WebProjectsService) {}

  @Get()
  list(@CurrentUser() me: AuthUser, @Query('ownerId') ownerId?: string) {
    const target = me.role === 'student' ? me.id : ownerId;
    return this.projects.list({ ownerId: target });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.projects.get(id, me.id, me.role);
  }

  @Post()
  create(@Body() dto: CreateWebProjectDto, @CurrentUser() me: AuthUser) {
    return this.projects.create({ ...dto, ownerId: me.id });
  }

  @Post(':id/versions')
  addVersion(@Param('id') id: string, @Body() dto: AddVersionDto, @CurrentUser() me: AuthUser) {
    return this.projects.addVersion(id, me.id, me.role, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() me: AuthUser) {
    return this.projects.update(id, me.id, me.role, dto);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.projects.publish(id, me.id, me.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.projects.remove(id, me.id, me.role);
  }
}
