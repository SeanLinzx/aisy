'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCourseStreamChannel } from '@/contexts/course-stream-context';
import { useLanguage } from '@/contexts/language-context';
import { findGame } from '@/lib/course-config';
import { isDeckSlides } from '@/lib/course-deck';
import { classroomTargetPath, isClassroomPathAllowed } from '@/lib/classroom-lock';
import type { ClassroomShowcase } from '@/lib/classroom-showcase';
import type { CampSongState } from '@/lib/camp-song';
import { slidesSyncToStudents, campSongSyncToStudents } from '@/lib/classroom-sync';

export interface ClassroomState {
  active: boolean;
  teacherId: string;
  mode: 'game' | 'slides' | 'showcase';
  currentGame: string | null;
  slides: { url: string; name: string; page: number; kind?: 'pdf' | 'deck'; syncToStudents?: boolean } | null;
  showcase: ClassroomShowcase | null;
  campSong: CampSongState | null;
  students: string[];
  startedAt: number;
  updatedAt: number;
}

export function useClassroomState(meId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useLanguage();
  const { data: state, loaded, streamOpen } = useCourseStreamChannel<ClassroomState>(
    'classroom',
    '/course/classroom',
  );
  const lastTarget = useRef<string | null>(null);

  const included = !!state?.active && (state.students.length === 0 || state.students.includes(meId));
  const locked = included;

  const target = state ? classroomTargetPath(state) : '/student/course/live';

  const isSlides = slidesSyncToStudents(state?.mode === 'slides' ? state.slides : null);
  const isShowcase = !!state?.showcase;

  const label = isSlides
    ? isDeckSlides(state?.slides)
      ? `${t('classroom.interactiveSlides', '互动课件')} · ${t('classroom.page', '第')} ${state?.slides?.page ?? 1} ${locale === 'en' ? '' : '页'}`
      : `${t('classroom.slides', '课件')} · ${t('classroom.page', '第')} ${state?.slides?.page ?? 1} ${locale === 'en' ? '' : '页'}`
    : state?.currentGame
      ? findGame(state.currentGame, locale)?.game.title ?? t('classroom.miniGame', '小游戏')
      : t('classroom.waitTeacher', '等待老师');

  const showcaseLabel = isShowcase
    ? locale === 'en'
      ? `🌟 ${state?.showcase?.displayName}'s Work`
      : `🌟 ${state?.showcase?.displayName} 的作品`
    : null;
  const isAway = locked && !isClassroomPathAllowed(pathname, target);

  useEffect(() => {
    if (!locked) {
      lastTarget.current = null;
      return;
    }
    if (!isClassroomPathAllowed(pathname, target)) {
      lastTarget.current = target;
      router.replace(target);
    } else {
      lastTarget.current = target;
    }
  }, [locked, target, pathname, router]);

  function returnToClass() {
    lastTarget.current = target;
    router.replace(target);
  }

  return {
    included,
    locked,
    state,
    loaded,
    streamOpen,
    target,
    label,
    showcaseLabel,
    isShowcase,
    showcase: state?.showcase ?? null,
    campSong: campSongSyncToStudents(state?.campSong) ? state!.campSong : null,
    isAway,
    returnToClass,
  };
}
