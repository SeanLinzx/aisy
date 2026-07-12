'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/** 轻量轮询：老师端判断当前是否正在上课 */
export function useClassroomActive(intervalMs = 3000) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const r = await api.get('/course/classroom');
        if (alive) setActive(!!r.data?.active);
      } catch {
        if (alive) setActive(false);
      }
    }

    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);

  return active;
}
