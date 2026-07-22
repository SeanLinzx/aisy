import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { ClassesService } from './classes.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreateClassDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}

class BatchMembersDto {
  @IsIn(['add', 'remove'])
  action!: 'add' | 'remove';

  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  userIds!: string[];
}

@ApiTags('classes')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  list() {
    return this.classes.list();
  }

  @Get('mine')
  mine(@CurrentUser() me: AuthUser) {
    return this.classes.myClasses(me.id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.classes.get(id);
  }

  @Post()
  @Roles('admin', 'teacher')
  create(@Body() dto: CreateClassDto, @CurrentUser() me: AuthUser) {
    return this.classes.create({ ...dto, ownerId: me.id });
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  update(@Param('id') id: string, @Body() dto: Partial<CreateClassDto>) {
    return this.classes.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.classes.remove(id);
  }

  @Post(':id/members')
  @Roles('admin', 'teacher')
  addMember(@Param('id') id: string, @Body('userId') userId: string) {
    return this.classes.addMember(id, userId);
  }

  @Post(':id/members/batch')
  @Roles('admin', 'teacher')
  batchMembers(@Param('id') id: string, @Body() dto: BatchMembersDto) {
    return this.classes.batchMembers(id, dto.action, dto.userIds);
  }

  @Delete(':id/members/:userId')
  @Roles('admin', 'teacher')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.classes.removeMember(id, userId);
  }
}
