'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ClassesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  async function load() { setItems((await api.get('/classes')).data); }
  useEffect(() => { load(); }, []);
  async function add() { if (!name) return; await api.post('/classes', { name }); setName(''); load(); }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">🏫 班级管理</h1>
      <div className="kid-card flex gap-2 items-center">
        <input className="kid-input flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="新班级名称" />
        <button onClick={add} className="kid-button-primary">新建班级</button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map(c => (
          <Link key={c.id} href={`/teacher/classes/${c.id}`} className="kid-card hover:-translate-y-0.5 transition">
            <div className="font-semibold">{c.name}</div>
            <div className="text-xs text-slate-500 mt-1">代码：{c.code} · 班主任：{c.owner?.displayName}</div>
            <div className="text-xs text-slate-400 mt-2">{c._count?.members ?? 0} 成员 · {c._count?.groups ?? 0} 小组 · {c._count?.tasks ?? 0} 任务</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
