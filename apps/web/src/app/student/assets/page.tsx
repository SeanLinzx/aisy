'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  ASSET_TABS,
  assetDisplayType,
  filterAssetsByTab,
  isHiddenInLibrary,
  isInteractiveWebAsset,
  parseAssetMeta,
  TAB_CREATE_LINK,
  type AssetTabKey,
} from '@/lib/asset-tabs';
import { resolveUploadPath } from '@/lib/upload-url';

export default function AssetsPage() {
  const [type, setType] = useState<AssetTabKey>('text');
  const [allItems, setAllItems] = useState<any[]>([]);
  const [featuredWebProjectId, setFeaturedWebProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [assets, homepage] = await Promise.all([
        api.get('/assets', { params: showHidden ? { showHidden: '1' } : {} }),
        api.get('/homepages/mine').catch(() => ({ data: null })),
      ]);
      setAllItems(assets.data || []);
      setFeaturedWebProjectId(homepage.data?.featuredWebProjectId ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [showHidden]);

  const items = useMemo(() => filterAssetsByTab(allItems, type), [allItems, type]);
  const createLink = TAB_CREATE_LINK[type];

  async function archive(id: string) {
    if (!confirm('归档这个素材？归档后将从素材库移除。')) return;
    await api.post(`/assets/${id}/archive`);
    load();
  }

  async function toggleHidden(id: string, hidden: boolean) {
    await api.post(`/assets/${id}/library-visibility`, { hidden });
    load();
  }

  async function setAsHomepage(assetId: string) {
    try {
      await api.post('/homepages/mine/featured-from-asset', { assetId });
      alert('已设为课程主页展示网页 ✅ 可在「我的主页」查看预览');
      load();
    } catch (e: unknown) {
      alert((e as Error)?.message || '设置失败');
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">📦 我的素材库</h1>
          <p className="text-slate-600 mt-1 text-sm">
            文字、图片、视频保存在对应分类；交互页、交互优化、创作网页等归入「网页」。可在网页工作台把其他网页插入为跳转链接。
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            className="rounded border-orange-300"
          />
          显示已隐藏素材
        </label>
      </header>
      <div className="flex flex-wrap gap-2">
        {ASSET_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`text-sm px-3 py-1.5 rounded-xl border ${type === t.key ? 'bg-brand text-white border-brand' : 'bg-white text-slate-700 border-orange-200 hover:bg-orange-50'}`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
      {loading && <div className="text-slate-500 text-sm">加载中…</div>}
      {!loading && items.length === 0 && (
        <div className="kid-card text-center text-slate-500 space-y-2">
          <div>{showHidden ? '这个分类没有素材（含隐藏）' : '这个分类还没有素材，去创作一个吧！'}</div>
          <Link href={createLink.href} className="text-brand font-bold text-sm inline-block">
            {createLink.label} →
          </Link>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((a) => {
          const isWeb = a.type === 'web';
          const meta = parseAssetMeta(a.meta);
          const isDecorate = meta?.kind === 'decorate-room';
          const isSession = meta?.kind === 'creation-session';
          const isPromptPair = meta?.kind === 'prompt-pair';
          const hidden = isHiddenInLibrary(a);
          const openUrl = isWeb && a.url ? a.url : null;
          const thumbSrc = a.thumbnailUrl || a.url;
          const thumb =
            thumbSrc && (a.type === 'image' || a.type === 'poster' || a.type === 'video' || isDecorate || isSession)
              ? resolveUploadPath(thumbSrc)
              : null;
          const isFeaturedWeb = isWeb && featuredWebProjectId && meta?.projectId === featuredWebProjectId;

          return (
            <div
              key={a.id}
              className={`kid-card !p-3 group ${isFeaturedWeb ? 'ring-2 ring-emerald-300 border-emerald-200' : ''} ${hidden ? 'opacity-70 border-dashed' : ''}`}
            >
              <div className="aspect-video bg-orange-50 rounded-xl flex items-center justify-center overflow-hidden">
                {isSession && thumb ? (
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                ) : isWeb ? (
                  <span className="text-5xl">{isSession || isInteractiveWebAsset(a) ? '👆' : '🌐'}</span>
                ) : isDecorate && !thumb ? (
                  <span className="text-5xl">🌳</span>
                ) : isPromptPair ? (
                  <span className="text-5xl">✨</span>
                ) : a.type === 'video' && thumb ? (
                  <video src={thumb} className="w-full h-full object-cover" muted playsInline />
                ) : thumb ? (
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                ) : a.type === 'ppt' ? (
                  <span className="text-5xl">📊</span>
                ) : (
                  <span className="text-slate-500 text-xs px-2 text-center">{a.title}</span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="font-semibold text-sm truncate flex-1">{a.title}</div>
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  {hidden && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">
                      已隐藏
                    </span>
                  )}
                  {isFeaturedWeb && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                      🏠 主页
                    </span>
                  )}
                  <span className="tag">{assetDisplayType(a)}</span>
                </div>
              </div>
              {a.summary && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{a.summary}</p>}
              {!isWeb && !isDecorate && a.content && (
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 whitespace-pre-wrap">{a.content}</p>
              )}
              <div className="mt-3 flex justify-end gap-3 text-xs flex-wrap">
                {openUrl && (
                  <Link href={openUrl} target="_blank" className="text-brand font-bold">
                    🌐 打开{isSession ? '创作页' : '网页'}
                  </Link>
                )}
                {isWeb && !isFeaturedWeb && (
                  <button type="button" onClick={() => setAsHomepage(a.id)} className="text-emerald-600 font-bold">
                    🏠 设为主页
                  </button>
                )}
                {a.type === 'ppt' && (
                  <a href={`/api/exports/ppt/${a.id}.pptx`} className="text-brand">
                    ⬇ .pptx
                  </a>
                )}
                {(a.type === 'poster' || a.type === 'image') && (
                  <a href={`/api/exports/poster/${a.id}.pdf`} className="text-brand">
                    ⬇ .pdf
                  </a>
                )}
                {a.url && !isWeb && (
                  <a href={resolveUploadPath(a.url)} target="_blank" rel="noreferrer" className="text-slate-500">
                    原文件
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => toggleHidden(a.id, !hidden)}
                  className="text-slate-500 hover:text-violet-600 font-bold"
                >
                  {hidden ? '取消隐藏' : '隐藏'}
                </button>
                <button onClick={() => archive(a.id)} className="text-slate-400 hover:text-rose-500">
                  归档
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
