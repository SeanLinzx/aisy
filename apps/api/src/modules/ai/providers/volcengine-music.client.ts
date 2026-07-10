import { Logger } from '@nestjs/common';
import { request } from 'undici';
import { signVolcengineOpenApiRequest } from '../../../common/utils/volcengine-sign';

export interface MusicGenerateInput {
  lyrics: string;
  genre?: string;
  mood?: string;
  gender?: string;
  timbre?: string;
  duration?: number;
}

export interface MusicTaskResult {
  taskId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  audioUrl?: string;
  error?: string;
  raw?: any;
}

const HOST = 'open.volcengineapi.com';
const PATH = '/';
const VERSION = '2024-08-12';

export class VolcengineMusicClient {
  private readonly logger = new Logger('VolcengineMusic');

  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string,
  ) {}

  private async call(action: string, body: Record<string, unknown>): Promise<any> {
    const query = `Action=${action}&Version=${VERSION}`;
    const payload = JSON.stringify(body);
    const signed = signVolcengineOpenApiRequest({
      accessKey: this.accessKey,
      secretKey: this.secretKey,
      method: 'POST',
      path: PATH,
      query,
      body: payload,
    });

    const url = `https://${HOST}${PATH}?${query}`;
    const res = await request(url, {
      method: 'POST',
      headers: {
        authorization: signed.authorization,
        'content-type': signed['content-type'],
        host: signed.host,
        'x-date': signed['x-date'],
        'x-content-sha256': signed['x-content-sha256'],
      },
      body: payload,
    });

    const text = await res.body.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`豆包音乐 API 返回非 JSON: ${text.slice(0, 200)}`);
    }

    if (res.statusCode >= 400 || (parsed?.Code !== undefined && parsed.Code !== 0 && parsed.Code !== '0')) {
      const msg = parsed?.Message || parsed?.ResponseMetadata?.Error || text.slice(0, 200);
      throw new Error(`豆包音乐 API 失败 (${res.statusCode}): ${msg}`);
    }
    return parsed;
  }

  async submitSongTask(input: MusicGenerateInput): Promise<MusicTaskResult> {
    const body: Record<string, unknown> = {
      Lyrics: input.lyrics.trim(),
    };
    if (input.genre) body.Genre = input.genre;
    if (input.mood) body.Mood = input.mood;
    if (input.gender) body.Gender = input.gender;
    if (input.timbre) body.Timbre = input.timbre;
    if (input.duration) body.Duration = input.duration;

    const resp = await this.call('GenSongV4', body);
    const taskId = resp?.Result?.TaskID;
    if (!taskId) {
      this.logger.error(`GenSongV4 missing TaskID: ${JSON.stringify(resp).slice(0, 300)}`);
      throw new Error('豆包音乐 API 未返回任务 ID');
    }
    return { taskId, status: 'queued', raw: resp };
  }

  async pollSongTask(taskId: string): Promise<MusicTaskResult> {
    const resp = await this.call('QuerySong', { TaskID: taskId });
    const result = resp?.Result ?? {};
    const statusCode = Number(result.Status);
    const song = result.SongDetail ?? {};

    if (statusCode === 2) {
      return {
        taskId,
        status: 'succeeded',
        audioUrl: song.AudioUrl,
        raw: resp,
      };
    }
    if (statusCode === 3) {
      const reason = result.FailureReason?.Msg || result.FailureReason?.Code || '音乐生成失败';
      return { taskId, status: 'failed', error: String(reason), raw: resp };
    }
    if (statusCode === 0) return { taskId, status: 'queued', raw: resp };
    return { taskId, status: 'running', raw: resp };
  }
}

/** Mock client for local dev without VOLC AK/SK. */
export class MockMusicClient {
  private readonly tasks = new Map<string, { createdAt: number; lyrics: string }>();

  async submitSongTask(input: MusicGenerateInput): Promise<MusicTaskResult> {
    const taskId = `mock_music_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.tasks.set(taskId, { createdAt: Date.now(), lyrics: input.lyrics });
    return { taskId, status: 'queued' };
  }

  async pollSongTask(taskId: string): Promise<MusicTaskResult> {
    const task = this.tasks.get(taskId);
    if (!task) return { taskId, status: 'failed', error: '任务不存在' };
    const elapsed = Date.now() - task.createdAt;
    if (elapsed < 3000) return { taskId, status: 'queued' };
    if (elapsed < 6000) return { taskId, status: 'running' };
    return {
      taskId,
      status: 'succeeded',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    };
  }
}

export function createMusicClient(): VolcengineMusicClient | MockMusicClient {
  const ak = process.env.VOLC_ACCESS_KEY?.trim();
  const sk = process.env.VOLC_SECRET_KEY?.trim();
  if (ak && sk) return new VolcengineMusicClient(ak, sk);
  return new MockMusicClient();
}
