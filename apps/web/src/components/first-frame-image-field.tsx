'use client';

import { useState } from 'react';
import { ImageUpload } from '@/components/course/image-upload';
import { AiProgress } from '@/components/course/ai-progress';
import { QueueReminder } from '@/components/queue-reminder';
import { generateImageWithQueue } from '@/lib/ai-generate-queue';
import { resolveUploadPath } from '@/lib/upload-url';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/contexts/language-context';

type SourceTab = 'upload' | 'ai';

export function FirstFrameImageField({
  value,
  onChange,
  required = true,
}: {
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
}) {
  const { tx } = useLanguage();
  const [tab, setTab] = useState<SourceTab>('upload');
  const [imagePrompt, setImagePrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateFrame() {
    if (!imagePrompt.trim()) {
      setError(tx('请先描述首帧画面'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await generateImageWithQueue(
        {
          prompt: imagePrompt.trim(),
          mode: 'free',
          saveAsAsset: true,
          title: `${tx('首帧·')}${imagePrompt.trim().slice(0, 16)}`,
          options: { size: '1K', n: 1 },
        },
        setQueuePosition,
      );
      const url = r.imageUrls?.[0];
      if (!url) throw new Error(tx('未生成图片，请重试'));
      onChange(url);
      setQueuePosition(null);
    } catch (e: unknown) {
      setError((e as Error).message || tx('生图失败'));
      setQueuePosition(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={cn(
            'text-xs px-3 py-1.5 rounded-xl font-bold border transition',
            tab === 'upload' ? 'bg-brand text-white border-brand' : 'bg-white border-orange-200 text-slate-600',
          )}
        >
          {tx('📤 上传 / 素材库')}
        </button>
        <button
          type="button"
          onClick={() => setTab('ai')}
          className={cn(
            'text-xs px-3 py-1.5 rounded-xl font-bold border transition',
            tab === 'ai' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white border-violet-200 text-violet-700',
          )}
        >
          {tx('🎨 AI 生图')}
        </button>
      </div>

      {tab === 'upload' ? (
        <div className="max-w-[220px]">
          <ImageUpload
            value={value || null}
            onChange={onChange}
            label={tx('点这里选首帧图')}
            showAssetLibrary
          />
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            className="kid-textarea min-h-[80px] text-sm"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder={tx('描述首帧画面，例如：一只金毛小狗坐在洒满星光的沙滩上，抬头望着又大又圆的月亮')}
          />
          <button
            type="button"
            onClick={() => void generateFrame()}
            disabled={busy || !imagePrompt.trim()}
            className="kid-button-primary text-sm py-2"
          >
            {busy ? tx('正在生成首帧…') : tx('🎨 生成首帧图片')}
          </button>
          {busy && queuePosition != null && <QueueReminder position={queuePosition} kind="image" />}
          {busy && queuePosition == null && <AiProgress label={tx('AI 正在画首帧…')} estimate={tx('约 30 秒')} durationMs={30_000} />}
        </div>
      )}

      {value && (
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveUploadPath(value)}
            alt={tx('首帧预览')}
            className="w-20 h-20 rounded-xl object-cover border border-emerald-100 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-emerald-800">✅ {tx('首帧')}{required ? '' : tx('（可选）')}{tx('已准备好')}</div>
            <p className="text-xs text-emerald-700/80 mt-0.5">{tx('接下来在下方说明：在这张图的基础上，画面里发生了什么。')}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-bold text-rose-500 hover:text-rose-600 shrink-0"
          >
            {tx('清除')}
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
