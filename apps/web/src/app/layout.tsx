import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { isPadMode } from '@/lib/pad-mode';
import { cn } from '@/lib/cn';

const pad = isPadMode();

export const metadata: Metadata = {
  title: pad ? 'AI Camp 平板课堂 · 触控控制台' : 'AI Camp · 暑期 AI 创作训练营',
  description: pad
    ? '面向平板触控优化的 AI 课堂控制台与学生跟课界面'
    : '面向小朋友的 AI 创作与网页实践平台',
  appleWebApp: pad ? { capable: true, title: 'AI Camp 平板' } : undefined,
};

export const viewport: Viewport = {
  themeColor: '#ff7a59',
  width: 'device-width',
  initialScale: 1,
  viewportFit: pad ? 'cover' : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={cn(pad && 'pad-mode')}>
      <body className={cn('min-h-screen antialiased font-sans text-ink', pad && 'pad-mode')}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
