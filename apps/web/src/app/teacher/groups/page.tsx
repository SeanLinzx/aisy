'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [name, setName] = useState('');
  async function load() {
    setGroups((await api.get('/groups')).data);
    setClasses((await api.get('/classes')).data);
  }
  useEffect(() => { load(); }, []);
  async function add() { if (!classId || !name) return; await api.post('/groups', { classId, name }); setName(''); load(); }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">👯 小组管理</h1>
      <div className="kid-card flex gap-2 items-center">
        <select className="kid-input" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">选择班级</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="kid-input flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="小组名称" />
        <button onClick={add} className="kid-button-primary">新建</button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {groups.map(g => (
          <div key={g.id} className="kid-card">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">{g.name}</div>
              <span className="text-lg font-extrabold text-brand">{g.points ?? 0} 分</span>
            </div>
            <div className="text-xs text-slate-500">所属班级：{g.class?.name}</div>
            <div className="mt-2 text-sm">成员：{g.members?.map((m: any) => m.user.displayName).join('、') || '暂无'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
