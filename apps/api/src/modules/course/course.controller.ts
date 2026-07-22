import { BadRequestException, Body, Controller, Delete, Get, MessageEvent, Param, Post, Put, Query, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CourseService, type GameProgressReportInput } from './course.service';
import { CourseStreamService } from './course-stream.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { BypassResponseWrap } from '../../common/decorators/bypass-response-wrap.decorator';
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

class ReportTuringDto {
  @IsString() sessionId!: string;
  @IsObject() picks!: Record<string, boolean>;
  @IsOptional() @IsString() displayName?: string;
}

class SlidesDto {
  @IsString() url!: string;
  @IsString() name!: string;
  @IsNumber() page!: number;
  @IsOptional() @IsIn(['pdf', 'deck']) kind?: 'pdf' | 'deck';
  @IsOptional() @IsBoolean() syncToStudents?: boolean;
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

class CampSongDto {
  @IsBoolean() active!: boolean;
  @IsNumber() startedAt!: number;
  @IsOptional() @IsBoolean() syncStudents?: boolean;
}

class SetClassroomDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() currentGame?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) students?: string[];
  @IsOptional() @IsIn(['game', 'slides', 'showcase']) mode?: 'game' | 'slides' | 'showcase';
  @IsOptional() @IsObject() slides?: SlidesDto | null;
  @IsOptional() @ValidateNested() @Type(() => ShowcaseDto) showcase?: ShowcaseDto | null;
  @IsOptional() @ValidateNested() @Type(() => CampSongDto) campSong?: CampSongDto | null;
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
  @IsOptional() @IsString() submitQuestionId?: string;
}

class SetVideoRecognitionCurrentDto {
  @IsNumber() @Min(1) question!: number;
}

class PublishVideoRecognitionQuestionDto {
  @IsIn(['single', 'compare']) template!: 'single' | 'compare';
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() videoTitle?: string;
  @IsOptional() @IsString() videoTopTitle?: string;
  @IsOptional() @IsString() videoBottomTitle?: string;
  @IsOptional() @IsString() videoHint?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() videoTopUrl?: string;
  @IsOptional() @IsString() videoBottomUrl?: string;
  @IsOptional() @IsString() emoji?: string;
  @IsOptional() @IsString() bg?: string;
  @IsString() correctOptionId!: string;
}

@ApiTags('course')
@Controller('course')
export class CourseController {
  constructor(
    private readonly svc: CourseService,
    private readonly stream: CourseStreamService,
  ) {}

  /**
   * 学生端聚合状态（REST 兜底轮询用）：一次请求取回 classroom / 抢组 /
   * 视频识别 / 图灵测试 / 取消续费全部快照，配合下面的 stream 端点使用。
   */
  @Get('stream/snapshot')
  @Roles('student', 'teacher', 'admin')
  getStreamSnapshot() {
    return this.svc.getStudentStreamSnapshot();
  }

  /**
   * 学生端聚合 SSE：一个长连接覆盖 classroom / 抢组 / 视频识别 / 图灵测试 /
   * 取消续费全部通道。机房场景下浏览器对同源 HTTP/1.1 并发连接数有限（通常 6 条），
   * 每个学生只开这一条常驻连接（而不是每个游戏各开一条），把连接压力降到最低，
   * 给图片/视频等普通请求留出足够并发余量。
   */
  @Sse('stream')
  @SkipThrottle()
  @BypassResponseWrap()
  @Roles('student', 'teacher', 'admin')
  streamStudent(): Observable<MessageEvent> {
    return this.stream.observeMany(
      ['classroom', 'groupGrab', 'videoRecognition', 'turing', 'cancelSub'],
      () => this.svc.getStudentStreamSnapshot(),
    );
  }

  /**
   * 教师中控台聚合 SSE：一个长连接替代 classroom / 游戏进度 / 抢组 / 取消续费 /
   * 总结问答 / 视频识别 / 图灵测试等一整套 3s 轮询。连接建立时发一次全量快照，
   * 之后老师或学生任何写操作都会在数百毫秒内推送增量过来。
   */
  @Sse('console/stream')
  @SkipThrottle()
  @BypassResponseWrap()
  @Roles('teacher', 'admin')
  streamConsole(@Query('games') games?: string): Observable<MessageEvent> {
    const slugs = games ? games.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    return this.stream.observeMany(
      ['classroom', 'gameProgress', 'cancelSub', 'groupGrab', 'summary', 'videoRecognition', 'turing', 'turingResponses'],
      async () => {
        const state = await this.svc.getConsoleState(slugs);
        return {
          classroom: state.classroom,
          gameProgress: state.gameProgress,
          cancelSub: state.cancelSub,
          groupGrab: state.groupGrab,
          summary: state.summary,
          videoRecognition: state.videoRecognition,
          turing: state.turing.active,
          turingResponses: state.turing.responses,
        };
      },
    );
  }

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

  /** SSE：老师发布新题时立即推给全班，替代学生端 5s 轮询 */
  @Sse('turing/stream')
  @SkipThrottle()
  @BypassResponseWrap()
  @Roles('student', 'teacher', 'admin')
  streamTuring(): Observable<MessageEvent> {
    return this.stream.observe('turing', () => this.svc.getTuring());
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

  @Get('turing/responses')
  @Roles('student', 'teacher', 'admin')
  getTuringResponses() {
    return this.svc.getTuringResponses();
  }

  @Post('turing/report')
  @Roles('student', 'teacher', 'admin')
  reportTuring(@Body() dto: ReportTuringDto, @CurrentUser() me: AuthUser) {
    return this.svc.reportTuringResponse(me.id, dto.displayName || me.displayName || me.username, {
      sessionId: dto.sessionId,
      picks: dto.picks,
    });
  }

  @Post('turing/responses/reset')
  @Roles('teacher', 'admin')
  resetTuringResponses() {
    return this.svc.resetTuringResponses();
  }

  // ---- 课堂控屏 ----

  @Get('classroom')
  @Roles('student', 'teacher', 'admin')
  getClassroom() {
    return this.svc.getClassroom();
  }

  /** SSE 推送课堂状态：老师写入后立即广播，替代学生端 3s 轮询 */
  @Sse('classroom/stream')
  @SkipThrottle()
  @BypassResponseWrap()
  @Roles('student', 'teacher', 'admin')
  streamClassroom(): Observable<MessageEvent> {
    return this.stream.observe('classroom', () => this.svc.getClassroom());
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

  /** SSE：老师开局 / 学生进度实时广播，替代学生端 5s 轮询 */
  @Sse('cancel-sub/stream')
  @SkipThrottle()
  @BypassResponseWrap()
  @Roles('student', 'teacher', 'admin')
  streamCancelSub(): Observable<MessageEvent> {
    return this.stream.observe('cancelSub', () => this.svc.getCancelSub());
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

  /** SSE：抢组名额实时广播，避免多人同时抢位时因轮询延迟看到过期名额 */
  @Sse('group-grab/stream')
  @SkipThrottle()
  @BypassResponseWrap()
  @Roles('student', 'teacher', 'admin')
  streamGroupGrab(): Observable<MessageEvent> {
    return this.stream.observe('groupGrab', () => this.svc.getGroupGrab());
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

  /** SSE：老师切换当前题目时立即推给全班，替代学生端 3s 轮询 */
  @Sse('video-recognition/stream')
  @SkipThrottle()
  @BypassResponseWrap()
  @Roles('student', 'teacher', 'admin')
  streamVideoRecognition(): Observable<MessageEvent> {
    return this.stream.observe('videoRecognition', () => this.svc.getVideoRecognition());
  }

  @Post('video-recognition/report')
  @Roles('student', 'teacher', 'admin')
  reportVideoRecognition(@Body() dto: ReportVideoRecognitionDto, @CurrentUser() me: AuthUser) {
    return this.svc.reportVideoRecognitionAnswers(
      me.id,
      dto.displayName || me.displayName || me.username,
      dto.answers,
      { done: dto.done, submitQuestionId: dto.submitQuestionId },
    );
  }

  @Put('video-recognition/current')
  @Roles('teacher', 'admin')
  setVideoRecognitionCurrent(@Body() dto: SetVideoRecognitionCurrentDto) {
    return this.svc.setVideoRecognitionCurrentQuestion(dto.question);
  }

  @Post('video-recognition/questions')
  @Roles('teacher', 'admin')
  publishVideoRecognitionQuestion(@Body() dto: PublishVideoRecognitionQuestionDto) {
    return this.svc.publishVideoRecognitionQuestion(dto);
  }

  @Delete('video-recognition/questions/:id')
  @Roles('teacher', 'admin')
  deleteVideoRecognitionQuestion(@Param('id') id: string) {
    return this.svc.deleteVideoRecognitionQuestion(id);
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
