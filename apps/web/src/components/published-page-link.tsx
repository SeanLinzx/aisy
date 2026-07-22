'use client';

import type { ReactNode } from 'react';
import { publishPath } from '@/lib/public-url';

/** 已发布网页链接：使用原生 <a>，确保 /p/:slug 走服务端路由而非 next/link 404。 */
export function PublishedPageLink({
  slug,
  href,
  className,
  children,
}: {
  slug?: string | null;
  href?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const target = href?.trim() || (slug ? publishPath(slug) : null);
  if (!target) return null;

  return (
    <a href={target} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
