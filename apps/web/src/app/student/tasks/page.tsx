'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  useEffect(() => { api.get('/tasks').then(r => setTasks(r.data || [])); }, []);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-brand-dark">📋 课程任务</h1>
        <p className="text-slate-600 mt-1 text-sm">完成老师布置的任务，可以提交你的作品。</p>
      </header>
      {tasks.length === 0 && (
        <div className="kid-card text-center text-slate-500 space-y-2">
          <div>暂时没有任务</div>
          <Link href="/student/course" className="text-brand font-bold text-sm inline-block">去课程模式看看 →</Link>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {tasks.map((t) => (
          <Link key={t.id} href={`/student/tasks/${t.id}`} className="kid-card hover:-translate-y-0.5 transition">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t.title}</div>
              <span className="tag">{t.type}</span>
            </div>
            <p className="text-sm text-slate-500 mt-2 line-clamp-2">{t.description}</p>
            <div className="text-xs text-slate-400 mt-3">{t.class?.name || '所有班级'} · 已收到 {t._count?.submissions ?? 0} 份作品</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
