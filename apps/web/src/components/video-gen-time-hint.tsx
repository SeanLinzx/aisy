/** 视频生成平均耗时提示，用于生成按钮旁或进度条区域 */
export function VideoGenTimeHint({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 ${className}`}
    >
      ⏱ 平均每段约 3 分钟
    </span>
  );
}
