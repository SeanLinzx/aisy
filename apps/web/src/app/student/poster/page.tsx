'use client';

import { useMemo, useState } from 'react';
import { api, apiDownloadHref } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { PromptTemplates } from '@/components/prompt-templates';
import { AiProgress } from '@/components/course/ai-progress';
import { ExploreToolHeader } from '@/components/explore-tool-header';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/cn';
import {
  buildPosterPrompt,
  DEFAULT_POSTER_FORM,
  getPosterDevice,
  getPosterRatio,
  isPosterFormReady,
  POSTER_DEVICES,
  POSTER_RATIOS,
  posterFormFromTemplatePrompt,
  type PosterFormFields,
} from '@/lib/poster-form';

export default function PosterPage() {
  const { tx } = useLanguage();
  const [form, setForm] = useState<PosterFormFields>(DEFAULT_POSTER_FORM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imageUrl?: string; html?: string; asset?: { id: string } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ratio = useMemo(() => getPosterRatio(form.ratio), [form.ratio]);
  const device = useMemo(() => getPosterDevice(form.device), [form.device]);
  const canGenerate = isPosterFormReady(form);

  function patch(partial: Partial<PosterFormFields>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function gen() {
    const prompt = buildPosterPrompt(form);
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.post('/ai-generate/poster', {
        prompt,
        title: form.title.trim() || form.headline.trim().slice(0, 24) || 'AI 海报',
      });
      setResult(r.data);
    } catch (e: unknown) {
      setError((e as Error)?.message || tx('生成失败'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <ExploreToolHeader
        title={tx('🖼️ AI 生成海报')}
        desc={tx('先选海报比例和展示设备，再填写内容细节，AI 会帮你生成可预览、可打印的海报网页。')}
      />

      <div className="kid-card space-y-6">
        <section className="space-y-3">
          <div>
            <div className="text-sm font-extrabold">{tx('① 海报比例')}</div>
            <p className="text-xs text-ink-soft mt-0.5">{tx('决定海报是竖版、横版还是方形')}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {POSTER_RATIOS.map((r) => {
              const active = form.ratio === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => patch({ ratio: r.id })}
                  className={cn(
                    'rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5',
                    active
                      ? 'border-violet-500 bg-violet-50 shadow-pop-sm'
                      : 'border-orange-100 bg-white hover:border-violet-200',
                  )}
                >
                  <div
                    className={cn(
                      'mx-auto mb-2 rounded-lg border-2 bg-gradient-to-br from-orange-100 to-pink-100',
                      r.aspectClass,
                      active ? 'border-violet-400' : 'border-orange-200',
                      'max-w-[56px]',
                    )}
                  />
                  <div className="font-bold text-sm">{tx(r.label)}</div>
                  <div className="text-[10px] text-ink-soft mt-0.5 leading-snug">{tx(r.hint)}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <div className="text-sm font-extrabold">{tx('② 展示设备')}</div>
            <p className="text-xs text-ink-soft mt-0.5">{tx('海报主要在哪里展示？AI 会调整字号和排版')}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {POSTER_DEVICES.map((d) => {
              const active = form.device === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => patch({ device: d.id })}
                  className={cn(
                    'rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5',
                    active
                      ? 'border-sky-500 bg-sky-50 shadow-pop-sm'
                      : 'border-orange-100 bg-white hover:border-sky-200',
                  )}
                >
                  <div className="text-2xl mb-1">{d.emoji}</div>
                  <div className="font-bold text-sm">{tx(d.label)}</div>
                  <div className="text-[10px] text-ink-soft mt-0.5 leading-snug">{tx(d.hint)}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 pt-2 border-t border-orange-100">
          <div>
            <div className="text-sm font-extrabold">{tx('③ 填写内容细节')}</div>
            <p className="text-xs text-ink-soft mt-0.5">
              {tx('已选：')}
              <strong>{tx(ratio.label)}</strong>
              {' · '}
              <strong>{device.emoji} {tx(device.label)}</strong>
            </p>
          </div>

          <PromptTemplates
            category="poster"
            onPick={(t) => {
              const partial = posterFormFromTemplatePrompt(t.prompt, t.name);
              patch(partial);
            }}
          />

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">{tx('海报主题 / 标题')}</span>
            <input
              className="kid-input w-full"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={tx('例如：暑假儿童画展')}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">{tx('主宣传语 / 口号')}</span>
            <input
              className="kid-input w-full"
              value={form.headline}
              onChange={(e) => patch({ headline: e.target.value })}
              placeholder={tx('例如：每一幅画都是一颗会发光的小星星')}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">{tx('详细内容')}</span>
            <textarea
              className="kid-textarea !min-h-[100px]"
              value={form.details}
              onChange={(e) => patch({ details: e.target.value })}
              placeholder={tx('活动时间、地点、参与对象、活动亮点、联系方式等')}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">{tx('风格与配色')}</span>
              <input
                className="kid-input w-full"
                value={form.style}
                onChange={(e) => patch({ style: e.target.value })}
                placeholder={tx('例如：橙黄色、活泼可爱、手绘风')}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">{tx('其他补充（可选）')}</span>
              <input
                className="kid-input w-full"
                value={form.extra}
                onChange={(e) => patch({ extra: e.target.value })}
                placeholder={tx('例如：要有二维码区域、留报名处')}
              />
            </label>
          </div>
        </section>

        <button
          type="button"
          onClick={gen}
          disabled={loading || !canGenerate}
          className="kid-button-primary w-full sm:w-auto"
        >
          {loading ? tx('生成中…') : tx('✨ 生成海报')}
        </button>
        {!canGenerate && (
          <p className="text-xs text-ink-soft">{tx('请至少填写「标题」「宣传语」或「详细内容」中的一项。')}</p>
        )}
        {loading && <AiProgress label={tx('AI 正在做海报…')} />}
        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
        )}
      </div>

      {result && (
        <div className="kid-card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-semibold">{tx('海报效果')}</h3>
              <p className="text-xs text-ink-soft mt-0.5">
                {tx(ratio.label)} · {device.emoji} {tx(device.label)}
              </p>
            </div>
            {result.asset?.id && (
              <a href={apiDownloadHref(`/exports/poster/${result.asset.id}.pdf`)} className="kid-button-primary text-sm">
                {tx('⬇️ 下载 PDF')}
              </a>
            )}
          </div>
          {result.imageUrl && (
            <div className={cn('mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-orange-100', ratio.aspectClass)}>
              <img src={result.imageUrl} alt="poster" className="h-full w-full object-cover" />
            </div>
          )}
          {result.html && (
            <div className={cn('mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-orange-100 bg-white shadow-sm', ratio.aspectClass)}>
              <iframe
                sandbox="allow-scripts"
                srcDoc={result.html}
                title="poster-preview"
                className="h-full w-full min-h-[320px]"
              />
            </div>
          )}
          <AiWarning />
        </div>
      )}
    </div>
  );
}
