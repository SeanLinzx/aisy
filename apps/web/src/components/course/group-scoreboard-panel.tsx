'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface GroupRow {
  id: string;
  name: string;
  points: number;
  class?: { id: string; name: string };
  members?: Array<{ user: { id: string; displayName: string; username: string } }>;
}

const QUICK_DELTAS = [1, 5, 10, -1, -5];

export function GroupScoreboardPanel({
  classId,
  compact = false,
  title = '🏆 小组积分板',
}: {
  classId: string;
  compact?: boolean;
  title?: string;
}) {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!classId) return;
    try {
      const r = await api.get('/groups/scoreboard', { params: { classId } });
      setGroups(r.data || []);
    } catch {
      setGroups([]);
    }
  }, [classId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function addPoints(groupId: string, delta: number) {
    setBusy(`${groupId}:${delta}`);
    setError(null);
    try {
      await api.post(`/groups/${groupId}/points`, { delta });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '加分失败');
    } finally {
      setBusy(null);
    }
  }

  async function resetAll() {
    if (!confirm('确定把本班所有小组积分清零吗？')) return;
    setBusy('reset');
    setError(null);
    try {
      await api.post('/groups/reset-points', { classId });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '清零失败');
    } finally {
      setBusy(null);
    }
  }

  if (!classId) {
    return (
      <div className="kid-card text-sm text-ink-soft">
        请先选择班级，或在「小组管理」里创建小组并分配成员。
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${compact ? '' : 'kid-card-yellow'}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-bold">{title}</div>
          {!compact && (
            <div className="text-xs text-ink-soft mt-0.5">按小组加分，学生端会看到自己小组的积分和排名（约 4 秒刷新）</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void resetAll()}
          disabled={!!busy || groups.length === 0}
          className="kid-button-sm bg-white border-2 border-rose-200 text-rose-600"
        >
          🔄 清零本班积分
        </button>
      </div>

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
      )}

      {groups.length === 0 ? (
        <p className="text-sm text-ink-soft">这个班还没有小组。请先在「小组管理」创建，或用课堂「抢组分队」同步。</p>
      ) : (
        <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-2'}`}>
          {groups.map((g, idx) => (
            <div
              key={g.id}
              className={`rounded-2xl border-2 bg-white p-4 ${
                idx === 0 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-orange-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'}</span>
                    <span className="font-extrabold truncate">{g.name}</span>
                  </div>
                  <div className="text-xs text-ink-soft mt-1 truncate">
                    {g.members?.map((m) => m.user.displayName).join('、') || '暂无成员'}
                  </div>
                </div>
                <div className="text-2xl font-display font-extrabold text-brand shrink-0">{g.points}</div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {QUICK_DELTAS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={!!busy}
                    onClick={() => void addPoints(g.id, d)}
                    className={`kid-button-sm text-xs !py-1 !px-2 ${
                      d > 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    {busy === `${g.id}:${d}` ? '…' : d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
