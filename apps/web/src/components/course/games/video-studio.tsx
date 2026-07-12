'use client';

import { useState } from 'react';
import { FreeCreateFlow } from '@/components/creative/free-create-flow';
import { cn } from '@/lib/cn';

type FreeMode = 'no-frame' | 'with-frame';

/** 第 4 课 · 自由生视频：无首帧 / 有首帧 */
export function VideoStudioGame() {
  const [mode, setMode] = useState<FreeMode>('no-frame');

  return (
    <div className="w-full space-y-3">
      <div className="kid-card-yellow !py-3 !px-4">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          ✨ <strong>自由生视频</strong>：可以用文字直接描述画面（无首帧），也可以先上传一张图片再描述（有首帧）。
          填写描述后直接生成视频，作品会自动同步给老师看板。
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
          📝 无首帧
        </button>
        <button
          type="button"
          onClick={() => setMode('with-frame')}
          className={cn(
            'text-sm px-4 py-2 rounded-xl font-bold border transition',
            mode === 'with-frame' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white border-orange-200 hover:bg-violet-50',
          )}
        >
          🖼️ 有首帧
        </button>
      </div>

      {mode === 'no-frame' ? (
        <FreeCreateFlow kind="video" progressSlug="video-studio" refImageMode="hidden" />
      ) : (
        <FreeCreateFlow kind="video" progressSlug="video-studio" refImageMode="required" />
      )}
    </div>
  );
}
