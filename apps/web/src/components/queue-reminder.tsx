'use client';

import { useLanguage } from '@/contexts/language-context';

/**
 * 排队提醒：生图 / 生视频并发达到上限时展示，告诉学生"前面还有 XX 人"，
 * 随着排在前面的人陆续完成，position 会自动减少直到 0（即将开始）。
 */
export function QueueReminder({ position, kind = 'image' }: { position: number; kind?: 'image' | 'video' }) {
  const { t, locale } = useLanguage();
  const noun = kind === 'image'
    ? (locale === 'en' ? 'drawing' : '画画')
    : (locale === 'en' ? 'making videos' : '生成视频');

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-700">
      {position > 0 ? (
        locale === 'en' ? (
          <>⏳ Lots of kids are creating right now! <span className="text-base">{position}</span> {position === 1 ? 'person' : 'people'} ahead of you {noun}. Hang tight — it will start automatically!</>
        ) : (
          <>⏳ 当前排队人数较多，前面还有 <span className="text-base">{position}</span> 位同学在{noun}，请耐心等待，轮到你会自动开始～</>
        )
      ) : (
        <>{t('queue.almost', '⏳ 马上就轮到你啦，请稍候…')}</>
      )}
    </div>
  );
}
