'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { resolveVideoPlaybackUrl } from '@/lib/upload-url';

/** 用视频第一帧作封面缩略图（教师/学生素材库、弹窗预览等） */
export function VideoThumbnail({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const playbackSrc = useMemo(() => resolveVideoPlaybackUrl(src), [src]);
  const [poster, setPoster] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setPoster(null);
    setFailed(false);
    if (!playbackSrc) return;

    let cancelled = false;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const capture = () => {
      if (cancelled) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setFailed(true);
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        setPoster(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        setFailed(true);
      }
    };

    const seekToFirstFrame = () => {
      if (cancelled) return;
      try {
        const t = video.duration && Number.isFinite(video.duration) ? Math.min(0.1, video.duration * 0.02) : 0.1;
        if (video.currentTime < t) video.currentTime = t;
        else capture();
      } catch {
        capture();
      }
    };

    video.addEventListener('loadeddata', seekToFirstFrame);
    video.addEventListener('seeked', capture);
    video.addEventListener('error', () => {
      if (!cancelled) setFailed(true);
    });
    video.src = playbackSrc;
    video.load();

    return () => {
      cancelled = true;
      video.removeEventListener('loadeddata', seekToFirstFrame);
      video.removeEventListener('seeked', capture);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [playbackSrc]);

  if (poster) {
    return (
      <img
        src={poster}
        alt=""
        className={cn('w-full h-full object-cover pointer-events-none', className)}
      />
    );
  }

  if (failed) {
    return (
      <video
        src={`${playbackSrc}${playbackSrc.includes('#') ? '' : '#t=0.1'}`}
        className={cn('w-full h-full object-cover pointer-events-none', className)}
        muted
        playsInline
        preload="auto"
      />
    );
  }

  return <div className={cn('w-full h-full bg-orange-50 animate-pulse', className)} aria-hidden />;
}
