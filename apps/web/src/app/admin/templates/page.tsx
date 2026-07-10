'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const CATEGORIES = ['text', 'image', 'video', 'web', 'poster', 'ppt', 'mixed', 'code'];

export default function TemplatesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', category: 'text', prompt: '' });
  async function load() { setItems((await api.get('/configs/templates')).data); }
  useEffect(() => { load(); }, []);
  async function add() {
    if (!form.name || !form.prompt) return;
    await api.post('/configs/templates', form);
    setForm({ name: '', category: 'text', prompt: '' });
    load();
  }
  async function remove(id: string) { if (!confirm('删除？')) return; await api.delete(`/configs/templates/${id}`); load(); }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">🪄 提示词模板</h1>
      <div className="kid-card grid sm:grid-cols-3 gap-2">
        <input className="kid-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="模板名" />
        <select className="kid-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
        <button onClick={add} className="kid-button-primary">+ 新建模板</button>
        <textarea className="kid-textarea sm:col-span-3" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="模板提示词内容" />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map(t => (
          <div key={t.id} className="kid-card">
            <div className="flex justify-between"><div className="font-semibold">{t.name}</div><span className="tag">{t.category}</span></div>
            <p className="text-sm text-slate-600 mt-2 line-clamp-3">{t.prompt}</p>
            {!t.builtIn && <button onClick={() => remove(t.id)} className="text-xs text-rose-500 mt-2">删除</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
