'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/language-context';

/** 创建 / Studio 小应用：勾选「要不要加图片上传」；默认紧凑，可展开说明 */
export function KidImageUploadOption({
  checked,
  onChange,
  defaultExpanded = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 是否默认展开说明（创建流程第三步可传 true） */
  defaultExpanded?: boolean;
}) {
  const { tx } = useLanguage();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mt-2 rounded-xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 to-orange-50/60 px-2.5 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-brand shrink-0"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-xs font-bold text-ink truncate">
            📷 {tx('加上传图片按钮')}
          </span>
        </label>
        <button
          type="button"
          className="text-[10px] font-bold text-sky-600 hover:text-sky-800 shrink-0 px-1.5 py-0.5 rounded-md hover:bg-sky-100/80 transition"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? tx('收起说明') : tx('查看说明')}
        </button>
      </div>
      {expanded && (
        <p className="text-[11px] font-normal text-slate-500 mt-1.5 pl-[1.375rem] leading-relaxed">
          {tx('让用这个网页的人可以上传自己的照片。勾选后会在页面里自动做好，不用再去对话里让 AI 改。')}
        </p>
      )}
    </div>
  );
}
