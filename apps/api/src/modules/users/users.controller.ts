import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role, Roles as RoleValues } from '../../common/enums';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class CreateUserDto {
  @IsString()
  username!: string;
  @IsString()
  @MinLength(4)
  password!: string;
  @IsIn(RoleValues)
  role!: Role;
  @IsString()
  displayName!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() classId?: string;
}

class UpdateUserDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() status?: 'active' | 'disabled';
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles('admin', 'teacher')
  list(@Query('role') role?: Role, @Query('q') q?: string, @Query('classId') classId?: string) {
    return this.users.list({ role, q, classId });
  }

  @Post()
  @Roles('admin', 'teacher')
  create(@Body() dto: CreateUserDto, @CurrentUser() me: AuthUser) {
    // Teachers can only create students
    if (me.role === 'teacher' && dto.role !== 'student') {
      dto.role = 'student';
    }
    return this.users.create({ ...dto, createdById: me.id });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Patch(':id')
  @Roles('admin', 'teacher', 'student', 'parent')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() me: AuthUser) {
    if (me.role !== 'admin' && me.role !== 'teacher' && me.id !== id) {
      // students/parents can only edit themselves
      throw new Error('无权限修改他人');
    }
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
