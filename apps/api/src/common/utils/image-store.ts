import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { request } from 'undici';
import { customAlphabet } from 'nanoid';

const nano = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

export function getUploadDir() {
  return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
}

export function getPublicUploadBase() {
  return (process.env.PUBLIC_UPLOAD_BASE || 'http://localhost:3001/uploads').replace(/\/+$/, '');
}

/** 解析 uploads 相对路径（支持 `/uploads/x.jpg`、完整 PUBLIC_UPLOAD_BASE URL、pathname）。 */
export function resolveUploadRelPath(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('/uploads/')) return url.slice('/uploads/'.length);

  const base = getPublicUploadBase();
  if (url.startsWith(`${base}/`)) return url.slice(base.length + 1);

  // 前端 basePath 部署时的相对路径，如 /aisy/uploads/xxx.jpg
  const basePathUpload = url.match(/^\/[^/]+\/uploads\/(.+)$/);
  if (basePathUpload) return basePathUpload[1];

  try {
    const { pathname } = new URL(url);
    if (pathname.startsWith('/uploads/')) return pathname.slice('/uploads/'.length);
    // 兼容旧域名 camp.creaite.cn 及 /aisy 子路径
    const legacy = pathname.match(/\/(?:aisy\/)?uploads\/(.+)$/);
    if (legacy) return legacy[1];
  } catch {
    // not a URL — try legacy pattern on raw string
    const legacy = url.match(/\/(?:aisy\/)?uploads\/(.+)$/);
    if (legacy) return legacy[1];
  }
  return null;
}

/** 将各种 uploads 路径规范化为可请求的绝对 URL。 */
export function toAbsoluteUploadUrl(url: string): string | null {
  const rel = resolveUploadRelPath(url);
  if (!rel) return null;
  return `${getPublicUploadBase()}/${rel}`;
}

const VIDEO_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
]);

/** 读取图片二进制，供方舟视频/图生图 inline base64 使用。 */
export async function readImageBytes(url: string): Promise<{ buf: Buffer; mime: string } | null> {
  if (!url) return null;

  if (url.startsWith('data:')) {
    const m = url.match(/^data:([^;]+);base64,(.+)$/s);
    if (!m || !m[2]) return null;
    const mime = m[1].toLowerCase();
    try {
      const buf = Buffer.from(m[2], 'base64');
      if (!buf.length) return null;
      return { buf, mime };
    } catch {
      return null;
    }
  }

  const local = readUploadFile(url);
  if (local?.buf.length) {
    const mime = (mimeFromExt(local.ext) || 'image/png').toLowerCase();
    return { buf: local.buf, mime };
  }

  const absUpload = toAbsoluteUploadUrl(url);
  const fetchTargets = [
    absUpload,
    /^https?:\/\//.test(url) ? url : null,
  ].filter(Boolean) as string[];

  for (const target of fetchTargets) {
    try {
      const res = await request(target, { method: 'GET' });
      if (res.statusCode >= 400) continue;
      const ct = String(res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const ab = await res.body.arrayBuffer();
      const buf = Buffer.from(ab);
      if (!buf.length) continue;
      const mime = ct && ct.startsWith('image/') ? ct : (mimeFromExt(extname(new URL(target).pathname)) || 'image/png');
      return { buf, mime: mime.toLowerCase() };
    } catch {
      // try next
    }
  }

  return null;
}

export function imageBytesToDataUri(buf: Buffer, mime: string): string {
  const normalized = mime.toLowerCase();
  return `data:${normalized};base64,${buf.toString('base64')}`;
}

export function assertVideoReferenceImageMime(mime: string, urlHint?: string): void {
  const m = mime.toLowerCase();
  if (m.includes('svg')) {
    throw new Error('视频参考图不支持 SVG 格式，请上传 JPG、PNG 或 WebP 图片。');
  }
  if (!VIDEO_IMAGE_MIMES.has(m) && !m.startsWith('image/')) {
    throw new Error(`无法识别参考图格式（${m || 'unknown'}）${urlHint ? `：${urlHint.slice(0, 80)}` : ''}，请换一张 JPG/PNG/WebP。`);
  }
}

/** 从本地上传目录读取文件（前端常传 `/uploads/xxx` 相对路径）。 */
export function readUploadFile(url: string): { buf: Buffer; ext: string } | null {
  const rel = resolveUploadRelPath(url);
  if (!rel) return null;
  const filePath = join(getUploadDir(), rel);
  if (!existsSync(filePath)) return null;
  return { buf: readFileSync(filePath), ext: extname(rel) };
}

export function mimeFromExt(ext: string): string | undefined {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    default:
      return undefined;
  }
}

function extFromMime(mime: string): string {
  if (mime.includes('svg')) return '.svg';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('mp4') || mime.includes('video')) return '.mp4';
  if (mime.includes('wav')) return '.wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
  return '.png';
}

async function readImageBuffer(url: string): Promise<{ buf: Buffer; ext: string } | null> {
  if (url.startsWith('data:')) {
    const m = url.match(/^data:([^;]+);base64,(.*)$/s);
    if (!m) return null;
    return { buf: Buffer.from(m[2], 'base64'), ext: extFromMime(m[1]) };
  }

  const local = readUploadFile(url);
  if (local) return local;

  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;

  const base = getPublicUploadBase();
  if (url.startsWith(base + '/') || url === base) return null;

  try {
    const res = await request(url, { method: 'GET' });
    if (res.statusCode >= 400) return null;
    const ab = await res.body.arrayBuffer();
    const contentType = String(res.headers['content-type'] || '');
    return { buf: Buffer.from(ab), ext: extFromMime(contentType) };
  } catch {
    return null;
  }
}

async function readMediaBuffer(url: string, defaultExt: string): Promise<{ buf: Buffer; ext: string } | null> {
  if (url.startsWith('data:')) {
    const m = url.match(/^data:([^;]+);base64,(.*)$/s);
    if (!m) return null;
    return { buf: Buffer.from(m[2], 'base64'), ext: extFromMime(m[1]) || defaultExt };
  }

  const local = readUploadFile(url);
  if (local) return local;

  if (!url.startsWith('http://') && !url.startsWith('https://')) return null;

  const base = getPublicUploadBase();
  if (url.startsWith(base + '/') || url === base) return null;

  try {
    const res = await request(url, { method: 'GET' });
    if (res.statusCode >= 400) return null;
    const ab = await res.body.arrayBuffer();
    const contentType = String(res.headers['content-type'] || '');
    return { buf: Buffer.from(ab), ext: extFromMime(contentType) || defaultExt };
  } catch {
    return null;
  }
}

/** Download or decode an image and store it under uploads/, returning a stable public URL. */
export async function persistImageUrl(url: string): Promise<string> {
  if (!url) return url;

  const base = getPublicUploadBase();
  if (url.startsWith(base + '/') || url === base) return url;

  const uploadDir = getUploadDir();
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  const image = await readImageBuffer(url);
  if (!image) return url;

  const filename = `${nano()}${image.ext}`;
  writeFileSync(join(uploadDir, filename), image.buf);
  return `${base}/${filename}`;
}

export async function persistImageUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map((u) => persistImageUrl(u)));
}

/** Download remote video (Ark signed URL expires in ~24h) and store under uploads/. */
export async function persistVideoUrl(url: string): Promise<string> {
  if (!url) return url;

  const base = getPublicUploadBase();
  if (url.startsWith(base + '/') || url === base) return url;
  if (url.startsWith('/uploads/')) return `${base}${url}`;

  const uploadDir = getUploadDir();
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  const media = await readMediaBuffer(url, '.mp4');
  if (!media) return url;

  const filename = `${nano()}${media.ext}`;
  writeFileSync(join(uploadDir, filename), media.buf);
  return `${base}/${filename}`;
}

/** Download remote audio and store under uploads/. */
export async function persistAudioUrl(url: string): Promise<string> {
  if (!url) return url;

  const base = getPublicUploadBase();
  if (url.startsWith(base + '/') || url === base) return url;
  if (url.startsWith('/uploads/')) return `${base}${url}`;

  const uploadDir = getUploadDir();
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  const media = await readMediaBuffer(url, '.mp3');
  if (!media) return url;

  const filename = `${nano()}${media.ext}`;
  writeFileSync(join(uploadDir, filename), media.buf);
  return `${base}/${filename}`;
}
