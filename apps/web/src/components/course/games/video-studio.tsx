'use client';

import { useEffect, useState } from 'react';
import { FreeCreateFlow } from '@/components/creative/free-create-flow';
import { FrameVideoGame } from '@/components/course/games/frame-video';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/contexts/language-context';
import { PICTURE_BOOK_IMPORT_FLAG } from '@/lib/director-pipeline';

type FreeMode = 'no-frame' | 'with-frame' | 'keyframe';

/** 第 4 课 · 自由生视频：无首帧 / 有首帧 / 首尾帧 */
export function VideoStudioGame() {
  const { tx } = useLanguage();
  const [mode, setMode] = useState<FreeMode>('no-frame');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'keyframe' || localStorage.getItem(PICTURE_BOOK_IMPORT_FLAG)) {
      setMode('keyframe');
    }
  }, []);

  return (
    <div className="w-full space-y-3">
      <div className="kid-card-yellow !py-3 !px-4">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          ✨ <strong>{tx('自由生视频')}</strong>
          {tx('：无首帧模式用文字直接描述画面；有首帧模式请')}
          <strong>{tx('先准备首帧图')}</strong>
          {tx('（可上传、选素材库或 AI 生图），再')}
          <strong>{tx('说明发生了什么')}</strong>
          {tx('；首尾帧模式上传多张关键帧，描述相邻两帧之间的动作，AI 生成过渡视频。填写完成后生成视频，作品会自动同步给老师看板。')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('no-frame')}
          className={cn(
            'text-sm px-4 py-2 rounded-xl font-bold border transition',
            mode === 'no-frame' ? 'bg-brand text-white border-brand' : 'bg-white border-orange-200 hover:bg-orange-50',
          )}
        >
          {tx('📝 无首帧')}
        </button>
        <button
          type="button"
          onClick={() => setMode('with-frame')}
          className={cn(
            'text-sm px-4 py-2 rounded-xl font-bold border transition',
            mode === 'with-frame' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white border-orange-200 hover:bg-violet-50',
          )}
        >
          {tx('🖼️ 有首帧')}
        </button>
        <button
          type="button"
          onClick={() => setMode('keyframe')}
          className={cn(
            'text-sm px-4 py-2 rounded-xl font-bold border transition',
            mode === 'keyframe' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-orange-200 hover:bg-emerald-50',
          )}
        >
          {tx('🎞️ 首尾帧')}
        </button>
      </div>

      {mode === 'no-frame' && (
        <FreeCreateFlow kind="video" progressSlug="video-studio" refImageMode="hidden" />
      )}
      {mode === 'with-frame' && (
        <FreeCreateFlow kind="video" progressSlug="video-studio" refImageMode="required" />
      )}
      {mode === 'keyframe' && (
        <FrameVideoGame progressSlug="video-studio" />
      )}
    </div>
  );
}
