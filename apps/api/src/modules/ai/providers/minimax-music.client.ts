import { Logger } from '@nestjs/common';
import { request } from 'undici';
import { persistHexAudio } from '../../../common/utils/image-store';
import { MusicClient, MusicGenerateInput, MusicTaskResult } from './music-client.types';

const API_BASE = 'https://api.minimaxi.com/v1/music_generation';

const GENRE_LABELS: Record<string, string> = {
  Pop: '流行',
  Folk: '民谣',
  'Chinese Style': '国风',
  Rock: '摇滚',
  Electronic: '电子',
  Jazz: '爵士',
  'GuFeng Music': '古风',
};

const MOOD_LABELS: Record<string, string> = {
  Happy: '快乐',
  'Dynamic/Energetic': '活力动感',
  'Calm/Relaxing': '舒缓平静',
  Romantic: '浪漫',
  'Inspirational/Hopeful': '励志希望',
  'Dreamy/Ethereal': '梦幻',
  'Groovy/Funky': '律动',
};

const GENDER_LABELS: Record<string, string> = {
  Female: '女声',
  Male: '男声',
};

const TIMBRE_LABELS: Record<string, string> = {
  Warm: '温暖音色',
  Bright: '明亮音色',
  Sweet_AUDIO_TIMBRE: '甜美音色',
  Cute_AUDIO_TIMBRE: '可爱音色',
  Powerful: '有力音色',
  Husky: '沙哑音色',
};

interface TaskRecord {
  input: MusicGenerateInput;
  status: MusicTaskResult['status'];
  audioUrl?: string;
  error?: string;
  raw?: any;
  promise?: Promise<void>;
}

function buildMusicPrompt(input: MusicGenerateInput): string {
  const parts: string[] = [];
  if (input.genre) parts.push(GENRE_LABELS[input.genre] || input.genre);
  if (input.mood) parts.push(MOOD_LABELS[input.mood] || input.mood);
  if (input.gender) parts.push(GENDER_LABELS[input.gender] || input.gender);
  if (input.timbre) parts.push(TIMBRE_LABELS[input.timbre] || input.timbre.replace(/_AUDIO_TIMBRE$/, ''));
  if (input.duration) parts.push(`约${input.duration}秒`);
  return parts.join(', ') || '流行音乐, 轻快';
}

export class MiniMaxMusicClient implements MusicClient {
  readonly providerName = 'minimax-music';
  private readonly logger = new Logger('MiniMaxMusic');
  private readonly apiKey: string;
  private readonly model: string;
  private readonly tasks = new Map<string, TaskRecord>();

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = (model || 'music-3.0').trim();
  }

  private async callMusicGeneration(input: MusicGenerateInput): Promise<any> {
    const body = {
      model: this.model,
      prompt: buildMusicPrompt(input),
      lyrics: input.lyrics.trim(),
      stream: false,
      output_format: 'hex',
      audio_setting: {
        sample_rate: 44100,
        bitrate: 256000,
        format: 'mp3',
      },
    };

    const res = await request(API_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      headersTimeout: 120_000,
      bodyTimeout: 300_000,
    });

    const text = await res.body.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`MiniMax 音乐 API 返回非 JSON: ${text.slice(0, 200)}`);
    }

    const statusCode = parsed?.base_resp?.status_code;
    if (res.statusCode >= 400 || (statusCode !== undefined && statusCode !== 0)) {
      const msg = parsed?.base_resp?.status_msg || text.slice(0, 200);
      throw new Error(`MiniMax 音乐 API 失败 (${statusCode ?? res.statusCode}): ${msg}`);
    }

    return parsed;
  }

  private startGeneration(taskId: string, input: MusicGenerateInput): void {
    const record = this.tasks.get(taskId);
    if (!record || record.promise) return;

    record.status = 'running';
    record.promise = (async () => {
      try {
        const resp = await this.callMusicGeneration(input);
        const dataStatus = Number(resp?.data?.status);
        const hexAudio = resp?.data?.audio;

        if (dataStatus === 2 && hexAudio) {
          const audioUrl = await persistHexAudio(hexAudio, '.mp3');
          record.status = 'succeeded';
          record.audioUrl = audioUrl;
          record.raw = resp;
          return;
        }

        if (dataStatus === 1) {
          throw new Error('MiniMax 音乐仍在合成中，请稍后重试');
        }

        throw new Error('MiniMax 音乐 API 未返回可用音频');
      } catch (e: any) {
        this.logger.error(`MiniMax music task ${taskId} failed: ${e?.message}`);
        record.status = 'failed';
        record.error = e?.message || '音乐生成失败';
      }
    })();
  }

  async submitSongTask(input: MusicGenerateInput): Promise<MusicTaskResult> {
    const taskId = `minimax_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.tasks.set(taskId, { input, status: 'queued' });
    this.startGeneration(taskId, input);
    return { taskId, status: 'queued' };
  }

  async pollSongTask(taskId: string, input?: MusicGenerateInput): Promise<MusicTaskResult> {
    let record = this.tasks.get(taskId);

    if (!record) {
      if (!input) {
        return { taskId, status: 'failed', error: '任务不存在或服务已重启，请重新提交' };
      }
      this.tasks.set(taskId, { input, status: 'queued' });
      record = this.tasks.get(taskId)!;
      this.startGeneration(taskId, input);
    }

    if (record.promise && record.status === 'running') {
      await Promise.race([
        record.promise,
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
    }

    return {
      taskId,
      status: record.status,
      audioUrl: record.audioUrl,
      error: record.error,
      raw: record.raw,
    };
  }
}
