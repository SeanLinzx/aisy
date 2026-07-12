import { BadRequestException, Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CourseService, type GameProgressReportInput } from './course.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class TuringAnswerDto {
  @IsString() id!: string;
  @IsString() text!: string;
  @IsBoolean() isAI!: boolean;
}

class SetTuringDto {
  @IsString() question!: string;
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => TuringAnswerDto)
  answers!: TuringAnswerDto[];
  @IsOptional() @IsString() slotId?: string;
}

class TuringPendingSlotDto {
  @IsString() id!: string;
  @IsString() question!: string;
  @IsString() human1!: string;
  @IsString() human2!: string;
  @IsString() ai1!: string;
  @IsString() ai2!: string;
}

class SetTuringBankDto {
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => TuringPendingSlotDto)
  slots!: TuringPendingSlotDto[];
}

class PublishTuringSlotDto {
  @IsString() slotId!: string;
}

class SlidesDto {
  @IsString() url!: string;
  @IsString() name!: string;
  @IsNumber() page!: number;
  @IsOptional() @IsIn(['pdf', 'deck']) kind?: 'pdf' | 'deck';
}

class ShowcaseDto {
  @IsString() studentId!: string;
  @IsString() displayName!: string;
  @IsOptional() @IsString() gameSlug?: string;
  @IsOptional() @IsString() gameTitle?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsString() summary?: string;
  @IsIn(['game-progress', 'summary']) source!: 'game-progress' | 'summary';
  @IsNumber() pushedAt!: number;
}

class SetClassroomDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() currentGame?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) students?: string[];
  @IsOptional() @IsIn(['game', 'slides', 'showcase']) mode?: 'game' | 'slides' | 'showcase';
  @IsOptional() @IsObject() slides?: SlidesDto | null;
  @IsOptional() @ValidateNested() @Type(() => ShowcaseDto) showcase?: ShowcaseDto | null;
}

class CancelSubEventDto {
  @IsIn(['page1_wrong', 'page1_correct', 'page2_wrong', 'page2_correct'])
  event!: 'page1_wrong' | 'page1_correct' | 'page2_wrong' | 'page2_correct';

  @IsOptional() @IsString() displayName?: string;
}

class GroupGrabItemDto {
  @IsString() name!: string;
  @IsOptional() @IsNumber() @Min(1) capacity?: number;
  @IsOptional() @IsString() emoji?: string;
}

class SetupGroupGrabDto {
  @IsOptional() @IsString() classId?: string;
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => GroupGrabItemDto)
  groups!: GroupGrabItemDto[];
}

class GrabGroupDto {
  @IsString() groupId!: string;
  @IsOptional() @IsString() displayName?: string;
}

class ManualAssignGroupDto {
  @IsString() studentId!: string;
  @IsString() groupId!: string;
  @IsOptional() @IsString() displayName?: string;
}

class GameProgressItemDto {
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() status?: string;
}

class ReportGameProgressDto {
  @IsString() gameSlug!: string;
  @IsIn(['idle', 'generating', 'done', 'failed']) status!: 'idle' | 'generating' | 'done' | 'failed';
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) imageUrls?: string[];
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => GameProgressItemDto) items?: GameProgressItemDto[];
  @IsOptional() @IsNumber() roundCount?: number;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() error?: string;
  @IsOptional() @IsString() themeId?: string;
  @IsOptional() @IsObject() themes?: Record<string, unknown>;
}

class ResetGameProgressDto {
  @IsOptional() @IsString() gameSlug?: string;
}

class DecorateRoomNodeDto {
  @IsString() id!: string;
  @IsString() parentId!: string | null;
  @IsString() request!: string;
  @IsString() url!: string;
}

class DecorateRoomThemeDraftDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DecorateRoomNodeDto)
  nodes!: DecorateRoomNodeDto[];
  @IsString() currentId!: string;
  @IsOptional() @IsString() savedAssetId?: string | null;
  @IsOptional() @IsNumber() nodeSeq?: number;
}

class SaveGameDraftDto {
  @IsString() gameSlug!: string;
  @IsOptional() @IsString() themeId?: string;
  @IsOptional() @ValidateNested() @Type(() => DecorateRoomThemeDraftDto) theme?: DecorateRoomThemeDraftDto;
  @IsOptional() @IsObject() themes?: Record<string, DecorateRoomThemeDraftDto>;
  @IsOptional() @IsString() activeThemeId?: string;
}

class SummaryAnswerDto {
  @IsString() questionId!: string;
  @IsOptional() @IsString() optionId?: string;
  @IsOptional() @IsString() optionLabel?: string;
  @IsOptional() @IsString() text?: string;
}

class ReportSummaryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SummaryAnswerDto)
  answers!: SummaryAnswerDto[];
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsBoolean() done?: boolean;
}

class VideoRecognitionAnswerDto {
  @IsString() questionId!: string;
  @IsOptional() @IsString() optionId?: string;
  @IsOptional() @IsString() optionLabel?: string;
}

class ReportVideoRecognitionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VideoRecognitionAnswerDto)
  answers!: VideoRecognitionAnswerDto[];
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsBoolean() done?: boolean;
}

class SetVideoRecognitionCurrentDto {
  @IsNumber() @Min(1) question!: number;
}

@ApiTags('course')
@Controller('course')
export class CourseController {
  constructor(private readonly svc: CourseService) {}

  /**
   * 教师中控台聚合状态：一次请求取回课堂 / 取消续费 / 抢组 / 创作进度 / 总结问答，
   * 替代前端 5+ 个并行轮询，显著降低多端同时在线时的请求量。
   * ?games=a,b,c 可选，过滤创作进度中的游戏。
   */
  @Get('console')
  @Roles('teacher', 'admin')
  getConsole(@Query('games') games?: string) {
    const slugs = games
      ? games.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    return this.svc.getConsoleState(slugs);
  }

  @Get('turing')
  @Roles('student', 'teacher', 'admin')
  getTuring() {
    return this.svc.getTuring();
  }

  @Put('turing')
  @Roles('teacher', 'admin')
  setTuring(@Body() dto: SetTuringDto) {
    return this.svc.setTuring(dto);
  }

  @Delete('turing')
  @Roles('teacher', 'admin')
  clearTuring() {
    return this.svc.clearTuring();
  }

  @Get('turing/bank')
  @Roles('teacher', 'admin')
  getTuringBank() {
    return this.svc.getTuringBank();
  }

  @Put('turing/bank')
  @Roles('teacher', 'admin')
  setTuringBank(@Body() dto: SetTuringBankDto) {
    return this.svc.setTuringBank(dto.slots);
  }

  @Post('turing/publish-slot')
  @Roles('teacher', 'admin')
  publishTuringSlot(@Body() dto: PublishTuringSlotDto) {
    return this.svc.publishTuringFromSlot(dto.slotId);
  }

  // ---- 课堂控屏 ----

  @Get('classroom')
  @Roles('student', 'teacher', 'admin')
  getClassroom() {
    return this.svc.getClassroom();
  }

  @Put('classroom')
  @Roles('teacher', 'admin')
  setClassroom(@Body() dto: SetClassroomDto, @CurrentUser() me: AuthUser) {
    return this.svc.setClassroom(me.id, dto);
  }

  @Delete('classroom')
  @Roles('teacher', 'admin')
  clearClassroom() {
    return this.svc.clearClassroom();
  }

  // ---- 「来取消续费吧」课堂游戏 ----

  @Get('cancel-sub')
  @Roles('student', 'teacher', 'admin')
  getCancelSub() {
    return this.svc.getCancelSub();
  }

  @Put('cancel-sub')
  @Roles('teacher', 'admin')
  startCancelSub(@CurrentUser() me: AuthUser) {
    return this.svc.startCancelSub(me.id);
  }

  @Post('cancel-sub/event')
  @Roles('student', 'teacher', 'admin')
  reportCancelSubEvent(@Body() dto: CancelSubEventDto, @CurrentUser() me: AuthUser) {
    return this.svc.reportCancelSubEvent(me.id, dto.displayName || me.displayName || me.username, dto.event);
  }

  @Delete('cancel-sub')
  @Roles('teacher', 'admin')
  clearCancelSub() {
    return this.svc.clearCancelSub();
  }

  // ---- 第 1 课 · 抢组活动 ----

  @Get('group-grab')
  @Roles('student', 'teacher', 'admin')
  getGroupGrab() {
    return this.svc.getGroupGrab();
  }

  @Put('group-grab')
  @Roles('teacher', 'admin')
  setupGroupGrab(@Body() dto: SetupGroupGrabDto, @CurrentUser() me: AuthUser) {
    return this.svc.setupGroupGrab(me.id, dto);
  }

  @Post('group-grab/start')
  @Roles('teacher', 'admin')
  startGroupGrab() {
    return this.svc.startGroupGrab();
  }

  @Post('group-grab/grab')
  @Roles('student', 'teacher', 'admin')
  grabGroup(@Body() dto: GrabGroupDto, @CurrentUser() me: AuthUser) {
    return this.svc.grabGroup(me.id, dto.displayName || me.displayName || me.username, dto.groupId);
  }

  @Post('group-grab/reassign')
  @Roles('teacher', 'admin')
  reassignGroupGrab() {
    return this.svc.reassignGroupGrab();
  }

  @Post('group-grab/assign')
  @Roles('teacher', 'admin')
  manualAssignGroupGrab(@Body() dto: ManualAssignGroupDto) {
    return this.svc.manualAssignGroupGrab(dto.studentId, dto.groupId, dto.displayName);
  }

  @Post('group-grab/close')
  @Roles('teacher', 'admin')
  closeGroupGrab() {
    return this.svc.closeGroupGrab();
  }

  @Post('group-grab/sync')
  @Roles('teacher', 'admin')
  syncGroupGrab() {
    return this.svc.syncGroupGrabToDb();
  }

  @Delete('group-grab')
  @Roles('teacher', 'admin')
  clearGroupGrab() {
    return this.svc.clearGroupGrab();
  }

  // ---- 课堂创作游戏进度 ----

  @Get('game-progress')
  @Roles('student', 'teacher', 'admin')
  getGameProgress(@Query('game') game?: string) {
    // 支持 ?game=a 或 ?game=a,b,c
    const slugs = game ? game.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    return this.svc.getGameProgress(slugs && slugs.length === 1 ? slugs[0] : slugs);
  }

  @Post('game-progress/report')
  @Roles('student', 'teacher', 'admin')
  reportGameProgress(@Body() dto: ReportGameProgressDto, @CurrentUser() me: AuthUser) {
    const { displayName, ...rest } = dto;
    return this.svc.reportGameProgress(me.id, displayName || me.displayName || me.username, rest as GameProgressReportInput);
  }

  @Post('game-progress/reset')
  @Roles('teacher', 'admin')
  resetGameProgress(@Body() dto: ResetGameProgressDto) {
    return this.svc.resetGameProgress(dto.gameSlug);
  }

  @Delete('game-progress')
  @Roles('teacher', 'admin')
  clearGameProgress() {
    return this.svc.clearGameProgress();
  }

  // ---- 游戏草稿（学生端持久化） ----

  @Get('game-draft')
  @Roles('student', 'teacher', 'admin')
  getGameDraft(@Query('game') game: string, @CurrentUser() me: AuthUser) {
    if (!game) throw new BadRequestException('缺少 game 参数');
    return this.svc.getGameDraft(me.id, game);
  }

  @Put('game-draft')
  @Roles('student', 'teacher', 'admin')
  saveGameDraft(@Body() dto: SaveGameDraftDto, @CurrentUser() me: AuthUser) {
    const { gameSlug, ...rest } = dto;
    return this.svc.saveGameDraft(me.id, gameSlug, rest);
  }

  // ---- 大侦探总结分享 · 问答 ----

  @Get('summary')
  @Roles('student', 'teacher', 'admin')
  getSummary() {
    return this.svc.getSummary();
  }

  @Post('summary/report')
  @Roles('student', 'teacher', 'admin')
  reportSummary(@Body() dto: ReportSummaryDto, @CurrentUser() me: AuthUser) {
    return this.svc.reportSummaryAnswers(
      me.id,
      dto.displayName || me.displayName || me.username,
      dto.answers,
      dto.done,
    );
  }

  @Post('summary/reset')
  @Roles('teacher', 'admin')
  resetSummary() {
    return this.svc.resetSummary();
  }

  @Delete('summary')
  @Roles('teacher', 'admin')
  clearSummary() {
    return this.svc.clearSummary();
  }

  // ---- AI 视频识别 · 课堂问答 ----

  @Get('video-recognition')
  @Roles('student', 'teacher', 'admin')
  getVideoRecognition() {
    return this.svc.getVideoRecognition();
  }

  @Post('video-recognition/report')
  @Roles('student', 'teacher', 'admin')
  reportVideoRecognition(@Body() dto: ReportVideoRecognitionDto, @CurrentUser() me: AuthUser) {
    return this.svc.reportVideoRecognitionAnswers(
      me.id,
      dto.displayName || me.displayName || me.username,
      dto.answers,
      dto.done,
    );
  }

  @Put('video-recognition/current')
  @Roles('teacher', 'admin')
  setVideoRecognitionCurrent(@Body() dto: SetVideoRecognitionCurrentDto) {
    return this.svc.setVideoRecognitionCurrentQuestion(dto.question);
  }

  @Post('video-recognition/reset')
  @Roles('teacher', 'admin')
  resetVideoRecognition() {
    return this.svc.resetVideoRecognition();
  }

  @Delete('video-recognition')
  @Roles('teacher', 'admin')
  clearVideoRecognition() {
    return this.svc.clearVideoRecognition();
  }
}
