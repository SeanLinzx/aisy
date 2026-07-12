'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, apiAuth } from '@/lib/api';

export interface GroupGrabMember {
  studentId: string;
  displayName: string;
  joinedAt: number;
  autoAssigned?: boolean;
}

export interface GroupGrabSlot {
  id: string;
  name: string;
  emoji: string;
  capacity: number;
  members: GroupGrabMember[];
}

export interface GroupGrabSession {
  id: string;
  active: boolean;
  phase: 'setup' | 'open' | 'closed';
  groups: GroupGrabSlot[];
  classId?: string;
  createdAt: number;
  updatedAt: number;
}

export function GroupGrabGame() {
  const [session, setSession] = useState<GroupGrabSession | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, me] = await Promise.all([
        api.get('/course/group-grab'),
        apiAuth.me().catch(() => null),
      ]);
      setSession(s.data || null);
      setMeId(me?.id ?? null);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [load]);

  async function grab(groupId: string) {
    if (busy) return;
    setBusy(groupId);
    setFlash(null);
    try {
      const r = await api.post('/course/group-grab/grab', { groupId });
      const joined: GroupGrabSession = r.data;
      const slot = joined.groups.find((g) => g.id === groupId);
      const mates = slot?.members.filter((m) => m.studentId !== meId).map((m) => m.displayName) ?? [];
      setSession(joined);
      setFlash({
        type: 'ok',
        msg: mates.length > 0 ? `🎉 抢组成功！同组还有：${mates.join('、')}` : '🎉 抢组成功！你是这个组的第一人～',
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || '抢组失败';
      setFlash({ type: 'err', msg: typeof msg === 'string' ? msg : '该组已满，请选其他小组' });
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (!session) {
    return (
      <div className="kid-card text-center py-10">
        <div className="text-4xl mb-3">👯</div>
        <div className="font-extrabold text-lg">老师还没开始抢组</div>
        <p className="text-sm text-ink-soft mt-2">请等老师在课堂控制台设置小组并开启抢组活动。</p>
      </div>
    );
  }

  if (!session.active || session.phase === 'setup') {
    return (
      <div className="kid-card-orange text-center py-10">
        <div className="text-4xl mb-3 animate-wiggle">⏳</div>
        <div className="font-extrabold text-lg">小组名单准备好了</div>
        <p className="text-sm text-ink-soft mt-2">老师马上就会喊「开始抢组」，请准备好选你想去的小组！</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {session.groups.map((g) => (
            <span key={g.id} className="tag">{g.emoji} {g.name}</span>
          ))}
        </div>
      </div>
    );
  }

  const myGroup = meId
    ? session.groups.find((g) => g.members.some((m) => m.studentId === meId))
    : undefined;
  const myMember = myGroup?.members.find((m) => m.studentId === meId);
  const closed = session.phase === 'closed';
  const teammates = myGroup?.members.filter((m) => m.studentId !== meId) ?? [];
  const myGroupFull = !!myGroup && myGroup.members.length >= myGroup.capacity;

  return (
    <div className="space-y-5">
      {myGroup ? (
        <div key={myGroup.id} className="kid-card-mint text-center py-6 animate-pop">
          <div className="text-5xl mb-2">{myGroup.emoji}</div>
          <div className="font-display text-2xl font-extrabold">{myGroup.name}</div>
          <p className="text-sm text-ink-soft mt-2">
            {myMember?.autoAssigned
              ? '🔄 你被调剂到了这个小组，和小伙伴们一起加油！'
              : '🎉 你已经成功加入这个小组啦！'}
          </p>
          <div className="mt-4 mx-auto max-w-sm rounded-2xl bg-white/70 border-2 border-emerald-200 px-4 py-3">
            <div className="text-xs font-bold text-emerald-700 mb-1.5">
              👬 你的同组小伙伴（{myGroup.members.length}/{myGroup.capacity} 人）
            </div>
            {teammates.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1.5">
                {teammates.map((m) => (
                  <span key={m.studentId} className="tag bg-white">
                    {m.displayName}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-soft">暂时只有你一个人，等等其他小伙伴来吧～</p>
            )}
            <p className="text-xs font-bold mt-2 text-emerald-600">
              {myGroupFull ? '🎊 小组满员啦，一起加油！' : `再来 ${myGroup.capacity - myGroup.members.length} 人就满员啦～`}
            </p>
          </div>
        </div>
      ) : closed ? (
        <div className="kid-card text-center py-6">
          <div className="text-4xl mb-2">😅</div>
          <div className="font-extrabold text-lg">抢组已结束</div>
          <p className="text-sm text-ink-soft mt-2">你还没有被分到小组，请告诉老师帮你安排。</p>
        </div>
      ) : (
        <div className="kid-card-orange">
          <div className="font-extrabold text-lg flex items-center gap-2">
            <span className="text-2xl animate-wiggle">🏃</span> 快选你想去的小组！
          </div>
          <p className="text-sm text-ink-soft mt-1">点击下面的小组卡片抢位，满员后就选不了了哦～</p>
        </div>
      )}

      {flash && (
        <div className={`rounded-2xl border-2 px-4 py-3 text-sm font-bold text-center ${flash.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-600'}`}>
          {flash.msg}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {session.groups.map((g) => {
          const full = g.members.length >= g.capacity;
          const mine = !!meId && g.members.some((m) => m.studentId === meId);
          const canGrab = !myGroup && !closed && !full && session.phase === 'open';

          return (
            <button
              key={g.id}
              type="button"
              disabled={!canGrab && !mine}
              onClick={() => canGrab && grab(g.id)}
              className={`text-left rounded-3xl border-2 p-5 transition-all duration-200 ${
                mine
                  ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300 scale-[1.02]'
                  : full
                    ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    : canGrab
                      ? 'border-orange-200 bg-white hover:-translate-y-1 hover:border-brand hover:shadow-pop-sm cursor-pointer'
                      : 'border-orange-100 bg-white opacity-80 cursor-default'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-4xl">{g.emoji}</span>
                <span className={`tag text-[11px] ${full ? 'tag-yellow' : ''}`}>
                  {g.members.length}/{g.capacity} 人
                </span>
              </div>
              <div className="font-display text-xl font-extrabold mt-2">{g.name}</div>
              {full && !mine && <div className="text-xs font-bold text-amber-600 mt-2">😢 已满员</div>}
              {canGrab && (
                <div className="mt-3 text-sm font-bold text-brand">
                  {busy === g.id ? '抢组中…' : '点我抢这个组 →'}
                </div>
              )}
              {mine && <div className="mt-3 text-sm font-bold text-emerald-600">✅ 你在这里</div>}
              {g.members.length > 0 && (
                <div className="mt-3 text-xs text-ink-soft leading-relaxed">
                  已有：{g.members.map((m) => m.displayName).join('、')}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface StudentOption {
  id: string;
  displayName: string;
  username: string;
}

export function GroupGrabTeacherPanel({
  session,
  students,
  classes,
  draftGroups,
  classId,
  busy,
  isPushed,
  onDraftChange,
  onClassIdChange,
  onSetup,
  onStart,
  onReassign,
  onClose,
  onSync,
  onClear,
  onManualAssign,
  onPushAgain,
}: {
  session: GroupGrabSession | null;
  students: StudentOption[];
  classes: Array<{ id: string; name: string }>;
  draftGroups: Array<{ name: string; capacity: number; emoji: string }>;
  classId: string;
  busy: boolean;
  isPushed?: boolean;
  onDraftChange: (groups: Array<{ name: string; capacity: number; emoji: string }>) => void;
  onClassIdChange: (id: string) => void;
  onSetup: () => void;
  onStart: () => void;
  onReassign: () => void;
  onClose: () => void;
  onSync: () => void;
  onClear: () => void;
  onManualAssign: (studentId: string, groupId: string) => void;
  onPushAgain?: () => void;
}) {
  const assignedIds = new Set(
    session?.groups.flatMap((g) => g.members.map((m) => m.studentId)) ?? [],
  );
  const unassigned = students.filter((s) => !assignedIds.has(s.id));
  const totalJoined = session?.groups.reduce((n, g) => n + g.members.length, 0) ?? 0;
  const totalCapacity = session?.groups.reduce((n, g) => n + g.capacity, 0) ?? 0;
  const allFull = !!session && session.groups.length > 0 && session.groups.every((g) => g.members.length >= g.capacity);

  function addDraft() {
    const emojis = ['🕵️', '🌟', '🚀', '🎨', '🔍', '💡'];
    onDraftChange([
      ...draftGroups,
      { name: '', capacity: 6, emoji: emojis[draftGroups.length % emojis.length] },
    ]);
  }

  function updateDraft(i: number, patch: Partial<{ name: string; capacity: number; emoji: string }>) {
    onDraftChange(draftGroups.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  }

  function removeDraft(i: number) {
    onDraftChange(draftGroups.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-2">
        <select className="kid-input" value={classId} onChange={(e) => onClassIdChange(e.target.value)}>
          <option value="">选择班级（同步到小组管理时需要）</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="text-xs text-ink-soft flex items-center">
          设置多个小组名称和人数上限，开启后学生在自己电脑上抢组。
        </div>
      </div>

      <div className="space-y-1.5">
        {draftGroups.map((g, i) => (
          <div key={i} className="grid grid-cols-[40px_1fr_48px_18px_24px] gap-1.5 items-center">
            <input
              className="compact-input text-center text-base"
              value={g.emoji}
              maxLength={2}
              onChange={(e) => updateDraft(i, { emoji: e.target.value })}
              title="小组图标"
            />
            <input
              className="compact-input"
              value={g.name}
              onChange={(e) => updateDraft(i, { name: e.target.value })}
              placeholder={`小组 ${i + 1} 名称`}
            />
            <input
              type="number"
              min={1}
              className="compact-input text-center"
              value={g.capacity}
              onChange={(e) => updateDraft(i, { capacity: Math.max(1, Number(e.target.value) || 1) })}
              title="人数上限"
            />
            <span className="text-[11px] text-ink-soft text-center shrink-0">人</span>
            {draftGroups.length > 2 ? (
              <button
                type="button"
                onClick={() => removeDraft(i)}
                className="text-rose-500 font-bold text-sm leading-none text-center"
                title="删除这个小组"
              >
                ✕
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
        <button type="button" onClick={addDraft} className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft">
          ➕ 再加一个小组
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {!session?.active ? (
          <>
            <button onClick={onStart} disabled={busy} className="kid-button-primary !py-2.5 !px-5 text-sm animate-pop">
              🚀 一键发起抢组
            </button>
            <button onClick={onSetup} disabled={busy} className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft">
              💾 仅保存，先不推送
            </button>
          </>
        ) : (
          <>
            {onPushAgain && (
              <button
                onClick={onPushAgain}
                disabled={busy}
                className={`kid-button-sm ${isPushed ? 'bg-emerald-50 border-2 border-emerald-200 text-emerald-700' : 'bg-white border-2 border-emerald-300 text-emerald-700 animate-pop'}`}
              >
                {isPushed ? '✅ 已推送到学生屏幕' : '📲 推送到学生屏幕'}
              </button>
            )}
            <button onClick={onReassign} disabled={busy} className="kid-button-sm bg-white border-2 border-violet-200 text-violet-700">
              🔄 一键调剂未分配同学
            </button>
            <button onClick={onClose} disabled={busy} className="kid-button-sm bg-white border-2 border-amber-200 text-amber-700">
              ⏹️ 结束抢组
            </button>
            <button onClick={onSync} disabled={busy || !classId} className="kid-button-sm bg-white border-2 border-emerald-200 text-emerald-700">
              📥 同步到小组管理
            </button>
          </>
        )}
        {session && (
          <button onClick={onClear} disabled={busy} className="kid-button-sm bg-white border-2 border-rose-200 text-rose-600">
            🗑️ 重置
          </button>
        )}
      </div>

      {session && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs font-bold text-ink-soft">
              {session.active
                ? session.phase === 'open'
                  ? '🟢 抢组进行中'
                  : '⏹️ 已结束'
                : '💾 已保存设置，尚未开始'}
              {unassigned.length > 0 && ` · ${unassigned.length} 人还未分组`}
              {allFull && session.phase === 'open' && ' · 🎉 全部小组已满员，可以结束抢组啦！'}
            </div>
            {totalCapacity > 0 && (
              <div className="flex items-center gap-2 text-xs font-bold text-ink-soft">
                <span>{totalJoined}/{totalCapacity} 人</span>
                <div className="w-24 h-2 rounded-full bg-orange-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${Math.min(100, (totalJoined / totalCapacity) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {session.groups.map((g) => {
              const full = g.members.length >= g.capacity;
              return (
                <div key={g.id} className={`rounded-2xl border-2 p-3 ${full ? 'border-emerald-200 bg-emerald-50/50' : 'border-orange-100 bg-white'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-extrabold">{g.emoji} {g.name}</div>
                    <span className={`tag ${full ? 'tag-yellow' : ''}`}>{g.members.length}/{g.capacity}{full ? ' 已满' : ''}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-orange-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${full ? 'bg-emerald-400' : 'bg-brand'}`}
                      style={{ width: `${Math.min(100, (g.members.length / g.capacity) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-ink-soft min-h-[2rem]">
                    {g.members.length > 0
                      ? g.members.map((m) => (
                          <span key={m.studentId} className="inline-block mr-2 mb-1">
                            {m.displayName}{m.autoAssigned ? '（调剂）' : ''}
                          </span>
                        ))
                      : '还没有同学'}
                  </div>
                </div>
              );
            })}
          </div>

          {unassigned.length > 0 && session.active && (
            <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-3">
              <div className="text-sm font-bold mb-2">未分配同学（可手动指定小组）</div>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 rounded-xl bg-white border border-violet-100 px-2 py-1 text-xs">
                    <span className="font-bold">{s.displayName}</span>
                    <select
                      className="text-xs border rounded-lg px-1 py-0.5"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          onManualAssign(s.id, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">分到…</option>
                      {session.groups.map((g) => (
                        <option key={g.id} value={g.id} disabled={g.members.length >= g.capacity}>
                          {g.emoji} {g.name} ({g.members.length}/{g.capacity})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
