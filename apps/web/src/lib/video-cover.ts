import { resolveUploadPath } from '@/lib/upload-url';

/** 判断 thumbnailUrl 是否为可用的图片封面（而非误存的视频地址）。 */
export function isVideoThumbnailImage(thumbnailUrl?: string | null, videoUrl?: string | null): boolean {
  if (!thumbnailUrl?.trim()) return false;
  if (videoUrl && thumbnailUrl.trim() === videoUrl.trim()) return false;
  return /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(thumbnailUrl) || thumbnailUrl.includes('-frame.jpg');
}

export function videoCoverImageSrc(asset: { url?: string | null; thumbnailUrl?: string | null }): string | null {
  if (isVideoThumbnailImage(asset.thumbnailUrl, asset.url)) {
    return resolveUploadPath(asset.thumbnailUrl!);
  }
  return null;
}

export function videoSourceForCover(asset: { url?: string | null; thumbnailUrl?: string | null }): string | null {
  return asset.url || asset.thumbnailUrl || null;
}
