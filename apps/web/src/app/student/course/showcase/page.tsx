'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ClassroomShowcaseView } from '@/components/course/classroom-showcase-view';
import type { ClassroomShowcase } from '@/lib/classroom-showcase';

interface ClassroomState {
  active: boolean;
  mode: 'game' | 'slides' | 'showcase';
  showcase: ClassroomShowcase | null;
}

export default function ShowcasePage() {
  const [state, setState] = useState<ClassroomState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await api.get('/course/classroom');
        if (alive) setState(r.data || null);
      } catch {
        if (alive) setState(null);
      } finally {
        if (alive) setLoaded(true);
      }
    }
    load();
    const t = setInterval(load, 2500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const showcase = state?.mode === 'showcase' ? state.showcase : null;

  if (!loaded) {
    return <div className="kid-card text-sm text-ink-soft text-center py-12">加载中…</div>;
  }

  if (!showcase) {
    return (
      <div className="kid-card text-center py-12 space-y-3 max-w-lg mx-auto">
        <div className="text-4xl">⏳</div>
        <p className="font-bold text-ink-soft">老师还没有推送作品展示</p>
        <p className="text-sm text-ink-soft">稍等一下，老师会带你回到课堂～</p>
      </div>
    );
  }

  return <ClassroomShowcaseView showcase={showcase} variant="student" />;
}
