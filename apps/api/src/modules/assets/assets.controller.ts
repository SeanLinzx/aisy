import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { AssetType, AssetTypes } from '../../common/enums';
import { AssetsService } from './assets.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class LibraryVisibilityDto {
  @IsBoolean() hidden!: boolean;
}

class CreateAssetDto {
  @IsIn(AssetTypes) type!: AssetType;
  @IsString() title!: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() meta?: any;
}

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  list(
    @CurrentUser() me: AuthUser,
    @Query('ownerId') ownerId?: string,
    @Query('type') type?: AssetType,
    @Query('all') all?: string,
    @Query('showHidden') showHidden?: string,
  ) {
    const target = me.role === 'student' ? me.id : ownerId;
    if (me.role === 'student' && !target) {
      throw new UnauthorizedException('登录态无效，请重新登录');
    }
    return this.assets.list({
      ownerId: target,
      type,
      includeArchived: all === '1',
      showHidden: showHidden === '1',
      viewerRole: me.role,
    });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.assets.get(id, me.id, me.role);
  }

  @Post()
  create(@Body() dto: CreateAssetDto, @CurrentUser() me: AuthUser) {
    return this.assets.create({ ...dto, ownerId: me.id });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() me: AuthUser) {
    return this.assets.update(id, me.id, me.role, dto);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.assets.archive(id, me.id, me.role);
  }

  @Post(':id/library-visibility')
  setLibraryVisibility(
    @Param('id') id: string,
    @Body() dto: LibraryVisibilityDto,
    @CurrentUser() me: AuthUser,
  ) {
    return this.assets.setLibraryHidden(id, me.id, me.role, dto.hidden);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.assets.remove(id, me.id, me.role);
  }
}
