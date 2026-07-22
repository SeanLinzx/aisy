'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { resolveUploadPath, resolveVideoPlaybackUrl } from '@/lib/upload-url';
import { assetDisplayTitle, plainTextPreview } from '@/lib/plain-text';

const IMAGE_PREVIEW_TYPES = new Set(['image', 'poster', 'mixed']);

export type AssetMediaPreviewData = {
  kind: 'image' | 'video' | 'text' | 'audio';
  src?: string;
  content?: string;
  title: string;
  ownerName?: string;
};

export function resolveAssetMediaPreview(asset: {
  type: string;
  title?: string;
  url?: string;
  thumbnailUrl?: string;
  content?: string;
}): AssetMediaPreviewData | null {
  const title = assetDisplayTitle(asset.title, '素材预览');
  if (asset.type === 'text' && asset.content) {
    return { kind: 'text', content: asset.content, title };
  }
  if (asset.type === 'audio' && asset.url) {
    return {
      kind: 'audio',
      src: resolveUploadPath(asset.url),
      title,
    };
  }
  if (asset.type === 'video') {
    const raw = asset.url || asset.thumbnailUrl;
    if (!raw) return null;
    return {
      kind: 'video',
      src: resolveVideoPlaybackUrl(raw),
      title,
    };
  }
  const imageRaw = asset.url || asset.thumbnailUrl;
  if (imageRaw && IMAGE_PREVIEW_TYPES.has(asset.type)) {
    return {
      kind: 'image',
      src: resolveUploadPath(imageRaw),
      title,
    };
  }
  return null;
}

function MediaBody({ data, className }: { data: AssetMediaPreviewData; className?: string }) {
  if (data.kind === 'video' && data.src) {
    return (
      <video
        key={data.src}
        src={data.src}
        className={className || 'max-w-full max-h-full w-auto h-auto'}
        controls
        autoPlay
        playsInline
      />
    );
  }
  if (data.kind === 'audio' && data.src) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 w-full">
        <span className="text-6xl">🎵</span>
        <audio key={data.src} src={data.src} controls autoPlay className="w-full max-w-md" />
      </div>
    );
  }
  if (data.kind === 'image' && data.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={data.src}
        alt={data.title}
        className={className || 'max-w-full max-h-full w-auto h-auto object-contain'}
      />
    );
  }
  if (data.kind === 'text' && data.content) {
    return (
      <div className="w-full max-w-2xl max-h-full overflow-y-auto rounded-2xl bg-white p-6 text-slate-800 shadow-inner">
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{plainTextPreview(data.content, 8000)}</p>
      </div>
    );
  }
  return null;
}

const FULLSCREEN_FOOTER_CLASS =
  'shrink-0 px-4 py-3 bg-black/95 text-white border-t border-white/10 max-h-[28vh] overflow-y-auto overflow-x-hidden w-full min-w-0 [&_.tag]:bg-white/15 [&_.tag]:text-white/90 [&_.tag]:border-white/20 [&_a]:text-sky-300 [&_button]:text-white/90';

export function AssetMediaViewer({
  data,
  fullscreen = false,
  onClose,
  onToggleFullscreen,
  footer,
  embeddedHeight = 'min-h-[420px]',
}: {
  data: AssetMediaPreviewData | null;
  fullscreen?: boolean;
  onClose?: () => void;
  onToggleFullscreen?: () => void;
  footer?: ReactNode;
  embeddedHeight?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!data) {
    return (
      <div className={`kid-card flex flex-col gap-3 ${embeddedHeight} px-4 py-4`}>
        {footer ? (
          <>
            <p className="text-sm text-slate-500 text-center py-6">该素材暂无大图预览，可使用下方操作。</p>
            {footer}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-slate-400 flex-1 px-6">
            <span className="text-4xl mb-2">🖼️</span>
            <p className="text-sm">点击左侧素材，在此查看大图</p>
          </div>
        )}
      </div>
    );
  }

  const toolbar = (
    <div className="flex items-start justify-between gap-3 shrink-0 min-w-0">
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-base truncate">{data.title}</h3>
        {data.ownerName && <p className="text-sm opacity-80 mt-0.5 truncate">👤 {data.ownerName}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onToggleFullscreen && (data.kind === 'image' || data.kind === 'video') && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            {fullscreen ? '退出全屏' : '⛶ 全屏'}
          </button>
        )}
        {data.src && (
          <a
            href={data.src}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand/10 hover:bg-brand/20 text-brand"
          >
            原文件
          </a>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xl leading-none"
            aria-label="关闭预览"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );

  if (fullscreen) {
    if (!mounted) return null;
    const overlay = (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 py-3 bg-black/95 text-white [&_button]:text-white [&_button]:bg-white/15 [&_button]:hover:bg-white/25 [&_a]:text-sky-300 [&_a]:bg-white/15 [&_a]:hover:bg-white/25">
          {toolbar}
        </div>
        <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-4 overflow-hidden">
          <MediaBody data={data} className="max-w-full max-h-full w-auto h-auto object-contain" />
        </div>
        {footer && <div className={FULLSCREEN_FOOTER_CLASS}>{footer}</div>}
      </div>
    );
    return createPortal(overlay, document.body);
  }

  return (
    <div className={`kid-card flex flex-col gap-3 ${embeddedHeight} min-w-0`}>
      {toolbar}
      <div className="flex-1 min-h-0 flex items-center justify-center rounded-2xl overflow-hidden bg-slate-50 border border-orange-100">
        <MediaBody data={data} />
      </div>
      {footer && <div className="min-w-0 overflow-hidden">{footer}</div>}
    </div>
  );
}
