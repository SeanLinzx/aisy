'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { HtmlPreview, type PickedElement } from '@/components/course/html-preview';
import { AiProgress } from '@/components/course/ai-progress';
import {
  buildIterationPrompt,
  friendlyApiError,
  loadPortfolioState,
  mergeHtml,
  persistPortfolio,
  type IterationTarget,
  type PortfolioForm,
  type PortfolioAsset,
} from './portfolio-shared';

export function PortfolioStudio() {
  const [form, setForm] = useState<PortfolioForm | null>(null);
  const [chosen, setChosen] = useState<PortfolioAsset[]>([]);
  const [html, setHtml] = useState('');
  const [iterateInstruction, setIterateInstruction] = useState('');
  const [iterTarget, setIterTarget] = useState<IterationTarget | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** play = 正常体验交互；pick = 点选元素给 AI 迭代 */
  const [previewMode, setPreviewMode] = useState<'play' | 'pick'>('play');
  const scriptRepairRef = useRef(false);

  useEffect(() => {
    loadPortfolioState()
      .then((state) => {
        setForm(state.form);
        setHtml(state.html);
        setProjectId(state.projectId);
        setAssetId(state.assetId);
        setPublishedSlug(state.publishedSlug);
        setSaved(state.hasSaved);
        const picked = state.assets.filter((a: PortfolioAsset) => state.selected[a.id]);
        setChosen(picked);
      })
      .catch(() => setError('加载作品集失败，请返回重新生成。'))
      .finally(() => setLoading(false));
  }, []);

  /** 旧版保存未拆分 script，导致 /p/slug 发布页按钮失效；进入 studio 时静默修复一次 */
  useEffect(() => {
    if (loading || scriptRepairRef.current || !html || !form || !projectId) return;
    if (!/<script[\s>]/i.test(html)) return;
    scriptRepairRef.current = true;
    void persistPortfolio({
      htmlContent: html,
      form,
      chosen,
      projectId,
      publishedSlug,
      assetId,
    }).catch(() => {});
  }, [loading, html, form, chosen, projectId, publishedSlug, assetId]);

  const pageUrl = publishedSlug ? `/p/${publishedSlug}` : null;

  const handleElementPick = useCallback((element: PickedElement) => {
    setIterTarget({ kind: 'element', element });
  }, []);

  const iterTargetLabel = useMemo(() => {
    if (iterTarget?.kind === 'page') return '整页';
    if (iterTarget?.kind === 'element') return iterTarget.element.hint;
    return null;
  }, [iterTarget]);

  async function applyIteration() {
    if (!iterateInstruction.trim() || !html || !iterTarget || !form) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const prompt = buildIterationPrompt(html, iterTarget, iterateInstruction);
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      const merged = mergeHtml(r.data);
      setHtml(merged);
      setIterateInstruction('');
      setIterTarget(null);
      setPreviewMode('play');
      setPreviewKey((k) => k + 1);

      const result = await persistPortfolio({
        htmlContent: merged,
        form,
        chosen,
        projectId,
        publishedSlug,
        assetId,
      });
      setProjectId(result.projectId);
      setPublishedSlug(result.slug);
      setAssetId(result.assetId);
      setSaved(true);
    } catch (e: unknown) {
      setError(friendlyApiError((e as Error)?.message || '迭代失败'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-ink-soft font-semibold">正在加载作品集…</div>;
  }

  if (!html || !form) {
    return (
      <div className="kid-card space-y-3">
        <p className="text-sm text-ink-soft">还没有作品集，请先去填写信息并生成。</p>
        <Link href="/student/course/g/portfolio" className="kid-button-primary inline-block !py-2 !px-4 text-sm">
          ← 返回 AI 作品集
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/student/course/g/portfolio" className="kid-button-ghost !py-2 !px-4 text-sm">
          ← 返回修改设置
        </Link>
        {pageUrl && (
          <Link href={pageUrl} target="_blank" className="kid-button-primary !py-2 !px-4 text-sm">
            🌐 打开作品集网页
          </Link>
        )}
      </div>

      {saved && pageUrl && (
        <div className="kid-card-mint space-y-2">
          <div className="font-extrabold text-emerald-800">✅ 作品集已保存！</div>
          <p className="text-sm text-ink-soft">
            已写入<b>「我的网页」</b>和素材库，并已设为课程主页展示页（可在「我的主页」修改）。
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/student/projects" className="kid-button-ghost !py-2 !px-4 text-sm">
              💻 我的网页
            </Link>
            <Link href="/student/assets" className="kid-button-ghost !py-2 !px-4 text-sm">
              📦 去素材库查看
            </Link>
          </div>
        </div>
      )}

      <div className="kid-card-purple space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold">🔄 预览与迭代微调</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPreviewMode('play');
                setIterTarget(null);
                setPreviewKey((k) => k + 1);
              }}
              className={`kid-button-sm border-2 ${previewMode === 'play' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-ink-soft border-emerald-200'}`}
            >
              👆 体验交互
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewMode('pick');
                setPreviewKey((k) => k + 1);
              }}
              className={`kid-button-sm border-2 ${previewMode === 'pick' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-ink-soft border-violet-200'}`}
            >
              🎯 点选修改
            </button>
          </div>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">
          {previewMode === 'play'
            ? <>默认是<b>体验模式</b>，可以像真实网页一样点击按钮、卡片和弹窗。想告诉 AI 改哪里时，再切换到「点选修改」。</>
            : <>点选模式下，<b>点击</b>你想改的地方（标题、卡片、背景等），或点「选中整页」，然后用语音/文字告诉 AI 怎么改。</>}
        </p>

        {previewMode === 'pick' && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIterTarget({ kind: 'page' })}
              className={`kid-button-sm border-2 ${iterTarget?.kind === 'page' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-ink-soft border-violet-200'}`}
            >
              🌐 选中整页
            </button>
            {iterTargetLabel && (
              <span className="text-xs font-bold text-violet-700 bg-violet-50 border-2 border-violet-100 rounded-full px-3 py-1.5 self-center">
                已选中：{iterTargetLabel}
              </span>
            )}
            {iterTarget && (
              <button
                type="button"
                onClick={() => {
                  setIterTarget(null);
                  setPreviewKey((k) => k + 1);
                }}
                className="kid-button-sm bg-white text-ink-soft border-2 border-orange-200"
              >
                取消选中
              </button>
            )}
          </div>
        )}

        <HtmlPreview
          key={`${previewKey}-${previewMode}`}
          html={html}
          height={640}
          interactive
          pickMode={previewMode === 'pick'}
          onPick={previewMode === 'pick' ? handleElementPick : undefined}
        />
        <p className="text-xs text-center font-semibold text-ink-soft">
          {previewMode === 'play' ? '↑ 现在可以正常点击页面里的按钮和卡片' : '↑ 鼠标移上去会高亮，点一下即可选中要改的部分'}
        </p>

        <div className="rounded-xl bg-white border-2 border-violet-100 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-sm font-bold">🎤 告诉 AI 要怎么改</label>
            <VoiceInputButton onResult={(t) => setIterateInstruction((p) => (p ? p + ' ' : '') + t)} />
          </div>
          <textarea
            className="kid-textarea !min-h-[72px]"
            value={iterateInstruction}
            onChange={(e) => setIterateInstruction(e.target.value)}
            placeholder={
              iterTarget?.kind === 'element'
                ? `例如：把这个${iterTarget.element.tag}的颜色改成蓝色，字再大一点`
                : iterTarget?.kind === 'page'
                  ? '例如：背景换成星空，标题改成「小明的奇妙 AI 世界」'
                  : '先点选要改的部分，或选中整页'
            }
          />
          <button
            onClick={applyIteration}
            disabled={busy || !iterateInstruction.trim() || !iterTarget}
            className="kid-button-primary w-full"
          >
            {busy ? '✨ AI 正在迭代并保存…' : '✨ 应用迭代（自动更新预览与素材库）'}
          </button>
        </div>
        {busy && <AiProgress label="AI 正在按你的要求迭代修改…" />}
        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
        )}
        <AiWarning extra="迭代后会自动保存到「我的网页」和素材库。可以多次点选不同部分，反复微调。" />
      </div>
    </div>
  );
}
