'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const ROLES = ['student', 'parent', 'teacher', 'admin'] as const;

export default function AdminUsers() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ username: '', displayName: '', password: '123456', role: 'student' });
  const [msg, setMsg] = useState<string | null>(null);

  async function load() { setItems((await api.get('/users', { params: { role: filter || undefined } })).data); }
  useEffect(() => { load(); }, [filter]);

  async function add() {
    setMsg(null);
    try { await api.post('/users', form); setMsg('✅ 已创建'); load(); }
    catch (e: any) { setMsg('❌ ' + e.message); }
  }
  async function setStatus(id: string, status: 'active' | 'disabled') {
    await api.patch(`/users/${id}`, { status }); load();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">👥 用户管理</h1>
      <div className="kid-card grid sm:grid-cols-5 gap-2">
        <input className="kid-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="用户名" />
        <input className="kid-input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="昵称" />
        <input className="kid-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="密码" />
        <select className="kid-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={add} className="kid-button-primary">+ 创建</button>
      </div>
      {msg && <div className="text-sm">{msg}</div>}
      <div className="flex gap-2">
        <button onClick={() => setFilter('')} className={`text-xs px-3 py-1 rounded-full ${!filter ? 'bg-brand text-white' : 'bg-orange-50 text-brand-dark'}`}>全部</button>
        {ROLES.map(r => <button key={r} onClick={() => setFilter(r)} className={`text-xs px-3 py-1 rounded-full ${filter === r ? 'bg-brand text-white' : 'bg-orange-50 text-brand-dark'}`}>{r}</button>)}
      </div>
      <div className="kid-card">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-slate-500 text-left border-b border-orange-100"><th className="py-2">昵称</th><th>用户名</th><th>角色</th><th>状态</th><th></th></tr></thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id} className="border-b border-orange-50">
                <td className="py-2">{u.displayName}</td>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
                <td>
                  {u.status === 'active'
                    ? <button onClick={() => setStatus(u.id, 'disabled')} className="text-xs text-rose-500">禁用</button>
                    : <button onClick={() => setStatus(u.id, 'active')} className="text-xs text-emerald-600">启用</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
