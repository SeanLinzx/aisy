'use client';

import { useLanguage } from '@/contexts/language-context';

export function AiWarning({ extra }: { extra?: string }) {
  const { tx } = useLanguage();
  return (
    <div className="ai-warning">
      <span className="text-base">⚠️</span>
      <span>{tx('AI 内容可能有误，请老师或家长协助核对。')}{extra}</span>
    </div>
  );
}
