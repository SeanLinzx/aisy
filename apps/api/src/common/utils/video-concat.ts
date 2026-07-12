import { execFile } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { customAlphabet } from 'nanoid';
import { getPublicUploadBase, getUploadDir, resolveUploadRelPath } from './image-store';

const execFileAsync = promisify(execFile);
const nano = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

function resolveLocalVideoPath(url: string): string {
  const rel = resolveUploadRelPath(url);
  if (!rel) throw new Error(`无法解析视频路径：${url.slice(0, 80)}`);
  const filePath = join(getUploadDir(), rel);
  if (!existsSync(filePath)) throw new Error(`视频文件不存在，请确认各段视频已生成完成：${url.slice(0, 80)}`);
  return filePath;
}

function escapeConcatPath(filePath: string): string {
  return filePath.replace(/'/g, "'\\''");
}

/** 将多段本地 mp4 按顺序拼接为一条视频，返回 uploads 公网 URL。 */
export async function concatVideoFiles(videoUrls: string[]): Promise<string> {
  if (videoUrls.length < 2) {
    throw new Error('至少需要 2 段视频才能拼接');
  }

  const localPaths = videoUrls.map(resolveLocalVideoPath);
  const tempDir = join(tmpdir(), `video-concat-${nano()}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    const listFile = join(tempDir, 'list.txt');
    const listContent = localPaths.map((p) => `file '${escapeConcatPath(p)}'`).join('\n');
    writeFileSync(listFile, listContent, 'utf8');

    const uploadDir = getUploadDir();
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const outFilename = `${nano()}-merged.mp4`;
    const outPath = join(uploadDir, outFilename);
    const ffmpegBin = process.env.FFMPEG_PATH || 'ffmpeg';
    const baseArgs = ['-y', '-f', 'concat', '-safe', '0', '-i', listFile];

    try {
      await execFileAsync(ffmpegBin, [...baseArgs, '-c', 'copy', outPath], { timeout: 120_000 });
    } catch {
      await execFileAsync(
        ffmpegBin,
        [
          ...baseArgs,
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '23',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          outPath,
        ],
        { timeout: 300_000 },
      );
    }

    if (!existsSync(outPath)) {
      throw new Error('视频拼接失败，请稍后重试');
    }

    return `${getPublicUploadBase()}/${outFilename}`;
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
}
