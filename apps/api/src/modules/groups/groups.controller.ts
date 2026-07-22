import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GroupsService } from './groups.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreateGroupDto {
  @IsString() classId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString({ each: true }) memberNames?: string[];
}

class BatchGroupNamesDto {
  @IsString() classId!: string;
  @IsArray()
  @IsString({ each: true })
  names!: string[];
}

class GroupWithMembersItemDto {
  @IsString() name!: string;
  @IsOptional() @IsString({ each: true }) memberNames?: string[];
}

class BatchGroupsWithMembersDto {
  @IsString() classId!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupWithMembersItemDto)
  groups!: GroupWithMembersItemDto[];
}

class AddPointsDto {
  @IsNumber() delta!: number;
}

class ResetPointsDto {
  @IsString() classId!: string;
}

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@Query('classId') classId?: string) {
    return this.groups.list(classId);
  }

  @Get('scoreboard')
  @Roles('student', 'teacher', 'admin')
  scoreboard(@Query('classId') classId: string) {
    if (!classId) throw new BadRequestException('请指定 classId');
    return this.groups.scoreboard(classId);
  }

  @Get('my-score')
  @Roles('student', 'teacher', 'admin')
  myScore(@CurrentUser() me: AuthUser) {
    return this.groups.myScore(me.id);
  }

  @Post()
  @Roles('admin', 'teacher')
  create(@Body() dto: CreateGroupDto) {
    if (dto.memberNames?.length) {
      return this.groups.createWithMembers(dto.classId, dto.name, dto.memberNames);
    }
    return this.groups.create(dto);
  }

  @Post('batch')
  @Roles('admin', 'teacher')
  batchCreate(@Body() dto: BatchGroupNamesDto) {
    return this.groups.batchCreate(dto.classId, dto.names);
  }

  @Post('batch-with-members')
  @Roles('admin', 'teacher')
  batchCreateWithMembers(@Body() dto: BatchGroupsWithMembersDto) {
    return this.groups.batchCreateWithMembers(dto.classId, dto.groups);
  }

  @Post('reset-points')
  @Roles('admin', 'teacher')
  resetPoints(@Body() dto: ResetPointsDto) {
    return this.groups.resetClassPoints(dto.classId);
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  update(@Param('id') id: string, @Body() dto: Partial<CreateGroupDto>) {
    return this.groups.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  remove(@Param('id') id: string) {
    return this.groups.remove(id);
  }

  @Post(':id/members')
  @Roles('admin', 'teacher')
  addMember(@Param('id') id: string, @Body() body: { userId?: string; names?: string[] }) {
    if (body.names?.length) {
      return this.groups.addMembersByNames(id, body.names);
    }
    if (!body.userId) throw new BadRequestException('请提供 userId 或 names');
    return this.groups.addMember(id, body.userId);
  }

  @Delete(':id/members/:userId')
  @Roles('admin', 'teacher')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.groups.removeMember(id, userId);
  }

  @Post(':id/points')
  @Roles('admin', 'teacher')
  addPoints(@Param('id') id: string, @Body() dto: AddPointsDto) {
    if (!Number.isFinite(dto.delta) || dto.delta === 0) {
      throw new BadRequestException('积分变动值不能为 0');
    }
    return this.groups.addPoints(id, Math.round(dto.delta));
  }
}
