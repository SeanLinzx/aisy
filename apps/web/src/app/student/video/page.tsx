'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExploreToolHeader } from '@/components/explore-tool-header';
import { VideoStudioPanel } from '@/components/creative/video-studio-panel';

function VideoPageContent() {
  const searchParams = useSearchParams();
  const fromCourse = searchParams.get('from') === 'course';
  const lessonSlug = searchParams.get('lesson') || 'lesson3';
  const modeParam = searchParams.get('mode');
  const backHref = fromCourse ? `/student/course/${lessonSlug}` : '/student/explore';
  const backLabel = fromCourse ? '← 返回课程' : '← 返回探索模式';
  const initialMode = modeParam === 'free' ? 'free' : 'guided';

  return (
    <div className="space-y-6">
      <ExploreToolHeader
        title="🎬 AI 生成视频"
        desc={
          fromCourse
            ? '课程第 4 课配套工具：模板提交视频任务，或自由生视频（填写描述后直接生成）。'
            : '用模板快速提交任务，或使用「自由生视频」—— 填写描述后直接生成，可保存完整创作网页到「我的网页」。'
        }
        backHref={backHref}
        backLabel={backLabel}
      />
      <VideoStudioPanel
        progressSlug="video-guided"
        freeProgressSlug="video-free"
        initialMode={initialMode}
        refImageSeed={searchParams.get('refImage') || undefined}
      />
    </div>
  );
}

export default function VideoPage() {
  return (
    <Suspense fallback={<div className="text-slate-500 p-6">加载中…</div>}>
      <VideoPageContent />
    </Suspense>
  );
}
