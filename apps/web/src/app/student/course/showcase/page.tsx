'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { classroomTargetPath } from '@/lib/classroom-lock';
import type { ClassroomShowcase } from '@/lib/classroom-showcase';

interface ClassroomState {
  active: boolean;
  mode: 'game' | 'slides' | 'showcase';
  currentGame: string | null;
  slides: { url: string } | null;
  showcase: ClassroomShowcase | null;
}

/** 作品展示已改为右侧浮窗，此页自动跳回当前课堂页面 */
export default function ShowcasePage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await api.get('/course/classroom');
        if (!alive) return;
        const state = r.data as ClassroomState | null;
        if (state?.active) {
          router.replace(classroomTargetPath(state));
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoaded(true);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [router]);

  if (!loaded) {
    return <div className="kid-card text-sm text-ink-soft text-center py-12">加载中…</div>;
  }

  return (
    <div className="kid-card text-center py-12 space-y-3 max-w-lg mx-auto">
      <div className="text-4xl">🌟</div>
      <p className="font-bold text-ink-soft">同学作品会在页面右侧弹出</p>
      <p className="text-sm text-ink-soft">你可以继续做自己的任务，随时点开欣赏～</p>
    </div>
  );
}
