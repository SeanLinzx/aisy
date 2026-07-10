'use client';

import { useCallback, useEffect, useRef } from 'react';
import { api, apiAuth } from '@/lib/api';
import type { GameProgressReportPayload } from '@/lib/course-game-progress';

type ReportBody = Omit<GameProgressReportPayload, 'gameSlug' | 'displayName'>;

export function useReportGameProgress(gameSlug: string) {
  const meRef = useRef<{ displayName: string } | null>(null);

  useEffect(() => {
    apiAuth.me()
      .then((m) => {
        meRef.current = { displayName: m.displayName || m.username || '同学' };
      })
      .catch(() => {});
  }, []);

  return useCallback(
    async (payload: ReportBody) => {
      let displayName: string = meRef.current?.displayName || '';
      if (!displayName) {
        try {
          const m = await apiAuth.me();
          displayName = m.displayName || m.username || '同学';
          meRef.current = { displayName };
        } catch {
          displayName = '同学';
        }
      }
      try {
        await api.post('/course/game-progress/report', {
          gameSlug,
          displayName,
          ...payload,
        });
      } catch {
        /* 上报失败不打断游戏 */
      }
    },
    [gameSlug],
  );
}
