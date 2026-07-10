'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [pickStudent, setPickStudent] = useState('');

  async function load() {
    setC((await api.get(`/classes/${id}`)).data);
    setStudents((await api.get('/users', { params: { role: 'student' } })).data);
  }
  useEffect(() => { load(); }, [id]);

  async function add() { if (!pickStudent) return; await api.post(`/classes/${id}/members`, { userId: pickStudent }); setPickStudent(''); load(); }
  async function remove(uid: string) { if (!confirm('移除该成员？')) return; await api.delete(`/classes/${id}/members/${uid}`); load(); }

  if (!c) return <div className="text-slate-500">加载中…</div>;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">🏫 {c.name}</h1>
      <div className="kid-card">
        <h3 className="font-semibold mb-2">添加学生</h3>
        <div className="flex gap-2">
          <select className="kid-input flex-1" value={pickStudent} onChange={(e) => setPickStudent(e.target.value)}>
            <option value="">请选择学生</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.displayName} ({s.username})</option>)}
          </select>
          <button onClick={add} className="kid-button-primary">加入</button>
        </div>
      </div>
      <div className="kid-card">
        <h3 className="font-semibold mb-2">成员（{c.members?.length}）</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {c.members?.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between border border-orange-100 rounded-xl px-3 py-2 text-sm">
              <span>{m.user.displayName} <span className="text-xs text-slate-400">({m.user.username} · {m.user.role})</span></span>
              {m.user.role !== 'teacher' && <button onClick={() => remove(m.user.id)} className="text-xs text-rose-500">移除</button>}
            </div>
          ))}
        </div>
      </div>
      <div className="kid-card">
        <h3 className="font-semibold mb-2">任务（{c.tasks?.length}）</h3>
        <ul className="text-sm space-y-1">
          {c.tasks?.map((t: any) => <li key={t.id}>📋 {t.title}</li>)}
        </ul>
      </div>
    </div>
  );
}
