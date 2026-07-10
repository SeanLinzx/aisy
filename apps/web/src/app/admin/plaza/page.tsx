'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AdminPlaza() {
  const [items, setItems] = useState<any[]>([]);
  async function load() { setItems((await api.get('/plaza')).data); }
  useEffect(() => { load(); }, []);
  async function feature(id: string, featured: boolean) { await api.patch(`/plaza/${id}/featured`, { featured }); load(); }
  async function remove(id: string) { if (!confirm('从广场移除？')) return; await api.delete(`/plaza/${id}`); load(); }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">🌟 展示广场管理</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(it => (
          <div key={it.id} className="kid-card !p-3">
            {it.coverUrl && <img src={it.coverUrl} className="w-full h-32 object-cover rounded-xl" />}
            <div className="font-semibold mt-2">{it.title}</div>
            <div className="text-xs text-slate-500">{it.targetType} · {it.targetId}</div>
            <div className="mt-2 flex justify-between text-xs">
              <button onClick={() => feature(it.id, !it.featured)} className={it.featured ? 'text-amber-600' : 'text-slate-500'}>{it.featured ? '⭐ 已精选' : '设为精选'}</button>
              <button onClick={() => remove(it.id)} className="text-rose-500">移除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
