'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/language-context';
import { getAssetTabs, getTabCreateLink, type AssetTabKey } from '@/lib/asset-tabs';
import { resolveUploadPath } from '@/lib/upload-url';
import {
  TYPE_EMOJI,
  filterPortfolioAssetsByTab,
  summarizeChosenByType,
  type PortfolioAsset,
  type PortfolioAssetFilterKey,
} from './portfolio-shared';

/**
 * 作品集编辑页：从素材库增删本页收录的作品。
 * 只改「作品集收录清单 + 预览作品区」，不走 AI 对话，也不删除素材库原文件。
 */
export function PortfolioAssetsPanel({
  library,
  chosen,
  busy,
  onChangeChosen,
  onApply,
}: {
  library: PortfolioAsset[];
  chosen: PortfolioAsset[];
  busy?: boolean;
  onChangeChosen: (next: PortfolioAsset[]) => void;
  onApply: () => void;
}) {
  const { tx, locale } = useLanguage();
  const assetTabs = useMemo(() => getAssetTabs(locale), [locale]);
  const tabCreateLink = useMemo(() => getTabCreateLink(locale), [locale]);
  const [filter, setFilter] = useState<PortfolioAssetFilterKey>('all');
  const [dirty, setDirty] = useState(false);

  const chosenIds = useMemo(() => new Set(chosen.map((a) => a.id)), [chosen]);
  const filtered = useMemo(() => filterPortfolioAssetsByTab(library, filter), [library, filter]);

  function toggle(asset: PortfolioAsset) {
    if (busy) return;
    setDirty(true);
    if (chosenIds.has(asset.id)) {
      onChangeChosen(chosen.filter((a) => a.id !== asset.id));
    } else {
      onChangeChosen([...chosen, asset]);
    }
  }

  function removeOne(id: string) {
    if (busy) return;
    setDirty(true);
    onChangeChosen(chosen.filter((a) => a.id !== id));
  }

  return (
    <div className="kid-card !p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-extrabold text-ink">📦 {tx('作品素材（素材库）')}</div>
          <p className="text-xs font-semibold text-ink-soft mt-1 leading-relaxed">
            {tx('在这里从素材库增加或去掉作品，只更新作品集收录清单与预览。')}
            <b className="text-ink"> {tx('不会删除素材库里的原文件')}</b>
            {tx('；改封面/交互请用上方预览区右侧的 AI 对话框。')}
          </p>
        </div>
        <button
          type="button"
          disabled={busy || !dirty || chosen.length === 0}
          onClick={() => {
            onApply();
            setDirty(false);
          }}
          className="kid-button-primary !py-2 !px-4 text-sm shrink-0"
        >
          {busy ? tx('保存中…') : tx('💾 保存素材变更')}
        </button>
      </div>

      <div className="text-xs font-bold text-ink-soft">
        {tx('已收录')} {chosen.length} {tx('个')}
        {chosen.length > 0 && (
          <span className="text-emerald-700 font-semibold"> （{summarizeChosenByType(chosen)}）</span>
        )}
        {dirty && <span className="text-amber-600 font-bold"> · {tx('有未保存的更改')}</span>}
      </div>

      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-2.5 py-1"
            >
              {TYPE_EMOJI[a.type] || '📁'} {a.title}
              <button
                type="button"
                disabled={busy}
                onClick={() => removeOne(a.id)}
                className="text-emerald-500 hover:text-rose-600"
                aria-label={tx('从作品集移除')}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition ${
            filter === 'all' ? 'bg-brand text-white border-brand' : 'bg-white border-orange-200'
          }`}
        >
          📦 {tx('全部')} ({library.length})
        </button>
        {assetTabs.map((t) => {
          const count = filterPortfolioAssetsByTab(library, t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition ${
                filter === t.key ? 'bg-brand text-white border-brand' : 'bg-white border-orange-200'
              }`}
            >
              {t.emoji} {t.label} ({count})
            </button>
          );
        })}
      </div>

      {library.length === 0 ? (
        <p className="text-sm text-slate-500">
          {tx('素材库还是空的。')}{' '}
          <Link href="/student/assets" className="text-brand font-bold">
            {tx('去素材库看看 →')}
          </Link>
        </p>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-500 space-y-1">
          <div>{tx('这个分类还没有作品，试试其他分类吧！')}</div>
          {filter !== 'all' && (
            <Link
              href={tabCreateLink[filter as AssetTabKey].href}
              className="text-brand font-bold text-sm inline-block"
            >
              {tabCreateLink[filter as AssetTabKey].label} →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-52 overflow-auto">
          {filtered.map((a) => {
            const on = chosenIds.has(a.id);
            const thumb = a.thumbnailUrl || a.url;
            return (
              <button
                key={a.id}
                type="button"
                disabled={busy}
                onClick={() => toggle(a)}
                className={`text-left rounded-xl border-2 overflow-hidden bg-white transition ${
                  on ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-orange-100'
                }`}
              >
                <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                  {thumb && (a.type === 'image' || a.type === 'poster' || a.type === 'mixed') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveUploadPath(thumb)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{TYPE_EMOJI[a.type] || '📁'}</span>
                  )}
                </div>
                <div className="px-1.5 py-1">
                  <div className="text-[10px] font-bold truncate">{a.title}</div>
                  {on && <div className="text-[10px] text-emerald-600 font-bold">{tx('已收录 ✓')}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
