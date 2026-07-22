'use client';

import { useLanguage } from '@/contexts/language-context';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PublishedPageLink } from '@/components/published-page-link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AI_GENERATE_WEB_PROGRESS_MS, AI_GENERATE_WEB_TIMEOUT_MS } from '@/lib/ai-generate-timeouts';
import { mergeWebHtml } from '@/lib/merge-web-html';
import { postProcessWebAppHtml, repairLeakedScriptText } from '@/lib/pm-app-ai-wiring';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiProgress } from '@/components/course/ai-progress';
import { FillBlankSentence, type FillBlankSpec } from '@/components/course/fill-blank-sentence';
import {
  TYPE_EMOJI,
  DEFAULT_FORM,
  TYPE_LAYOUT_OPTION,
  buildPromptFromForm,
  buildAssetList,
  enrichChosenPortfolioAssets,
  applyDeterministicPortfolioWorks,
  finalizePortfolioNavigation,
  summarizeChosenByType,
  friendlyApiError,
  loadPortfolioState,
  persistPortfolio,
  filterPortfolioAssetsByTab,
  countPortfolioAssetsByTab,
  type PortfolioAsset,
  type PortfolioForm,
  type PortfolioAssetFilterKey,
} from './portfolio-shared';
import { getAssetTabs, getTabCreateLink, type AssetTabKey } from '@/lib/asset-tabs';

const LAYOUT_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['🧱 整体风格想要「', '」；页面最上面是「', '」；每个作品做成一张卡片，「', '」摆放展示。'],
  blanks: [
    {
      key: 'style',
      placeholder: '整体风格',
      quickOptions: ['活泼可爱、五彩缤纷的颜色', '简洁大方、清爽的颜色', '像侦探档案一样神秘酷炫'],
    },
    {
      key: 'cover',
      placeholder: '最上面放什么',
      quickOptions: ['大标题和一段自我介绍', '大标题加上我的照片或头像', '大标题、自我介绍和本学期收获'],
    },
    {
      key: 'cardLayout',
      placeholder: '卡片怎么摆',
      quickOptions: [
        TYPE_LAYOUT_OPTION,
        '按完成时间从新到旧',
        '大卡片展示重点作品，小卡片展示其他',
      ],
    },
  ],
};

const INTERACTION_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['👆 当访客「', '」的时候，「', '」，页面就会「', '」。'],
  blanks: [
    {
      key: 'interactionRule',
      placeholder: '什么时候触发',
      quickOptions: ['鼠标移到卡片上，或用手指点一下卡片', '点击卡片上的「查看详情」按钮', '双击卡片'],
    },
    {
      key: 'interactionAction',
      placeholder: '做出什么动作',
      quickOptions: [
        '卡片会轻轻放大、出现阴影，并显示作品名称',
        '卡片会翻转，背面显示作品介绍',
        '卡片会发光并播放清脆音效',
      ],
    },
    {
      key: 'interactionFeedback',
      placeholder: '页面出现什么',
      quickOptions: [
        '再点一次可以弹出大图或播放视频',
        '弹出一个介绍窗口，讲讲这个作品是怎么做的',
        '显示作品创作时间和一句鼓励的话',
      ],
    },
  ],
};

const CONFIG_STEPS = [
  {
    label: '① 选作品',
    title: '📦 第一步 · 从素材库挑选作品',
    cardClass: 'kid-card',
    hint: '点一下卡片就能选中或取消，至少选 1 个作品才能继续。可按类别筛选素材；选中的作品会全部放进作品集。',
  },
  {
    label: '② 摆布局',
    title: '🧱 第二步 · 填空摆好布局',
    cardClass: 'kid-card-yellow',
    hint: '想清楚页面上要摆哪些区域，从上到下填空描述。',
  },
  {
    label: '③ 设交互',
    title: '👆 第三步 · 填空设计交互',
    cardClass: 'kid-card-sky',
    hint: '告诉 AI 作品集网页里要加入什么样的互动体验。',
  },
] as const;

export function PortfolioGame() {
  const { tx, locale } = useLanguage();
  const router = useRouter();
  const assetTabs = useMemo(() => getAssetTabs(locale), [locale]);
  const tabCreateLink = useMemo(() => getTabCreateLink(locale), [locale]);
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [assetFilter, setAssetFilter] = useState<PortfolioAssetFilterKey>('all');
  const [form, setForm] = useState<PortfolioForm>(DEFAULT_FORM);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chosen = useMemo(() => assets.filter((a) => selected[a.id]), [assets, selected]);
  const filteredAssets = useMemo(
    () => filterPortfolioAssetsByTab(assets, assetFilter),
    [assets, assetFilter],
  );
  const tabCounts = useMemo(() => countPortfolioAssetsByTab(assets, assetTabs), [assets, assetTabs]);
  const current = CONFIG_STEPS[step];
  const isFirstStep = step === 0;
  const isLastStep = step === CONFIG_STEPS.length - 1;

  function validateStep(stepIndex: number): boolean {
    if (stepIndex === 0) {
      if (chosen.length === 0) {
        setError('先从素材库挑几个你的作品吧！');
        return false;
      }
      return true;
    }
    if (stepIndex === 1) {
      if (!form.style.trim() || !form.cover.trim() || !form.cardLayout.trim()) {
        setError('布局部分的三个空都要填哦！');
        return false;
      }
      return true;
    }
    if (stepIndex === 2) {
      if (!form.interactionRule.trim() || !form.interactionAction.trim() || !form.interactionFeedback.trim()) {
        setError('交互部分的三个空都要填哦！');
        return false;
      }
      return true;
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setError(null);
    // 离开选作品步时回到「全部」，避免筛选分类让人误以为只选了一类
    if (step === 0) setAssetFilter('all');
    setStep((s) => s + 1);
  }

  function goToStep(target: number) {
    if (target <= step) {
      setError(null);
      setStep(target);
      return;
    }
    for (let i = step; i < target; i++) {
      if (!validateStep(i)) return;
    }
    setError(null);
    setStep(target);
  }

  async function generate() {
    if (!validateStep(step)) return;
    setBusy(true);
    setError(null);
    try {
      const enriched = await enrichChosenPortfolioAssets(chosen);
      const prompt = buildPromptFromForm(
        form,
        buildAssetList(enriched, form.cardLayout),
        enriched.length,
        enriched,
      );
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: AI_GENERATE_WEB_TIMEOUT_MS });
      // AI 只做封面/风格/交互壳；全部选中作品由代码按类型写入（字符串注入，避免 DOMParser 拆坏 script）
      const shell = repairLeakedScriptText(mergeWebHtml(r.data));
      const merged = postProcessWebAppHtml(
        finalizePortfolioNavigation(
          applyDeterministicPortfolioWorks(shell, enriched, form.cardLayout),
          enriched,
        ),
      );

      const result = await persistPortfolio({
        htmlContent: merged,
        form,
        chosen: enriched,
        projectId,
        publishedSlug,
        assetId,
        versionNotes: '重新生成作品集',
      });
      setProjectId(result.projectId);
      setPublishedSlug(result.slug);
      setAssetId(result.assetId);
      setHasSaved(true);

      router.push('/studio/portfolio');
    } catch (e: unknown) {
      setError(friendlyApiError((e as Error)?.message || '生成失败'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="kid-card-mint !p-6 text-center space-y-2">
        <div className="text-base font-extrabold text-ink">🖼️ {tx('正在加载 AI 作品集…')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasSaved && (
        <div className="kid-card-mint space-y-2">
          <div className="font-extrabold text-emerald-800">{tx('✅ 你已有作品集')}</div>
          <p className="text-sm text-ink-soft">{tx('可以继续微调，或按下面步骤重新填写生成新版本。')}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/studio/portfolio" className="kid-button-primary !py-2 !px-4 text-sm">
              🔄 {tx('进入作品集预览页')}
            </Link>
            {publishedSlug && (
              <PublishedPageLink slug={publishedSlug} className="kid-button-ghost !py-2 !px-4 text-sm">
                🌐 {tx('打开作品集网页')}
              </PublishedPageLink>
            )}
          </div>
        </div>
      )}

      <div className="kid-card-mint !p-4 space-y-1">
        <div className="text-base font-extrabold text-ink">🖼️ {tx('AI 作品集')}</div>
        <p className="text-sm font-bold text-brand-dark">
          {tx('从素材库挑选作品 + 填空说清楚布局、交互 = 一键生成我的作品展示页')}
        </p>
        <p className="text-xs font-semibold text-ink-soft leading-relaxed">
          {tx('分三步完成：')}<b>{tx('选作品')}</b>、<b>{tx('摆布局')}</b>、<b>{tx('设交互')}</b>
          {tx('。选中的作品会全部放进作品集。每一步填完点「下一步」，也可以返回上一步修改。没有合适选项？点')}<b>{tx('「➕ 自己写一个」')}</b>{tx('即可新增。')}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {CONFIG_STEPS.map((s, i) => {
          const active = step === i;
          const visited = i < step;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => goToStep(i)}
              className={`px-3 py-1.5 rounded-full font-bold border transition ${
                active
                  ? 'bg-brand text-white border-brand'
                  : visited
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300'
                    : 'bg-white text-slate-500 border-orange-100 hover:border-orange-200'
              }`}
            >
              {tx(s.label)}
            </button>
          );
        })}
      </div>

      <div className={`${current.cardClass} !p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold">{tx(current.title)}</div>
          <span className="text-xs font-bold text-ink-soft shrink-0">
            {step + 1} / {CONFIG_STEPS.length}
          </span>
        </div>
        {current.hint && <p className="text-xs font-semibold text-ink-soft">{tx(current.hint)}</p>}

        {step === 0 && (
          <>
            <div className="text-xs font-bold text-ink-soft space-y-1">
              <div>
                {tx('已选')} {chosen.length} {tx('个')}
                {chosen.length > 0 && (
                  <span className="font-semibold text-emerald-700">
                    {' '}
                    （{summarizeChosenByType(chosen)}）
                  </span>
                )}
                {assetFilter !== 'all' && (
                  <span className="font-semibold text-ink-soft/80">
                    {' '}
                    · {tx('当前分类')} {filteredAssets.length} {tx('个')}
                    {' · '}
                    {tx('切换分类可继续多选，已选不会被清空')}
                  </span>
                )}
              </div>
            </div>
            {assets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setAssetFilter('all')}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition ${
                    assetFilter === 'all'
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-slate-700 border-orange-200 hover:bg-orange-50'
                  }`}
                >
                  📦 {tx('全部')} ({tabCounts.all})
                </button>
                {assetTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setAssetFilter(t.key)}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition ${
                      assetFilter === t.key
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-slate-700 border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    {t.emoji} {t.label} ({tabCounts[t.key as AssetTabKey]})
                  </button>
                ))}
              </div>
            )}
            {assets.length === 0 ? (
              <div className="text-sm text-slate-400 space-y-2">
                <div>{tx('素材库里还没有可选作品，先去探索模式或前几节课创作一些吧！')}</div>
                <Link href="/student/assets" className="text-brand font-bold text-sm inline-block">
                  📦 {tx('去素材库看看 →')}
                </Link>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-sm text-slate-500 space-y-2">
                <div>{tx('这个分类还没有作品，试试其他分类吧！')}</div>
                {assetFilter !== 'all' && (
                  <Link
                    href={tabCreateLink[assetFilter as AssetTabKey].href}
                    className="text-brand font-bold text-sm inline-block"
                  >
                    {tabCreateLink[assetFilter as AssetTabKey].label} →
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-80 overflow-auto">
                {filteredAssets.map((a) => {
                  const on = !!selected[a.id];
                  const thumb = a.thumbnailUrl || a.url;
                  const textPreview = (a.content || a.summary || '').trim().slice(0, 60);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelected((s) => ({ ...s, [a.id]: !s[a.id] }))}
                      className={`text-left rounded-2xl border-2 overflow-hidden bg-white transition ${on ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-orange-100'}`}
                    >
                      <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden p-2">
                        {thumb && (a.type === 'image' || a.type === 'poster' || a.type === 'mixed') ? (
                          <img src={resolveUploadPath(thumb)} alt="" className="w-full h-full object-cover" />
                        ) : a.type === 'video' && a.url ? (
                          <video src={resolveUploadPath(a.url)} className="w-full h-full object-cover" />
                        ) : a.type === 'text' || a.type === 'ppt' ? (
                          <p className="text-[11px] text-slate-600 line-clamp-5 whitespace-pre-wrap px-1">
                            {textPreview || '📝 文字作品'}
                          </p>
                        ) : (
                          <span className="text-4xl">{TYPE_EMOJI[a.type] || '📁'}</span>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-bold truncate">
                          {TYPE_EMOJI[a.type]} {a.title}
                        </div>
                        {on && <div className="text-[11px] text-emerald-600 font-bold">{tx('已选 ✓')}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <FillBlankSentence
            segments={LAYOUT_TEMPLATE.segments}
            blanks={LAYOUT_TEMPLATE.blanks}
            values={form as unknown as Record<string, string>}
            onChange={(k, v) => setField(k as keyof PortfolioForm, v)}
          />
        )}

        {step === 2 && (
          <FillBlankSentence
            segments={INTERACTION_TEMPLATE.segments}
            blanks={INTERACTION_TEMPLATE.blanks}
            values={form as unknown as Record<string, string>}
            onChange={(k, v) => setField(k as keyof PortfolioForm, v)}
          />
        )}
      </div>

      <div className="kid-card !p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {!isFirstStep && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep((s) => s - 1);
              }}
              className="kid-button-ghost !py-2 !px-4 text-sm"
            >
              ← {tx('上一步')}
            </button>
          )}
          {!isLastStep ? (
            <button type="button" onClick={goNext} className="kid-button-primary !py-2 !px-4 text-sm ml-auto">
              {tx('下一步 →')}
            </button>
          ) : (
            <button onClick={generate} disabled={busy} className="kid-button-primary !py-2 !px-4 text-sm ml-auto">
              {busy ? '✨ AI 正在制作…' : '✨ 生成作品集'}
            </button>
          )}
        </div>
        {busy && (
          <AiProgress
            label={tx('AI 正在制作你的作品集，完成后会打开预览页…')}
            estimate="平均约 3 分钟"
            durationMs={AI_GENERATE_WEB_PROGRESS_MS}
          />
        )}
        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {tx(error)}
          </div>
        )}
      </div>
    </div>
  );
}
