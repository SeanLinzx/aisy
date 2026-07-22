'use client';

import { useMemo } from 'react';
import type { NavItem } from '@/components/role-shell';
import { useLanguage } from '@/contexts/language-context';
import { EXPLORE_TOOL_PATHS } from '@/lib/explore-tools';
import { isPadMode } from '@/lib/pad-mode';

export function useStudentNavItems(): NavItem[] {
  const { t } = useLanguage();
  const pad = isPadMode();

  return useMemo(() => {
    if (pad) {
      return [
        { href: '/student/course/live', label: t('nav.followClass', '跟课'), emoji: '🎓', color: 'orange' as const },
        { href: '/student/course', label: t('nav.courseShort', '课程'), emoji: '📚', color: 'sky' as const },
        { href: '/student/explore', label: t('nav.explore', '探索'), emoji: '🎧', color: 'yellow' as const, matchPrefixes: [...EXPLORE_TOOL_PATHS] },
        { href: '/student/assets', label: t('nav.assetsShort', '素材'), emoji: '📦', color: 'mint' as const },
        { href: '/student', label: t('nav.home', '首页'), emoji: '🏠', color: 'pink' as const },
      ];
    }
    return [
      { href: '/student', label: t('nav.home', '首页'), emoji: '🏠' },
      { href: '/student/course', label: t('nav.course', '课程模式'), emoji: '📚' },
      {
        href: '/student/explore',
        label: t('nav.explore', '探索模式'),
        emoji: '🎧',
        color: 'yellow' as const,
        matchPrefixes: [...EXPLORE_TOOL_PATHS],
      },
      { href: '/student/assets', label: t('nav.assets', '我的素材库'), emoji: '📦' },
      { href: '/student/pm-applications', label: t('nav.pmApps', '我的 AI 应用'), emoji: '💼' },
      { href: '/student/projects', label: t('nav.projects', '我的网页'), emoji: '💻' },
      { href: '/student/settings', label: t('nav.settings', '我的设置'), emoji: '⚙️' },
    ];
  }, [t, pad]);
}
