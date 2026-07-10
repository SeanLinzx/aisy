import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { AssetType, AssetTypes, TaskStatus } from '../../common/enums';

const TASK_STATUSES: TaskStatus[] = ['draft', 'published', 'archived'];
import { TasksService } from './tasks.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreateTaskDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(AssetTypes) type?: AssetType;
  @IsOptional() @IsString() classId?: string;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsIn(TASK_STATUSES) status?: TaskStatus;
}

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(
    @CurrentUser() me: AuthUser,
    @Query('classId') classId?: string,
    @Query('mine') mine?: string,
  ) {
    if (me.role === 'student') return this.tasks.list({ studentId: me.id, classId });
    if (mine === '1' && (me.role === 'teacher' || me.role === 'admin')) {
      return this.tasks.list({ ownerId: me.id, classId });
    }
    return this.tasks.list({ classId });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tasks.get(id);
  }

  @Post()
  @Roles('admin', 'teacher')
  create(@Body() dto: CreateTaskDto, @CurrentUser() me: AuthUser) {
    return this.tasks.create({
      ...dto,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      ownerId: me.id,
    });
  }

  @Patch(':id')
  @Roles('admin', 'teacher')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTaskDto>) {
    return this.tasks.update(id, {
      ...dto,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
    });
  }

  @Delete(':id')
  @Roles('admin', 'teacher')
  remove(@Param('id') id: string) {
    return this.tasks.remove(id);
  }
}
