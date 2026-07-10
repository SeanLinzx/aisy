'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SensitivePage() {
  const [items, setItems] = useState<any[]>([]);
  const [word, setWord] = useState('');
  async function load() { setItems((await api.get('/configs/sensitive-words')).data); }
  useEffect(() => { load(); }, []);
  async function add() { if (!word) return; await api.post('/configs/sensitive-words', { word }); setWord(''); load(); }
  async function toggle(id: string, enabled: boolean) { await api.patch(`/configs/sensitive-words/${id}`, { enabled }); load(); }
  async function remove(id: string) { if (!confirm('删除？')) return; await api.delete(`/configs/sensitive-words/${id}`); load(); }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">🚫 敏感词</h1>
      <div className="kid-card flex gap-2"><input className="kid-input flex-1" value={word} onChange={(e) => setWord(e.target.value)} placeholder="新增词" /><button onClick={add} className="kid-button-primary">+ 添加</button></div>
      <div className="kid-card">
        <ul className="space-y-1 text-sm">
          {items.map(w => (
            <li key={w.id} className="flex items-center justify-between border-b border-orange-50 py-1">
              <span>{w.word} <span className="text-xs text-slate-400">严重度 {w.severity}</span></span>
              <div className="flex gap-2 text-xs">
                <button onClick={() => toggle(w.id, !w.enabled)}>{w.enabled ? '启用中（点击禁用）' : '已禁用（点击启用）'}</button>
                <button onClick={() => remove(w.id)} className="text-rose-500">删除</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
