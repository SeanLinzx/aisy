'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface GroupRow {
  id: string;
  name: string;
  points: number;
  members?: Array<{ user: { displayName: string } }>;
}

export interface MyScoreData {
  myGroup: GroupRow | null;
  rank: number | null;
  totalGroups: number;
  leaderboard: GroupRow[];
}

export interface ScoreGainEvent {
  delta: number;
  newPoints: number;
  at: number;
}

/** 学生端小组积分轮询，检测加分并触发庆祝动画 */
export function useMyGroupScore(intervalMs = 4000) {
  const [data, setData] = useState<MyScoreData | null>(null);
  const [gain, setGain] = useState<ScoreGainEvent | null>(null);
  const prevPoints = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const r = await api.get('/groups/my-score');
        if (!alive) return;
        const next: MyScoreData | null = r.data || null;
        const pts = next?.myGroup?.points;
        if (pts != null && prevPoints.current != null && pts > prevPoints.current) {
          setGain({ delta: pts - prevPoints.current, newPoints: pts, at: Date.now() });
        }
        if (pts != null) prevPoints.current = pts;
        setData(next);
      } catch {
        if (alive) setData(null);
      }
    }

    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);

  function clearGain() {
    setGain(null);
  }

  return { data, gain, clearGain };
}
