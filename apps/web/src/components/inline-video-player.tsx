'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { resolveUploadPath, resolveVideoPlaybackUrl } from '@/lib/upload-url';
import { downloadMedia } from '@/lib/media-actions';

/** 页内视频播放：同源路径 + mp4 source，Windows 兼容性更好；失败时提供下载/新窗口兜底 */
export function InlineVideoPlayer({
  src,
  className,
  height = 'h-72',
  title = 'AI 视频',
}: {
  src: string;
  className?: string;
  /** Tailwind 高度 class，如 h-48 / h-72 / h-80 */
  height?: string;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);
  const playbackSrc = useMemo(() => resolveVideoPlaybackUrl(src), [src]);
  const openHref = useMemo(() => resolveVideoPlaybackUrl(src), [src]);
  const rawPath = resolveUploadPath(src);

  if (!src) return null;

  if (failed) {
    return (
      <div
        className={cn(
          'rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center gap-3 p-4 text-center',
          height,
          className,
        )}
      >
        <div className="text-3xl">🎬</div>
        <p className="text-sm font-semibold leading-relaxed max-w-xs">
          浏览器暂时无法在这里播放，可以下载或在新的窗口里打开试试（Windows 上有时需要这样）。
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={() => void downloadMedia(src, `${title}.mp4`)}
            className="kid-button-sm bg-brand text-white border-brand"
          >
            ⬇ 下载视频
          </button>
          <a
            href={openHref}
            target="_blank"
            rel="noopener noreferrer"
            className="kid-button-sm bg-white text-ink border-2 border-white"
          >
            ↗ 新窗口播放
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-black overflow-hidden relative', height, className)}>
      <video
        key={playbackSrc}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full object-contain bg-black"
        onError={() => setFailed(true)}
      >
        <source src={playbackSrc} type="video/mp4" />
        <source src={rawPath.startsWith('/') ? rawPath : playbackSrc} type="video/mp4" />
      </video>
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition">
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-bold bg-black/60 text-white px-2 py-1 rounded-lg"
        >
          ↗ 新窗口
        </a>
      </div>
    </div>
  );
}
