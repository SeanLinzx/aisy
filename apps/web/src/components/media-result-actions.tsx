'use client';

import { useState } from 'react';
import Link from 'next/link';
import { downloadMedia, copyText, buildVideoPageHref } from '@/lib/media-actions';
import { resolveUploadPath } from '@/lib/upload-url';

export function ImageResultActions({
  url,
  title,
  savedToLibrary,
  fromCourse,
  lessonSlug,
}: {
  url: string;
  title?: string;
  savedToLibrary?: boolean;
  fromCourse?: boolean;
  lessonSlug?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const ok = await copyText(resolveUploadPath(url));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <button
        type="button"
        onClick={() => void downloadMedia(url, `${title || 'AI图片'}.png`)}
        className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft text-xs"
      >
        ⬇ 保存图片
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="kid-button-sm bg-white border-2 border-sky-200 text-sky-700 text-xs"
      >
        {copied ? '✅ 已复制链接' : '📋 复制图片链接'}
      </button>
      <Link
        href={buildVideoPageHref(url, fromCourse, lessonSlug)}
        className="kid-button-sm bg-violet-500 text-white border-2 border-violet-500 text-xs inline-flex items-center"
      >
        🎬 去生成视频
      </Link>
      {savedToLibrary && (
        <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
          ✅ 已存入素材库
        </span>
      )}
    </div>
  );
}

export function VideoResultActions({
  url,
  title,
  savedToLibrary,
  assetId,
  onSave,
  saving,
}: {
  url: string;
  title?: string;
  savedToLibrary?: boolean;
  assetId?: string | null;
  onSave?: () => void;
  saving?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const fullUrl = resolveUploadPath(url);

  async function copyLink() {
    const ok = await copyText(fullUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <button
        type="button"
        onClick={() => void downloadMedia(url, `${title || 'AI视频'}.mp4`)}
        className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft text-xs"
      >
        ⬇ 保存视频
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="kid-button-sm bg-white border-2 border-sky-200 text-sky-700 text-xs"
      >
        {copied ? '✅ 已复制链接' : '📋 复制视频链接'}
      </button>
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="kid-button-sm bg-white border-2 border-slate-200 text-ink-soft text-xs inline-flex items-center"
      >
        ↗ 新窗口播放
      </a>
      {savedToLibrary || assetId ? (
        <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
          ✅ 已存入素材库
        </span>
      ) : onSave ? (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="kid-button-sm bg-emerald-500 text-white border-2 border-emerald-500 text-xs"
        >
          {saving ? '保存中…' : '💾 保存到素材库'}
        </button>
      ) : (
        <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
          💾 正在写入素材库…
        </span>
      )}
    </div>
  );
}
