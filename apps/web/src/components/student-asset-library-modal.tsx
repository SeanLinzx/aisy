'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import {
  getAssetTabs,
  assetDisplayType,
  filterAssetsByTab,
  isHiddenInLibrary,
  parseAssetMeta,
  type AssetTabKey,
} from '@/lib/asset-tabs';
import { resolveUploadPath } from '@/lib/upload-url';
import { cn } from '@/lib/cn';
import { VideoCover } from '@/components/video-cover';

interface AssetItem {
  id: string;
  type: string;
  title: string;
  url?: string;
  thumbnailUrl?: string;
  content?: string;
  summary?: string;
  meta?: unknown;
  createdAt?: string;
}

function assetThumbSrc(a: AssetItem): string | null {
  const raw = a.thumbnailUrl || a.url;
  return raw ? resolveUploadPath(raw) : null;
}

function AssetPreview({ asset }: { asset: AssetItem }) {
  const meta = parseAssetMeta(asset.meta);
  const thumb = assetThumbSrc(asset);
  const isWeb = asset.type === 'web';
  const isDecorate = meta?.kind === 'decorate-room';

  if (thumb && (asset.type === 'image' || asset.type === 'poster' || asset.type === 'video' || isDecorate)) {
    if (asset.type === 'video') {
      return <VideoCover asset={asset} className="w-full h-full" />;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumb} alt={asset.title} className="w-full h-full object-cover" loading="lazy" />
    );
  }

  if (isWeb) return <span className="text-4xl">🌐</span>;
  if (asset.type === 'ppt') return <span className="text-4xl">📊</span>;
  if (asset.type === 'text' && asset.content) {
    return (
      <p className="text-[10px] leading-relaxed text-ink-soft line-clamp-6 px-2 text-left w-full">
        {asset.content}
      </p>
    );
  }
  return <span className="text-3xl opacity-50">📄</span>;
}

export function StudentAssetLibraryModal({
  open,
  onClose,
  defaultTab = 'image',
  title = '📦 我的素材库',
  subtitle = '查看你以前生成并保存过的所有作品',
}: {
  open: boolean;
  onClose: () => void;
  defaultTab?: AssetTabKey;
  title?: string;
  subtitle?: string;
}) {
  const [tab, setTab] = useState<AssetTabKey>(defaultTab);
  const [allItems, setAllItems] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<AssetItem | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setTab(defaultTab);
    setPreview(null);
    setLoading(true);
    api
      .get('/assets')
      .then((r) => setAllItems((r.data || []).filter((a: AssetItem) => !isHiddenInLibrary(a))))
      .catch(() => setAllItems([]))
      .finally(() => setLoading(false));
  }, [open, defaultTab]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (preview) setPreview(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, preview]);

  const { tx, locale } = useLanguage();
  const assetTabs = useMemo(() => getAssetTabs(locale), [locale]);
  const items = useMemo(() => filterAssetsByTab(allItems, tab), [allItems, tab]);

  if (!open || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={tx("素材库")}
      onClick={onClose}
    >
      <div
        className="kid-card w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl !p-4 sm:!p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
          <div className="min-w-0">
            <div className="font-display font-extrabold text-lg">{tx(title)}</div>
            <p className="text-xs text-ink-soft mt-0.5">{tx(subtitle)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-orange-50 border-2 border-orange-100 text-slate-500 hover:text-slate-700 text-lg leading-none shrink-0"
            aria-label={tx("关闭")}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {assetTabs.map((t) => {
            const count = filterAssetsByTab(allItems, t.key).length;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'text-xs font-bold px-3 py-1.5 rounded-xl border transition',
                  tab === t.key
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-slate-700 border-orange-200 hover:bg-orange-50',
                )}
              >
                {t.emoji} {t.label}
                {count > 0 && <span className="ml-1 opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1">
          {loading ? (
            <div className="py-16 text-center text-sm text-ink-soft">{tx("加载中…")}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-soft px-4">
              这个分类还没有作品，生成后会自动保存到这里哦～
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-2">
              {items.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setPreview(a)}
                  className="text-left rounded-2xl border-2 border-orange-100 overflow-hidden hover:border-brand hover:shadow-pop-sm transition bg-white"
                >
                  <div className="aspect-square bg-orange-50 flex items-center justify-center overflow-hidden">
                    <AssetPreview asset={a} />
                  </div>
                  <div className="px-2 py-2 space-y-0.5">
                    <div className="text-xs font-bold truncate">{a.title}</div>
                    <div className="text-[10px] font-bold text-ink-soft">{assetDisplayType(a, locale)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-3xl border-2 border-orange-100 shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-extrabold truncate">{preview.title}</div>
                <div className="text-xs text-ink-soft font-bold">{assetDisplayType(preview, locale)}</div>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-orange-100 bg-orange-50 min-h-[120px]">
              {(() => {
                const thumb = assetThumbSrc(preview);
                const meta = parseAssetMeta(preview.meta);
                if (thumb && preview.type === 'video') {
                  return (
                    <video src={thumb} controls playsInline className="w-full max-h-80 object-contain bg-black mx-auto" />
                  );
                }
                if (thumb && (preview.type === 'image' || preview.type === 'poster' || meta?.kind === 'decorate-room')) {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt={preview.title} className="w-full max-h-80 object-contain mx-auto" />
                  );
                }
                return (
                  <div className="aspect-square flex items-center justify-center p-4">
                    <AssetPreview asset={preview} />
                  </div>
                );
              })()}
            </div>

            {preview.summary && (
              <p className="text-sm text-ink-soft leading-relaxed">{preview.summary}</p>
            )}
            {preview.content && (
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                {preview.content}
              </p>
            )}

            {assetThumbSrc(preview) && (
              <a
                href={assetThumbSrc(preview)!}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center kid-button-sm bg-white border-2 border-orange-200 text-brand"
              >
                🔍 查看大图
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modal, document.body);
}

/** 课程创作页用的素材库入口按钮 */
export function StudentAssetLibraryEntry({
  defaultTab = 'image',
  hint = '查看以前生成过的所有作品',
  className,
}: {
  defaultTab?: AssetTabKey;
  hint?: string;
  className?: string;
}) {
  const { tx } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'w-full flex items-center justify-between gap-3 rounded-2xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-sky-50 px-4 py-3 text-left transition hover:border-violet-300 hover:shadow-pop-sm active:scale-[0.99]',
          className,
        )}
      >
        <div className="min-w-0">
          <div className="font-extrabold text-sm flex items-center gap-2">
            <span className="text-lg">📦</span> {tx("素材库")}
          </div>
          <p className="text-xs text-ink-soft mt-0.5 truncate">{tx(hint)}</p>
        </div>
        <span className="shrink-0 kid-button-sm bg-white border-2 border-violet-200 text-violet-700 text-xs">
          打开 →
        </span>
      </button>
      <StudentAssetLibraryModal open={open} onClose={() => setOpen(false)} defaultTab={defaultTab} />
    </>
  );
}
