import { cn } from '@/lib/cn';

/** 页面主内容区宽度：默认铺满主栏，避免宽屏右侧大块空白 */
export function PageContainer({
  children,
  className,
  narrow,
}: {
  children: React.ReactNode;
  className?: string;
  /** 表单/设置类页面：居中窄栏 */
  narrow?: boolean;
}) {
  return (
    <div className={cn(narrow ? 'page-container--narrow' : 'page-container', className)}>
      {children}
    </div>
  );
}
