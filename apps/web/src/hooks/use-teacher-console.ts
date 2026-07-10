'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { GameProgressSession } from '@/lib/course-game-progress';
import type { SummarySession } from '@/lib/detective-summary';
import type { ClassroomShowcase } from '@/lib/classroom-showcase';

export interface ConsoleClassroomState {
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

export interface ConsoleState {
  classroom: ConsoleClassroomState | null;
  cancelSub: any | null;
  groupGrab: any | null;
  gameProgress: GameProgressSession | null;
  summary: SummarySession | null;
  now: number;
}

/**
 * 教师中控台聚合轮询：一个请求取回全部课堂状态，
 * 替代原先课堂状态 / 取消续费 / 抢组 / 各游戏进度 / 总结问答的 5+ 个并行轮询。
 */
export function useTeacherConsole(games: string[], intervalMs = 3000) {
  const [state, setState] = useState<ConsoleState | null>(null);
  const [connected, setConnected] = useState(true);
  const gamesKey = games.join(',');
  const inflight = useRef(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (inflight.current) return; // 网络慢时不要堆积请求
      inflight.current = true;
      try {
        const r = await api.get('/course/console', {
          params: gamesKey ? { games: gamesKey } : undefined,
        });
        if (alive) {
          setState(r.data || null);
          setConnected(true);
        }
      } catch {
        if (alive) setConnected(false);
      } finally {
        inflight.current = false;
      }
    }
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [gamesKey, intervalMs]);

  return {
    state,
    connected,
    refresh: async () => {
      try {
        const r = await api.get('/course/console', {
          params: gamesKey ? { games: gamesKey } : undefined,
        });
        setState(r.data || null);
      } catch {}
    },
  };
}
