'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiProgress } from '@/components/course/ai-progress';
import { FillBlankSentence, type FillBlankSpec } from '@/components/course/fill-blank-sentence';
import {
  TYPE_EMOJI,
  DEFAULT_FORM,
  buildPromptFromForm,
  buildAssetList,
  friendlyApiError,
  loadPortfolioState,
  mergeHtml,
  persistPortfolio,
  type PortfolioAsset,
  type PortfolioForm,
} from './portfolio-shared';

const SCENE_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['📍 这个作品集是给「', '」看的，主要想展示「', '」。'],
  blanks: [
    { key: 'audience', placeholder: '给谁看', quickOptions: ['给爸爸妈妈和老师看', '给同学和好朋友看'] },
    { key: 'goal', placeholder: '想展示什么', quickOptions: ['我这学期用 AI 做的所有创意作品', '我最喜欢的几个 AI 作品'] },
  ],
};

const LAYOUT_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['🧱 整体风格想要「', '」；页面最上面是「', '」；每个作品做成一张卡片，「', '」摆放展示。'],
  blanks: [
    { key: 'style', placeholder: '整体风格', quickOptions: ['活泼可爱、五彩缤纷的颜色', '简洁大方、清爽的颜色'] },
    { key: 'cover', placeholder: '最上面放什么', quickOptions: ['大标题和一段自我介绍', '大标题加上我的照片或头像'] },
    { key: 'cardLayout', placeholder: '卡片怎么摆', quickOptions: ['按作品类型（图片/文字/视频/网页）分类', '按完成时间从新到旧'] },
  ],
};

const INTERACTION_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['👆 当访客「', '」的时候，「', '」，页面就会「', '」。'],
  blanks: [
    { key: 'interactionRule', placeholder: '什么时候触发', quickOptions: ['鼠标移到卡片上，或用手指点一下卡片', '点击卡片上的「查看详情」按钮'] },
    { key: 'interactionAction', placeholder: '做出什么动作', quickOptions: ['卡片会轻轻放大、出现阴影，并显示作品名称', '卡片会翻转，背面显示作品介绍'] },
    { key: 'interactionFeedback', placeholder: '页面出现什么', quickOptions: ['再点一次可以弹出大图或播放视频', '弹出一个介绍窗口，讲讲这个作品是怎么做的'] },
  ],
};

export function PortfolioGame() {
  const router = useRouter();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<PortfolioForm>(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof PortfolioForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    loadPortfolioState()
      .then((state) => {
        setAssets(state.assets);
        setForm(state.form);
        setSelected(state.selected);
        setProjectId(state.projectId);
        setAssetId(state.assetId);
        setPublishedSlug(state.publishedSlug);
        setHasSaved(state.hasSaved);
      })
      .catch(() => {});
  }, []);

  const chosen = useMemo(() => assets.filter((a) => selected[a.id]), [assets, selected]);
  const pageUrl = publishedSlug ? `/p/${publishedSlug}` : null;

  function validateForm() {
    if (chosen.length === 0) {
      setError('先从下面挑几个你的作品吧！');
      return false;
    }
    if (!form.audience.trim() || !form.goal.trim()) {
      setError('场景部分的两个空都要填哦！');
      return false;
    }
    if (!form.style.trim() || !form.cover.trim() || !form.cardLayout.trim()) {
      setError('布局部分的三个空都要填哦！');
      return false;
    }
    if (!form.interactionRule.trim() || !form.interactionAction.trim() || !form.interactionFeedback.trim()) {
      setError('交互部分的三个空都要填哦！');
      return false;
    }
    return true;
  }

  async function generate() {
    if (!validateForm()) return;
    setBusy(true);
    setError(null);
    try {
      const prompt = buildPromptFromForm(form, buildAssetList(chosen));
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      const merged = mergeHtml(r.data);

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
      setHasSaved(true);

      router.push('/student/course/g/portfolio/studio');
    } catch (e: unknown) {
      setError(friendlyApiError((e as Error)?.message || '生成失败'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-mint">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🖼️ 从<b>素材库</b>挑选文字、图片、视频、网页等作品，分别填一句话说清楚<b>场景</b>、摆好<b>布局</b>、设计<b>交互</b>。点击生成后会进入<b>独立预览页</b>，AI 会使用你选中素材的真实内容与地址。
        </p>
      </div>

      {hasSaved && (
        <div className="kid-card-mint space-y-2">
          <div className="font-extrabold text-emerald-800">✅ 你已有作品集</div>
          <p className="text-sm text-ink-soft">可以继续微调，或重新填写下方信息生成新版本。</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/student/course/g/portfolio/studio" className="kid-button-primary !py-2 !px-4 text-sm">
              🔄 进入作品集预览页
            </Link>
            {pageUrl && (
              <Link href={pageUrl} target="_blank" className="kid-button-ghost !py-2 !px-4 text-sm">
                🌐 打开作品集网页
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="kid-card">
        <div className="text-sm font-bold mb-2">第一步：从素材库挑选作品（已选 {chosen.length} 个）</div>
        {assets.length === 0 ? (
          <div className="text-sm text-slate-400 space-y-2">
            <div>素材库里还没有可选作品，先去探索模式或前几节课创作一些吧！</div>
            <Link href="/student/assets" className="text-brand font-bold text-sm inline-block">
              📦 去素材库看看 →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-80 overflow-auto">
            {assets.map((a) => {
              const on = !!selected[a.id];
              const thumb = a.thumbnailUrl || a.url;
              const textPreview = (a.content || a.summary || '').trim().slice(0, 60);
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected((s) => ({ ...s, [a.id]: !s[a.id] }))}
                  className={`text-left rounded-2xl border-2 overflow-hidden bg-white transition ${on ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-orange-100'}`}
                >
                  <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden p-2">
                    {thumb && (a.type === 'image' || a.type === 'poster' || a.type === 'mixed') ? (
                      <img src={resolveUploadPath(thumb)} alt="" className="w-full h-full object-cover" />
                    ) : a.type === 'video' && a.url ? (
                      <video src={resolveUploadPath(a.url)} className="w-full h-full object-cover" />
                    ) : a.type === 'text' || a.type === 'ppt' ? (
                      <p className="text-[11px] text-slate-600 line-clamp-5 whitespace-pre-wrap px-1">{textPreview || '📝 文字作品'}</p>
                    ) : (
                      <span className="text-4xl">{TYPE_EMOJI[a.type] || '📁'}</span>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-bold truncate">
                      {TYPE_EMOJI[a.type]} {a.title}
                    </div>
                    {on && <div className="text-[11px] text-emerald-600 font-bold">已选 ✓</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="kid-card-orange space-y-3">
        <div className="text-sm font-bold">📍 第二步 · 填空描述场景</div>
        <p className="text-xs text-ink-soft">告诉 AI 这个作品集是给谁看的、想要展示什么。</p>
        <FillBlankSentence
          segments={SCENE_TEMPLATE.segments}
          blanks={SCENE_TEMPLATE.blanks}
          values={form as unknown as Record<string, string>}
          onChange={(k, v) => setField(k as keyof PortfolioForm, v)}
        />
      </div>

      <div className="kid-card-yellow space-y-3">
        <div className="text-sm font-bold">🧱 第三步 · 填空摆好布局</div>
        <p className="text-xs text-ink-soft">页面上要摆哪些区域？从上到下想清楚，再填空。</p>
        <FillBlankSentence
          segments={LAYOUT_TEMPLATE.segments}
          blanks={LAYOUT_TEMPLATE.blanks}
          values={form as unknown as Record<string, string>}
          onChange={(k, v) => setField(k as keyof PortfolioForm, v)}
        />
      </div>

      <div className="kid-card-sky space-y-3">
        <div className="text-sm font-bold">👆 第四步 · 填空设计交互</div>
        <p className="text-xs text-ink-soft">告诉 AI 作品集网页里要加入什么样的互动体验。</p>
        <FillBlankSentence
          segments={INTERACTION_TEMPLATE.segments}
          blanks={INTERACTION_TEMPLATE.blanks}
          values={form as unknown as Record<string, string>}
          onChange={(k, v) => setField(k as keyof PortfolioForm, v)}
        />
      </div>

      <div className="kid-card space-y-3">
        <button onClick={generate} disabled={busy} className="kid-button-primary w-full">
          {busy ? '✨ AI 正在制作并保存…' : '✨ 生成作品集'}
        </button>
        {busy && <AiProgress label="AI 正在制作你的作品集，完成后会打开预览页…" />}
        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
        )}
      </div>
    </div>
  );
}
