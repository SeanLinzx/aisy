'use client';

import type { ReactNode } from 'react';
import { VideoThumbnail } from '@/components/video-thumbnail';
import { videoCoverImageSrc, videoSourceForCover } from '@/lib/video-cover';
import { cn } from '@/lib/cn';

export function VideoCover({
  asset,
  className,
  overlay,
}: {
  asset: { url?: string | null; thumbnailUrl?: string | null };
  className?: string;
  overlay?: ReactNode;
}) {
  const coverImg = videoCoverImageSrc(asset);
  const videoSrc = videoSourceForCover(asset);

  if (coverImg) {
    return (
      <div className={cn('relative w-full h-full', className)}>
        <img src={coverImg} alt="" className="w-full h-full object-cover pointer-events-none" />
        {overlay}
      </div>
    );
  }

  if (!videoSrc) return null;

  return (
    <div className={cn('relative w-full h-full', className)}>
      <VideoThumbnail src={videoSrc} />
      {overlay}
    </div>
  );
}
