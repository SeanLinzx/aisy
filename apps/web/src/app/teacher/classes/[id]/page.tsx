'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [pickStudent, setPickStudent] = useState('');
  const [selectedAdd, setSelectedAdd] = useState<Record<string, boolean>>({});
  const [selectedMember, setSelectedMember] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const [cls, allStudents] = await Promise.all([
      api.get(`/classes/${id}`).then((r) => r.data),
      api.get('/users', { params: { role: 'student' } }).then((r) => r.data),
    ]);
    setC(cls);
    setStudents(allStudents || []);
    const memberIds = new Set((cls?.members || []).map((m: any) => m.user.id));
    setSelectedAdd((prev) => {
      const next: Record<string, boolean> = {};
      for (const s of allStudents || []) {
        if (memberIds.has(s.id) && prev[s.id]) next[s.id] = true;
      }
      return next;
    });
    setSelectedMember((prev) => {
      const next: Record<string, boolean> = {};
      for (const m of cls?.members || []) {
        if (m.user.role !== 'teacher' && prev[m.user.id]) next[m.user.id] = true;
      }
      return next;
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  const memberIds = useMemo(() => new Set((c?.members || []).map((m: any) => m.user.id)), [c]);
  const availableStudents = useMemo(
    () => students.filter((s) => !memberIds.has(s.id)),
    [students, memberIds],
  );
  const removableMembers = useMemo(
    () => (c?.members || []).filter((m: any) => m.user.role !== 'teacher'),
    [c],
  );

  const selectedAddIds = availableStudents.filter((s) => selectedAdd[s.id]).map((s) => s.id);
  const selectedMemberIds = removableMembers.filter((m: any) => selectedMember[m.user.id]).map((m: any) => m.user.id);
  const allAddSelected = availableStudents.length > 0 && selectedAddIds.length === availableStudents.length;
  const allMemberSelected = removableMembers.length > 0 && selectedMemberIds.length === removableMembers.length;

  async function add() {
    if (!pickStudent) return;
    setMsg(null);
    await api.post(`/classes/${id}/members`, { userId: pickStudent });
    setPickStudent('');
    load();
    setMsg('✅ 已加入 1 名学生');
  }

  async function batchAdd() {
    if (selectedAddIds.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.post(`/classes/${id}/members/batch`, { action: 'add', userIds: selectedAddIds });
      setSelectedAdd({});
      await load();
      setMsg(`✅ ${r.data.summary}${r.data.failed ? `，${r.data.failed} 人失败` : ''}`);
    } catch (e: any) {
      setMsg('❌ ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(uid: string) {
    if (!confirm('移除该成员？')) return;
    setMsg(null);
    await api.delete(`/classes/${id}/members/${uid}`);
    load();
    setMsg('✅ 已移除');
  }

  async function batchRemove() {
    if (selectedMemberIds.length === 0) return;
    if (!confirm(`确定将选中的 ${selectedMemberIds.length} 名学生移出本班？`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.post(`/classes/${id}/members/batch`, { action: 'remove', userIds: selectedMemberIds });
      setSelectedMember({});
      await load();
      setMsg(`✅ ${r.data.summary}${r.data.failed ? `，${r.data.failed} 人失败` : ''}`);
    } catch (e: any) {
      setMsg('❌ ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleAddAll() {
    if (allAddSelected) setSelectedAdd({});
    else setSelectedAdd(Object.fromEntries(availableStudents.map((s) => [s.id, true])));
  }

  function toggleMemberAll() {
    if (allMemberSelected) setSelectedMember({});
    else setSelectedMember(Object.fromEntries(removableMembers.map((m: any) => [m.user.id, true])));
  }

  if (!c) return <div className="text-slate-500">加载中…</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">🏫 {c.name}</h1>

      <div className="kid-card space-y-3">
        <h3 className="font-semibold">添加学生</h3>
        <div className="flex gap-2 flex-wrap">
          <select className="kid-input flex-1 min-w-[200px]" value={pickStudent} onChange={(e) => setPickStudent(e.target.value)}>
            <option value="">请选择学生（单个加入）</option>
            {availableStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName} ({s.username})
              </option>
            ))}
          </select>
          <button onClick={add} className="kid-button-primary">
            加入
          </button>
        </div>

        {availableStudents.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-orange-100">
              <button type="button" onClick={toggleAddAll} className="kid-button-sm">
                {allAddSelected ? '取消全选' : '全选待加入学生'}
              </button>
              <span className="text-xs font-bold text-ink-soft">已选 {selectedAddIds.length} 人</span>
              <button
                type="button"
                disabled={busy || selectedAddIds.length === 0}
                onClick={batchAdd}
                className="kid-button-primary text-sm disabled:opacity-40"
              >
                批量加入班级
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {availableStudents.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm cursor-pointer ${
                    selectedAdd[s.id] ? 'border-brand bg-orange-50/80' : 'border-orange-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!selectedAdd[s.id]}
                    onChange={() =>
                      setSelectedAdd((prev) => {
                        const next = { ...prev };
                        if (next[s.id]) delete next[s.id];
                        else next[s.id] = true;
                        return next;
                      })
                    }
                    className="w-4 h-4 accent-brand shrink-0"
                  />
                  <span className="min-w-0 truncate">
                    {s.displayName} <span className="text-xs text-slate-400">({s.username})</span>
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
        {availableStudents.length === 0 && (
          <p className="text-xs text-ink-soft">所有学生账号都已在班级中，或暂无学生账号。</p>
        )}
      </div>

      <div className="kid-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">成员（{c.members?.length}）</h3>
          {removableMembers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={toggleMemberAll} className="kid-button-sm">
                {allMemberSelected ? '取消全选' : '全选学生'}
              </button>
              <span className="text-xs font-bold text-ink-soft">已选 {selectedMemberIds.length} 人</span>
              <button
                type="button"
                disabled={busy || selectedMemberIds.length === 0}
                onClick={batchRemove}
                className="kid-button-ghost text-sm text-rose-600 border-rose-200 disabled:opacity-40"
              >
                批量移除
              </button>
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {c.members?.map((m: any) => {
            const removable = m.user.role !== 'teacher';
            const checked = !!selectedMember[m.user.id];
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-2 text-sm ${
                  checked ? 'border-brand bg-orange-50/80' : 'border-orange-100'
                }`}
              >
                {removable ? (
                  <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedMember((prev) => {
                          const next = { ...prev };
                          if (next[m.user.id]) delete next[m.user.id];
                          else next[m.user.id] = true;
                          return next;
                        })
                      }
                      className="w-4 h-4 accent-brand shrink-0"
                    />
                    <span className="min-w-0 truncate">
                      {m.user.displayName}{' '}
                      <span className="text-xs text-slate-400">
                        ({m.user.username} · {m.user.role})
                      </span>
                    </span>
                  </label>
                ) : (
                  <span className="min-w-0 truncate flex-1">
                    {m.user.displayName}{' '}
                    <span className="text-xs text-slate-400">
                      ({m.user.username} · {m.user.role})
                    </span>
                  </span>
                )}
                {removable && (
                  <button onClick={() => remove(m.user.id)} className="text-xs text-rose-500 shrink-0">
                    移除
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="kid-card">
        <h3 className="font-semibold mb-2">任务（{c.tasks?.length}）</h3>
        <ul className="text-sm space-y-1">
          {c.tasks?.map((t: any) => (
            <li key={t.id}>📋 {t.title}</li>
          ))}
        </ul>
      </div>

      {msg && <div className="text-sm">{msg}</div>}
    </div>
  );
}
