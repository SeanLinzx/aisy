'use client';

import type { ReactNode } from 'react';

/** 支持换行、可拖拽增高，避免长文本被单行 input 截断 */
export function MultiLineField({
  label,
  value,
  onChange,
  placeholder,
  minHeight = 72,
  labelClassName = 'text-xs font-bold text-ink-soft',
  className = '',
}: {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  labelClassName?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label != null && label !== '' && (
        <label className={labelClassName}>{label}</label>
      )}
      <textarea
        className="kid-textarea mt-1 text-sm leading-relaxed w-full resize-y"
        style={{ minHeight }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
      />
    </div>
  );
}
