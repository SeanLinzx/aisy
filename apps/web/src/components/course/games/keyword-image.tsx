'use client';
import { useState } from 'react';
import { generateImageWithQueue } from '@/lib/ai-generate-queue';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import {
  PromptKeywordPicker,
  KeywordPromptPreview,
  emptySelection,
  type KeywordSelection,
} from '@/components/prompt-keyword-picker';
import { AiProgress } from '@/components/course/ai-progress';
import { QueueReminder } from '@/components/queue-reminder';
import { StudentAssetLibraryEntry } from '@/components/student-asset-library-modal';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';
import { useLanguage } from '@/contexts/language-context';

export function KeywordImageGame() {
  const { tx } = useLanguage();
  const report = useReportGameProgress('keyword-image');
  const [keywords, setKeywords] = useState<KeywordSelection>(emptySelection());
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  async function gen() {
    if (!prompt.trim()) {
      setError('先点选几个关键词，拼出一句提示词吧！');
      return;
    }
    setLoading(true);
    setError(null);
    setUrls([]);
    setQueuePosition(null);
    void report({ status: 'generating', prompt: prompt.trim() });
    try {
      const r = await generateImageWithQueue(
        {
          prompt,
          saveAsAsset: true,
          options: { size: '1K', n: 1 },
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
    } catch (e: any) {
      const msg = e?.message || '生成失败';
      setError(msg);
      void report({ status: 'failed', prompt: prompt.trim(), error: msg });
    } finally {
      setLoading(false);
      setQueuePosition(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-pink">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          {tx('🧩 点选左边的关键词，也可以在每个模块里添加「我的词」；像搭积木一样拼出提示词，再让 AI 画出来！自定义词只保存在你的账号里。')}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="kid-card space-y-4">
          <PromptKeywordPicker
            selection={keywords}
            showInlinePreview={false}
            onChange={(sel, built) => {
              setKeywords(sel);
              setPrompt(built);
            }}
          />
          <div>
            <label className="text-sm font-bold">{tx('🪄 我的提示词（可以再改改）')}</label>
            <textarea
              className="kid-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={tx('点左边的关键词，这里会自动出现提示词')}
            />
          </div>
          <button onClick={gen} disabled={loading} className="kid-button-primary">
            {loading ? tx('🎨 AI 正在画…') : tx('✨ 让 AI 画一张')}
          </button>
          {loading && queuePosition != null && <QueueReminder position={queuePosition} kind="image" />}
          {loading && queuePosition == null && <AiProgress label={tx('AI 正在画你的图…')} />}
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {tx(error)}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <StudentAssetLibraryEntry defaultTab="image" hint={tx('查看以前画过的所有图片')} />

          <KeywordPromptPreview selection={keywords} prompt={prompt} />

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
