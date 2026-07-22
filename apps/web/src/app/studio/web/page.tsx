'use client';

import { Suspense } from 'react';
import { WebWorkbenchStudio } from '@/components/web/web-workbench-studio';
import { useLanguage } from '@/contexts/language-context';

function WebStudioPageInner() {
  return <WebWorkbenchStudio />;
}

export default function WebStudioPage() {
  const { tx } = useLanguage();
  return (
    <Suspense fallback={<div className="text-sm text-ink-soft">{tx('正在加载…')}</div>}>
      <WebStudioPageInner />
    </Suspense>
  );
}
