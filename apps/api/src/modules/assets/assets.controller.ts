import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
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
  /** 管理员/老师代学生创建时指定 ownerId */
  @IsOptional() @IsString() ownerId?: string;
}

class BackfillVideoThumbnailsDto {
  @IsOptional() @IsArray() @IsString({ each: true }) ids?: string[];
  @IsOptional() @IsNumber() limit?: number;
}

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=15')
  list(
    @CurrentUser() me: AuthUser,
    @Query('ownerId') ownerId?: string,
    @Query('type') type?: AssetType,
    @Query('types') types?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('all') all?: string,
    @Query('showHidden') showHidden?: string,
    @Query('includeContent') includeContent?: string,
    @Query('scope') scope?: string,
    @Query('q') q?: string,
  ) {
    const common = {
      type,
      includeArchived: all === '1',
      showHidden: showHidden === '1',
      includeContent: includeContent === '1',
    };
    const parsedTypes = types
      ?.split(',')
      .map((t) => t.trim())
      .filter((t): t is AssetType => AssetTypes.includes(t as AssetType));
    const limitNum = limit ? Math.min(Math.max(parseInt(limit, 10) || 0, 1), 100) : 0;
    const pageNum = page ? Math.max(parseInt(page, 10) || 1, 1) : 1;

    if (me.role === 'student') {
      const defaultLimit = limitNum > 0 ? limitNum : 48;
      return this.assets.listOwnerAssetsPage({
        ownerId: me.id,
        page: pageNum,
        limit: defaultLimit,
        ...common,
      });
    }
    if (scope === 'students') {
      if (limitNum > 0) {
        return this.assets.listStudentAssetsPage({
          ownerId,
          types: parsedTypes?.length ? parsedTypes : undefined,
          q,
          page: pageNum,
          limit: limitNum,
          ...common,
        });
      }
      return this.assets.listStudentAssets({
        ownerId,
        types: parsedTypes?.length ? parsedTypes : undefined,
        q,
        ...common,
      });
    }
    return this.assets.list({
      ownerId,
      ...common,
      viewerRole: me.role,
    });
  }

  @Post('backfill-video-thumbnails')
  backfillVideoThumbnails(@Body() dto: BackfillVideoThumbnailsDto, @CurrentUser() me: AuthUser) {
    if (!['admin', 'teacher', 'student'].includes(me.role)) {
      return { updated: 0, ids: [] };
    }
    return this.assets.backfillVideoThumbnails({ ids: dto.ids, limit: dto.limit });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.assets.get(id, me.id, me.role);
  }

  @Post()
  create(@Body() dto: CreateAssetDto, @CurrentUser() me: AuthUser) {
    const { ownerId: targetOwnerId, ...rest } = dto;
    const ownerId =
      (me.role === 'admin' || me.role === 'teacher') && targetOwnerId ? targetOwnerId : me.id;
    const staffRole = me.role === 'admin' || me.role === 'teacher' ? me.role : undefined;
    return this.assets.create({ ...rest, ownerId }, staffRole);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() me: AuthUser) {
    return this.assets.update(id, me.id, me.role, dto);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.assets.archive(id, me.id, me.role);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    return this.assets.restore(id, me.role);
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
