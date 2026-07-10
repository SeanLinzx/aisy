'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ReviewsPage() {
  const [data, setData] = useState<{ assets: any[]; webProjects: any[] } | null>(null);
  async function load() { setData((await api.get('/reviews/pending')).data); }
  useEffect(() => { load(); }, []);

  async function reviewAsset(id: string, status: 'approved' | 'rejected') {
    await api.post(`/reviews/asset/${id}`, { status });
    load();
  }
  async function reviewWeb(id: string, status: 'approved' | 'rejected') {
    await api.post(`/reviews/web-project/${id}`, { status });
    load();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">✅ 作品审核</h1>
      <p className="text-sm text-slate-500">系统默认自动通过；只有被「敏感」或「待审」标记的作品才会出现在这里。</p>
      <section className="kid-card">
        <h3 className="font-semibold mb-3">待审素材（{data?.assets.length ?? 0}）</h3>
        {data?.assets.length === 0 && <div className="text-slate-500 text-sm">没有待审素材</div>}
        <div className="space-y-2">
          {data?.assets.map(a => (
            <div key={a.id} className="border border-orange-100 rounded-xl px-3 py-2 flex justify-between items-center text-sm">
              <span>{a.title} · 来自 {a.owner?.displayName}</span>
              <div className="flex gap-2">
                <button onClick={() => reviewAsset(a.id, 'approved')} className="text-emerald-600">通过</button>
                <button onClick={() => reviewAsset(a.id, 'rejected')} className="text-rose-500">拒绝</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="kid-card">
        <h3 className="font-semibold mb-3">待审网页（{data?.webProjects.length ?? 0}）</h3>
        {data?.webProjects.length === 0 && <div className="text-slate-500 text-sm">没有待审网页</div>}
        <div className="space-y-2">
          {data?.webProjects.map(p => (
            <div key={p.id} className="border border-orange-100 rounded-xl px-3 py-2 flex justify-between items-center text-sm">
              <span>{p.title} · {p.owner?.displayName}</span>
              <div className="flex gap-2">
                <button onClick={() => reviewWeb(p.id, 'approved')} className="text-emerald-600">通过</button>
                <button onClick={() => reviewWeb(p.id, 'rejected')} className="text-rose-500">拒绝</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
