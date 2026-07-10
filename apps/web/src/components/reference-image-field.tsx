'use client';

import { ImageUpload } from '@/components/course/image-upload';

/** 儿童友好的参考图选择：本地上传或素材库，无需粘贴链接 */
export function ReferenceImageField({
  value,
  onChange,
  label = '参考图（可选）',
  hint = '可以上传一张图片，或从素材库选一张，让 AI 参考着画 / 做视频',
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <p className="text-xs text-slate-500 mt-0.5 mb-2">{hint}</p>
      <div className="max-w-[200px]">
        <ImageUpload
          value={value || null}
          onChange={onChange}
          label="点这里选参考图"
          showAssetLibrary
        />
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="mt-2 text-xs font-bold text-rose-500 hover:text-rose-600"
        >
          ✕ 不用参考图了
        </button>
      )}
    </div>
  );
}
