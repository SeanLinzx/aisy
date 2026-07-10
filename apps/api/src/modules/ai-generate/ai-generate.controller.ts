import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { JobType, JobTypes } from '../../common/enums';
import { AiGenerateService } from './ai-generate.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

class TextDto {
  @IsString() prompt!: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() providerName?: string;
  @IsOptional() @IsBoolean() saveAsAsset?: boolean;
  @IsOptional() @IsString() title?: string;
}

class WebDto extends TextDto {
  @IsOptional() @IsBoolean() interactive?: boolean;
}

class ImageDto extends TextDto {
  @IsOptional() @IsArray() references?: any[];
  @IsOptional() options?: { size?: string; n?: number; seed?: number; guidance_scale?: number; watermark?: boolean };
  @IsOptional() @IsString() originalPrompt?: string;
  @IsOptional() @IsIn(['guided', 'free']) mode?: 'guided' | 'free';
}

class MixedDto extends TextDto {
  @IsOptional() @IsArray() references?: any[];
}

class VideoDto extends MixedDto {
  @IsOptional() @IsNumber() duration?: number;
  @IsOptional() @IsString() ratio?: string;
  @IsOptional() @IsBoolean() generateAudio?: boolean;
  @IsOptional() @IsString() originalPrompt?: string;
  @IsOptional() @IsIn(['guided', 'free']) mode?: 'guided' | 'free';
}

class MusicDto {
  @IsString() lyrics!: string;
  @IsOptional() @IsString() genre?: string;
  @IsOptional() @IsString() mood?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() timbre?: string;
  @IsOptional() @IsNumber() duration?: number;
  @IsOptional() @IsString() title?: string;
}

class OptimizePromptDto {
  @IsString() rawInput!: string;
  @IsIn(['image', 'video']) target!: 'image' | 'video';
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() providerName?: string;
}

class SaveCreationSessionDto {
  @IsIn(['image', 'video']) kind!: 'image' | 'video';
  @IsString() title!: string;
  @IsString() rawPrompt!: string;
  @IsString() optimizedPrompt!: string;
  @IsOptional() imageUrls?: string[];
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() resultAssetId?: string;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() @IsBoolean() hidePromptInLibrary?: boolean;
}

class ListJobsQueryDto {
  @IsOptional()
  @IsIn(JobTypes)
  type?: JobType;
}

@ApiTags('ai-generate')
@Controller('ai-generate')
@Roles('student', 'teacher', 'admin')
export class AiGenerateController {
  constructor(private readonly svc: AiGenerateService) {}

  @Post('text')
  text(@Body() dto: TextDto, @CurrentUser() me: AuthUser) {
    return this.svc.generateText(me.id, dto);
  }

  @Post('image')
  image(@Body() dto: ImageDto, @CurrentUser() me: AuthUser) {
    return this.svc.generateImage(me.id, dto);
  }

  @Post('web')
  web(@Body() dto: WebDto, @CurrentUser() me: AuthUser) {
    return this.svc.generateWebPage(me.id, dto);
  }

  @Post('poster')
  poster(@Body() dto: TextDto, @CurrentUser() me: AuthUser) {
    return this.svc.generatePoster(me.id, dto);
  }

  @Post('ppt')
  ppt(@Body() dto: TextDto, @CurrentUser() me: AuthUser) {
    return this.svc.generatePpt(me.id, dto);
  }

  @Post('mixed')
  mixed(@Body() dto: MixedDto, @CurrentUser() me: AuthUser) {
    return this.svc.generateMixed(me.id, dto);
  }

  @Post('code')
  code(@Body() dto: TextDto, @CurrentUser() me: AuthUser) {
    return this.svc.generateCode(me.id, dto);
  }

  @Post('video')
  video(@Body() dto: VideoDto, @CurrentUser() me: AuthUser) {
    return this.svc.submitVideo(me.id, dto);
  }

  @Post('music')
  music(@Body() dto: MusicDto, @CurrentUser() me: AuthUser) {
    return this.svc.submitMusic(me.id, dto);
  }

  @Post('optimize-prompt')
  optimizePrompt(@Body() dto: OptimizePromptDto, @CurrentUser() me: AuthUser) {
    return this.svc.optimizePrompt(me.id, dto);
  }

  @Post('creation-sessions')
  saveCreationSession(@Body() dto: SaveCreationSessionDto, @CurrentUser() me: AuthUser) {
    return this.svc.saveCreationSession(me.id, dto);
  }

  @Get('jobs')
  jobs(@CurrentUser() me: AuthUser, @Query() q: ListJobsQueryDto) {
    return this.svc.listJobs(me.id, q.type);
  }

  @Get('jobs/:id')
  job(@Param('id') id: string) {
    return this.svc.getJob(id);
  }
}
