'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';

interface AssetItem {
  id: string;
  type: string;
  title: string;
  url?: string;
  thumbnailUrl?: string;
}

const IMAGE_TYPES = new Set(['image', 'poster']);

function assetImageSrc(a: AssetItem): string {
  const raw = a.url || a.thumbnailUrl || '';
  return resolveUploadPath(raw);
}

export function AssetImagePickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const [items, setItems] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setBroken(new Set());
    setLoading(true);
    api
      .get('/assets')
      .then((r) => {
        const list = (r.data || []).filter(
          (a: AssetItem) => IMAGE_TYPES.has(a.type) && (a.url || a.thumbnailUrl),
        );
        setItems(list);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="从素材库选图片"
      onClick={onClose}
    >
      <div
        className="kid-card w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl !p-4 sm:!p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="font-extrabold text-lg">📦 从素材库选图片</div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-orange-50 border-2 border-orange-100 text-slate-500 hover:text-slate-700 text-lg leading-none"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-ink-soft mb-3 shrink-0">选一张你之前生成或保存的图片</p>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1">
          {loading ? (
            <div className="py-16 text-center text-sm text-ink-soft">加载中…</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-soft px-4">
              素材库里还没有图片，先去「生图」或「关键词生图」做一个吧！
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
              {items.map((a) => {
                const src = assetImageSrc(a);
                const failed = broken.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onPick(src);
                      onClose();
                    }}
                    className="text-left rounded-2xl border-2 border-orange-100 overflow-hidden hover:border-brand hover:shadow-pop-sm transition bg-white"
                  >
                    <div className="aspect-square bg-orange-50 flex items-center justify-center">
                      {failed ? (
                        <span className="text-3xl opacity-40">🖼️</span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={a.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={() => setBroken((s) => new Set(s).add(a.id))}
                        />
                      )}
                    </div>
                    <div className="px-2 py-1.5 text-xs font-bold truncate">{a.title}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
