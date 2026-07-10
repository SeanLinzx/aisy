import { assetPath } from '@/lib/asset-path';

/** 第一节课 · AI 小侦探互动课件（静态 HTML，含内置教师工具栏） */
export const LESSON1_DETECTIVE_DECK = {
  id: 'lesson1-detective',
  title: 'AI 小侦探出动！',
  path: '/course/ai-detective.html',
  lessonSlug: 'lesson1',
} as const;

export type DeckViewMode = 'solo' | 'present' | 'follow';

export function deckUrl(mode: DeckViewMode = 'solo'): string {
  const base = assetPath(LESSON1_DETECTIVE_DECK.path);
  if (mode === 'solo') return base;
  return `${base}?${mode}=1`;
}

export function isDeckSlides(slides: { url?: string; kind?: string } | null | undefined): boolean {
  if (!slides) return false;
  if (slides.kind === 'deck') return true;
  return typeof slides.url === 'string' && slides.url.includes('ai-detective.html');
}
