'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useLanguage } from '@/contexts/language-context';

export function ExploreToolHeader({
  title,
  desc,
  actions,
  backHref = '/student/explore',
  backLabel,
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  const { t } = useLanguage();
  const label = backLabel ?? t('explore.back', '← 返回探索模式');

  return (
    <header className="space-y-2">
      <Link href={backHref} className="text-sm font-bold text-brand hover:underline inline-flex items-center gap-1">
        {label}
      </Link>
      <div className={actions ? 'flex items-start justify-between flex-wrap gap-3' : undefined}>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">{title}</h1>
          {desc && <p className="text-slate-600 mt-1 text-sm">{desc}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
