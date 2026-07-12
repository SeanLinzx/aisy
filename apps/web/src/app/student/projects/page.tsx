'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { publishPath } from '@/lib/public-url';

export default function ProjectsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(null);

  async function load() {
    const [projects, homepage] = await Promise.all([
      api.get('/web-projects'),
      api.get('/homepages/mine').catch(() => ({ data: null })),
    ]);
    setItems(projects.data || []);
    setFeaturedId(homepage.data?.featuredWebProjectId ?? null);
  }
  useEffect(() => { load(); }, []);

  async function createNew() {
    const title = prompt('给你的新网页起个名字：', '我的新网页');
    if (!title) return;
    const r = await api.post('/web-projects', { title });
    location.href = `/student/web?id=${r.data.id}`;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">💻 我的网页</h1>
          <p className="text-slate-600 mt-1 text-sm">每个项目都可以有多个版本，发布后会有访问链接。课程里保存的网页也会出现在这里。</p>
        </div>
        <button onClick={createNew} className="kid-button-primary">+ 新建网页</button>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && (
          <div className="kid-card text-center text-slate-500 col-span-full">
            还没有网页项目。
            <Link href="/student/explore" className="text-brand font-bold ml-1">去探索模式</Link>
            或
            <Link href="/student/web" className="text-brand font-bold ml-1">网页工作台</Link>
            创建一个吧。
          </div>
        )}
        {items.map((p) => {
          const fromCourse = typeof p.description === 'string' && p.description.startsWith('课程 ·');
          const fromFreeCreate = typeof p.description === 'string' && p.description.startsWith('自由创作 ·');
          const isHomepage = featuredId === p.id;
          return (
          <div key={p.id} className={`kid-card !p-4 ${isHomepage ? 'ring-2 ring-emerald-300 border-emerald-200' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold truncate">{p.title}</div>
              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                {isHomepage && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">🏠 主页</span>
                )}
                {fromCourse && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">课程</span>}
                {fromFreeCreate && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold">自由创作</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{p.status === 'published' ? '已发布' : '草稿'}</span>
              </div>
            </div>
            {p.description && <div className="text-[11px] text-slate-400 mt-1 truncate">{p.description}</div>}
            <div className="text-xs text-slate-500 mt-1">v{p.currentVersion} · 共 {p._count?.versions} 个版本</div>
            <div className="mt-3 flex justify-between text-xs flex-wrap gap-2">
              <Link href={`/student/web?id=${p.id}`} className="text-brand">编辑 →</Link>
              {p.slug && (
                <>
                  {!isHomepage && (
                    <button
                      type="button"
                      className="text-emerald-600 font-bold"
                      onClick={async () => {
                        try {
                          await api.patch('/homepages/mine', { featuredWebProjectId: p.id });
                          setFeaturedId(p.id);
                        } catch (e: any) {
                          alert(e?.message || '设置失败');
                        }
                      }}
                    >
                      🏠 设为主页
                    </button>
                  )}
                  <a target="_blank" rel="noopener noreferrer" href={publishPath(p.slug)} className="text-emerald-600">访问 ↗</a>
                </>
              )}
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}
