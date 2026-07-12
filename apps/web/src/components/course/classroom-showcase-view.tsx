'use client';

import { resolveUploadPath } from '@/lib/upload-url';
import { isVideoShowcaseUrl, type ClassroomShowcase } from '@/lib/classroom-showcase';

function ShowcaseMedia({ showcase }: { showcase: ClassroomShowcase }) {
  const url = showcase.videoUrl || showcase.thumbnailUrl || showcase.imageUrls?.[0];
  if (!url) return null;

  if (isVideoShowcaseUrl(url) || showcase.videoUrl) {
    return (
      <video
        src={resolveUploadPath(showcase.videoUrl || url)}
        controls
        playsInline
        className="w-full max-h-[60vh] object-contain bg-black rounded-2xl"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveUploadPath(url)}
      alt=""
      className="w-full max-h-[60vh] object-contain rounded-2xl bg-slate-100"
    />
  );
}

export function ClassroomShowcaseView({
  showcase,
  variant = 'student',
}: {
  showcase: ClassroomShowcase;
  variant?: 'student' | 'teacher' | 'popup';
}) {
  const extraImages = (showcase.imageUrls || []).filter(
    (u) => u !== showcase.thumbnailUrl && u !== showcase.imageUrls?.[0],
  );

  const compact = variant === 'popup';

  return (
    <div className={variant === 'student' ? 'space-y-5 w-full min-w-0' : compact ? 'space-y-3' : 'space-y-4'}>
      {variant === 'student' && (
        <header className="text-center space-y-2">
          <div className="text-5xl animate-bounceSoft">🌟</div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-rainbow">
            老师邀请 {showcase.displayName} 分享作品！
          </h1>
          <p className="text-sm text-ink-soft font-semibold">
            大家一起欣赏这位小朋友的优秀创作，为他/她鼓掌吧 👏
          </p>
        </header>
      )}

      <div className={compact ? 'space-y-3' : 'kid-card-orange !p-5 md:!p-6 space-y-4'}>
        <div className="flex items-center gap-2 flex-wrap">
          {!compact && (
            <div className="kid-emoji-bubble bg-gradient-to-br from-amber-200 to-pink-300 text-2xl">
              🎨
            </div>
          )}
          <div>
            <div className={compact ? 'font-extrabold text-sm' : 'font-extrabold text-lg'}>{showcase.displayName}</div>
            <div className={compact ? 'text-[11px] text-ink-soft font-semibold' : 'text-sm text-ink-soft font-semibold'}>
              {showcase.title || showcase.gameTitle || '优秀作品'}
            </div>
          </div>
        </div>

        <div className={compact ? '[&_video]:max-h-[28vh] [&_img]:max-h-[28vh]' : undefined}>
          <ShowcaseMedia showcase={showcase} />
        </div>

        {extraImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {extraImages.map((url) => (
              <div key={url} className="rounded-xl overflow-hidden border-2 border-orange-100 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveUploadPath(url)} alt="" className="w-full aspect-square object-cover" />
              </div>
            ))}
          </div>
        )}

        {showcase.prompt && (
          <div className={compact ? 'rounded-xl bg-white border border-orange-100 px-3 py-2' : 'rounded-2xl bg-white border-2 border-orange-100 px-4 py-3'}>
            <div className="text-[10px] font-bold text-ink-soft mb-1">💡 创作提示词</div>
            <p className={compact ? 'text-[11px] leading-relaxed line-clamp-4' : 'text-sm leading-relaxed'}>{showcase.prompt}</p>
          </div>
        )}

        {(showcase.text || showcase.summary) && (
          <div className={compact ? 'rounded-xl bg-violet-50 border border-violet-100 px-3 py-2' : 'rounded-2xl bg-violet-50 border-2 border-violet-100 px-4 py-3'}>
            <div className="text-[10px] font-bold text-violet-700 mb-1">
              {showcase.source === 'summary' ? '🎤 分享内容' : '📝 作品说明'}
            </div>
            <p className={compact ? 'text-[11px] leading-relaxed whitespace-pre-wrap line-clamp-6' : 'text-sm leading-relaxed whitespace-pre-wrap'}>{showcase.text || showcase.summary}</p>
          </div>
        )}

        {variant === 'student' && (
          <p className="text-center text-xs text-ink-soft font-semibold pt-2">
            认真听 {showcase.displayName} 的分享，老师结束展示后会带你回到课堂 ✨
          </p>
        )}
      </div>
    </div>
  );
}
