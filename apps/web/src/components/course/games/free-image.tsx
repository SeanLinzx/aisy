'use client';

import { useState } from 'react';
import { generateImageWithQueue } from '@/lib/ai-generate-queue';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { QueueReminder } from '@/components/queue-reminder';
import { ReferenceImageField } from '@/components/reference-image-field';
import { StudentAssetLibraryEntry } from '@/components/student-asset-library-modal';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';
import { useLanguage } from '@/contexts/language-context';

export function FreeImageGame() {
  const { tx } = useLanguage();
  const report = useReportGameProgress('free-image');
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1K');
  const [n, setN] = useState(1);
  const [refImage, setRefImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  async function gen() {
    if (!prompt.trim()) {
      setError('先用自己的话描述一下想画什么吧！');
      return;
    }
    setLoading(true);
    setError(null);
    setUrls([]);
    setQueuePosition(null);
    void report({ status: 'generating', prompt: prompt.trim() });
    try {
      const refs = refImage.trim() ? [{ type: 'image', url: refImage.trim() }] : undefined;
      const r = await generateImageWithQueue(
        {
          prompt: prompt.trim(),
          originalPrompt: prompt.trim(),
          mode: 'free',
          saveAsAsset: true,
          title: prompt.trim().slice(0, 24) || '自由生图',
          references: refs,
          options: { size, n },
        },
        setQueuePosition,
      );
      const nextUrls = r.imageUrls || [];
      setUrls(nextUrls);
      void report({
        status: 'done',
        prompt: prompt.trim(),
        imageUrls: nextUrls,
        thumbnailUrl: nextUrls[0],
      });
    } catch (e: unknown) {
      const msg = (e as Error).message || '生成失败';
      setError(msg);
      void report({ status: 'failed', prompt: prompt.trim(), error: msg });
    } finally {
      setLoading(false);
      setQueuePosition(null);
    }
  }

  return (
    <div className="space-y-4">
      {loading && queuePosition != null && (
        <QueueReminder position={queuePosition} kind="image" />
      )}
      {loading && queuePosition == null && (
        <AiProgress label={tx('AI 正在画你的图…')} className="sticky top-2 z-10 shadow-sm" />
      )}

      <div className="kid-card-pink">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          {tx('不用点关键词，直接用你自己的话描述想画什么——越具体越好！左边写下想法，右边会显示 AI 画出来的作品。')}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="kid-card space-y-4">
          <div>
            <label className="text-sm font-bold">{tx('💭 我想画什么？')}</label>
            <textarea
              className="kid-textarea min-h-[120px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：一只在彩虹上跳舞的小猫，背景是星空，水彩风格"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold">{tx('尺寸')}</label>
              <select className="kid-input mt-2" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="1K">{tx('1K 标清（更快，推荐）')}</option>
                <option value="2K">{tx('2K 高清')}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold">{tx('张数')}</label>
              <select className="kid-input mt-2" value={n} onChange={(e) => setN(Number(e.target.value))}>
                <option value={1}>{tx('1 张')}</option>
                <option value={2}>{tx('2 张')}</option>
              </select>
            </div>
          </div>
          <ReferenceImageField value={refImage} onChange={setRefImage} />
          <button onClick={gen} disabled={loading} className="kid-button-primary">
            {loading ? tx('🎨 AI 正在画…') : tx('✨ 让 AI 画一张')}
          </button>
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {tx(error)}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <StudentAssetLibraryEntry defaultTab="image" hint={tx('查看以前画过的所有图片')} />

          {prompt.trim() && (
            <div className="kid-card">
              <h3 className="font-bold mb-2 text-sm">{tx('📝 你的想法')}</h3>
              <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{prompt}</p>
            </div>
          )}

          {(urls.length > 0 || loading) && (
            <div className="kid-card">
              <h3 className="font-bold mb-3">{tx('🖼️ 你的作品')}</h3>
              {loading && <div className="text-slate-500 text-sm">{tx('⏳ 画师正在画…')}</div>}
              <div className="grid gap-3">
                {urls.map((u) => (
                  <a key={u} href={resolveUploadPath(u)} target="_blank" rel="noreferrer">
                    <img src={resolveUploadPath(u)} alt="ai" className="w-full rounded-2xl border border-orange-100" />
                  </a>
                ))}
              </div>
              {urls.length > 0 && (
                <div className="mt-4">
                  <AiWarning />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
