'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const ROLES = ['student', 'parent', 'teacher', 'admin'] as const;

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  status: string;
  passwordPlain?: string | null;
};

export default function AdminUsers() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ username: '', displayName: '', password: '123456', role: 'student' });
  const [msg, setMsg] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('123456');

  async function load() {
    setItems((await api.get('/users', { params: { role: filter || undefined } })).data);
  }
  useEffect(() => { load(); }, [filter]);

  async function add() {
    setMsg(null);
    try { await api.post('/users', form); setMsg('✅ 已创建'); load(); }
    catch (e: any) { setMsg('❌ ' + e.message); }
  }
  async function setStatus(id: string, status: 'active' | 'disabled') {
    await api.patch(`/users/${id}`, { status }); load();
  }

  async function savePassword(id: string) {
    if (!resetPassword || resetPassword.length < 4) {
      alert('密码至少 4 位');
      return;
    }
    await api.patch(`/users/${id}`, { password: resetPassword });
    setResetId(null);
    setResetPassword('123456');
    load();
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
      <div className="kid-card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-xs text-slate-500 text-left border-b border-orange-100">
              <th className="py-2 pr-3">昵称</th>
              <th className="pr-3">账号</th>
              <th className="pr-3">密码</th>
              <th className="pr-3">角色</th>
              <th className="pr-3">状态</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id} className="border-b border-orange-50">
                <td className="py-2 pr-3">{u.displayName}</td>
                <td className="pr-3 font-mono text-xs">{u.username}</td>
                <td className="pr-3">
                  {resetId === u.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        className="kid-input !py-1 !px-2 text-xs w-24 font-mono"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => savePassword(u.id)} className="text-xs text-brand font-bold">保存</button>
                      <button type="button" onClick={() => setResetId(null)} className="text-xs text-slate-400">取消</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-700">
                        {u.passwordPlain || <span className="text-slate-400">未记录</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setResetId(u.id);
                          setResetPassword(u.passwordPlain || '123456');
                        }}
                        className="text-[10px] text-violet-600 font-bold"
                      >
                        重置
                      </button>
                    </div>
                  )}
                </td>
                <td className="pr-3">{u.role}</td>
                <td className="pr-3">{u.status}</td>
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
