'use client';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AssetImagePickerModal } from './asset-image-picker';

/**
 * 图片上传：本地上传 或 从素材库选择。
 */
export function ImageUpload({
  value,
  onChange,
  label = '上传图片',
  className = '',
  showAssetLibrary = true,
}: {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  /** 是否显示「从素材库选择」 */
  showAssetLibrary?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await api.post('/storage/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (r.data?.url) onChange(r.data.url);
    } catch (e: any) {
      setError(e?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      <div
        className="w-full aspect-square rounded-2xl border-2 border-dashed border-orange-200 bg-white/60 overflow-hidden flex items-center justify-center"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveUploadPath(value)} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-center text-slate-400 p-3">
            <span className="block text-3xl mb-1">🖼️</span>
            <span className="text-xs font-semibold">{uploading ? '上传中…' : label}</span>
          </span>
        )}
      </div>

      <div className={`mt-2 flex gap-2 ${showAssetLibrary ? '' : 'flex-col'}`}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="kid-button-sm flex-1 bg-white border-2 border-orange-200 text-ink-soft text-xs"
        >
          📤 {value ? '换一张' : '本地上传'}
        </button>
        {showAssetLibrary && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="kid-button-sm flex-1 bg-violet-50 border-2 border-violet-200 text-violet-700 text-xs"
          >
            📦 素材库
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      {error && <div className="text-xs text-rose-600 mt-1">{error}</div>}

      <AssetImagePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onChange}
      />
    </div>
  );
}
