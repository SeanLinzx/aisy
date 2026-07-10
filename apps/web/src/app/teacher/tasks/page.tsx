'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const TYPES = ['text', 'image', 'video', 'web', 'poster', 'ppt', 'mixed'];

export default function TeacherTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', description: '', classId: '', type: 'mixed' });

  async function load() {
    setTasks((await api.get('/tasks', { params: { mine: '1' } })).data);
    setClasses((await api.get('/classes/mine')).data);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.title) return;
    await api.post('/tasks', { ...form, classId: form.classId || undefined });
    setForm({ title: '', description: '', classId: '', type: 'mixed' });
    load();
  }

  async function remove(id: string) {
    if (!confirm('删除该任务？')) return;
    await api.delete(`/tasks/${id}`);
    load();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">📋 任务管理</h1>
      <div className="kid-card grid sm:grid-cols-2 gap-2">
        <input className="kid-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="任务标题" />
        <select className="kid-input" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
          <option value="">全班级</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="kid-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={add} className="kid-button-primary">+ 发布任务</button>
        <textarea className="kid-textarea sm:col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="任务说明" />
      </div>
      <div className="space-y-3">
        {tasks.map(t => (
          <div key={t.id} className="kid-card flex items-start justify-between">
            <div>
              <div className="font-semibold">{t.title}</div>
              <div className="text-xs text-slate-500 mt-1">{t.class?.name || '所有班级'} · {t.type} · 收到 {t._count?.submissions ?? 0} 份</div>
              <p className="text-sm text-slate-600 mt-1 line-clamp-2">{t.description}</p>
            </div>
            <button onClick={() => remove(t.id)} className="text-rose-500 text-sm">删除</button>
          </div>
        ))}
      </div>
    </div>
  );
}
