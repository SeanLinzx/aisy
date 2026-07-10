'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { findGame } from '@/lib/course-config';
import { isDeckSlides } from '@/lib/course-deck';
import { classroomTargetPath, isClassroomPathAllowed } from '@/lib/classroom-lock';
import type { ClassroomShowcase } from '@/lib/classroom-showcase';

export interface ClassroomState {
  active: boolean;
  teacherId: string;
  mode: 'game' | 'slides' | 'showcase';
  currentGame: string | null;
  slides: { url: string; name: string; page: number; kind?: 'pdf' | 'deck' } | null;
  showcase: ClassroomShowcase | null;
  students: string[];
  startedAt: number;
  updatedAt: number;
}

export function useClassroomState(meId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<ClassroomState | null>(null);
  const lastTarget = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await api.get('/course/classroom');
        if (alive) setState(r.data || null);
      } catch {
        if (alive) setState(null);
      }
    }
    load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const included = !!state?.active && (state.students.length === 0 || state.students.includes(meId));
  const locked = included;

  const target = state
    ? classroomTargetPath(state)
    : '/student/course/live';

  const isSlides = state?.mode === 'slides' && !!state.slides?.url;
  const isShowcase = state?.mode === 'showcase' && !!state.showcase;

  const label = isShowcase
    ? `🌟 欣赏 ${state?.showcase?.displayName} 的作品`
    : isSlides
      ? isDeckSlides(state?.slides)
        ? `互动课件 · 第 ${state?.slides?.page ?? 1} 页`
        : `课件 · 第 ${state?.slides?.page ?? 1} 页`
      : state?.currentGame
        ? findGame(state.currentGame)?.game.title ?? '小游戏'
        : '等待老师';

  const isAway = locked && !isClassroomPathAllowed(pathname, target);

  // 上课期间：强制停留在老师指定的页面，禁止自主浏览其它区域
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

  return { included, locked, state, target, label, isAway, returnToClass };
}
