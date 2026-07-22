import { Module } from '@nestjs/common';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CourseStreamService } from './course-stream.service';

@Module({
  controllers: [CourseController],
  providers: [CourseService, CourseStreamService],
  exports: [CourseService, CourseStreamService],
})
export class CourseModule {}
