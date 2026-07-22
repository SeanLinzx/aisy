'use client';

import { useLanguage } from '@/contexts/language-context';

/** Inline text that auto-translates Chinese → English when locale is en */
export function Tx({ children }: { children: string }) {
  const { tx } = useLanguage();
  return <>{tx(children)}</>;
}
