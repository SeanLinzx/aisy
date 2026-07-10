'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface GroupRow {
  id: string;
  name: string;
  points: number;
  members?: Array<{ user: { displayName: string } }>;
}

interface MyScoreData {
  myGroup: GroupRow | null;
  rank: number | null;
  totalGroups: number;
  leaderboard: GroupRow[];
}

export function StudentGroupScoreCard() {
  const [data, setData] = useState<MyScoreData | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await api.get('/groups/my-score');
        if (alive) setData(r.data || null);
      } catch {
        if (alive) setData(null);
      }
    }
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!data?.myGroup) {
    return (
      <section className="kid-card border-dashed border-2 border-orange-100">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div>
            <div className="font-extrabold">小组积分</div>
            <p className="text-sm text-ink-soft mt-0.5">老师分组后，这里会显示你们小组的积分和排名哦～</p>
          </div>
        </div>
      </section>
    );
  }

  const { myGroup, rank, totalGroups, leaderboard } = data;

  return (
    <section className="kid-card-yellow space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-bold text-ink-soft">我的小组</div>
          <div className="font-display text-2xl font-extrabold mt-0.5 flex items-center gap-2">
            <span>👯</span> {myGroup.name}
          </div>
          <div className="text-sm font-bold text-violet-700 mt-1">
            排名第 {rank ?? '—'} / {totalGroups} 组
          </div>
        </div>
        <div className="text-center rounded-2xl bg-white border-2 border-amber-200 px-5 py-3">
          <div className="text-3xl font-display font-extrabold text-brand">{myGroup.points}</div>
          <div className="text-xs font-bold text-ink-soft">小组积分</div>
        </div>
      </div>

      {leaderboard.length > 1 && (
        <div>
          <div className="text-xs font-bold text-ink-soft mb-2">全班小组排行榜</div>
          <div className="space-y-2">
            {leaderboard.map((g, i) => {
              const mine = g.id === myGroup.id;
              return (
                <div
                  key={g.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    mine ? 'bg-amber-100 border-2 border-amber-300 font-bold' : 'bg-white/80 border border-orange-100'
                  }`}
                >
                  <span className="truncate">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {g.name}
                    {mine && ' · 我们'}
                  </span>
                  <span className="font-extrabold text-brand shrink-0 ml-2">{g.points}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
