'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { courseHomePath, growthPath } from '@/lib/public-url';
import { resolveUploadPath } from '@/lib/upload-url';
import { QrImage } from '@/components/qr-image';

export default function HomepagePage() {
  const [hp, setHp] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [featuredId, setFeaturedId] = useState<string>('');
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await api.get('/homepages/mine');
    setHp(r.data);
    setTitle(r.data.title);
    setIntro(r.data.intro || '');
    setFeaturedId(r.data.featuredWebProjectId || '');
  }

  useEffect(() => { load(); }, []);

  async function save() {
    await api.patch('/homepages/mine', {
      title,
      intro,
      featuredWebProjectId: featuredId || null,
    });
    setMsg('已保存 ✅');
    load();
    setTimeout(() => setMsg(null), 1500);
  }

  if (!hp) return <div className="text-slate-500">加载中…</div>;

  const coursePath = courseHomePath(hp.slug);
  const growthP = growthPath(hp.slug);

  return (
    <div className="space-y-5 max-w-4xl">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">🌟 我的主页</h1>
          <p className="text-slate-600 mt-1 text-sm">设置你的课程主页展示内容，老师可以分享链接和二维码给家长。</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={coursePath} target="_blank" className="kid-button-ghost text-sm">📚 预览课程主页</Link>
          <Link href={growthP} target="_blank" className="kid-button-ghost text-sm">📈 预览成长历程</Link>
        </div>
      </header>

      <div className="kid-card grid sm:grid-cols-2 gap-6">
        <div className="text-center space-y-2">
          <QrImage url={hp.courseHomeUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}${coursePath}`} size={110} label="课程主页" />
          <p className="text-xs text-slate-500 break-all">{hp.courseHomeUrl || coursePath}</p>
        </div>
        <div className="text-center space-y-2">
          <QrImage url={hp.growthUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}${growthP}`} size={110} label="成长历程" />
          <p className="text-xs text-slate-500 break-all">{hp.growthUrl || growthP}</p>
        </div>
      </div>

      <div className="kid-card space-y-3">
        <div>
          <label className="text-sm font-semibold">主页标题</label>
          <input className="kid-input mt-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold">个人介绍</label>
          <textarea className="kid-textarea mt-2" value={intro} onChange={(e) => setIntro(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold">🌐 课程主页展示网页</label>
          <p className="text-xs text-slate-500 mt-1 mb-2">选一个已发布的网页作为你的「课程主页」首屏；不选则自动展示作品合集。</p>
          <select
            className="kid-input"
            value={featuredId}
            onChange={(e) => setFeaturedId(e.target.value)}
          >
            <option value="">（默认）作品合集模式</option>
            {hp.webProjects?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          {hp.webProjects?.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">还没有已发布的网页，去<Link href="/student/web" className="underline mx-1">网页工作台</Link>或课程里做一个吧。</p>
          )}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={save} className="kid-button-primary">保存</button>
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="kid-card">
          <h3 className="font-semibold">🖼️ 我的作品（最新 12 个）</h3>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {hp.assets?.slice(0, 12).map((a: any) => (
              <div key={a.id} className="aspect-square bg-orange-50 rounded-xl overflow-hidden flex items-center justify-center text-xs text-slate-500">
                {a.url ? <img src={resolveUploadPath(a.url)} alt="" className="w-full h-full object-cover" /> : <span className="px-2 text-center">{a.title}</span>}
              </div>
            ))}
          </div>
          <Link href="/student/assets" className="text-xs font-bold text-brand mt-3 inline-block">去素材库 →</Link>
        </section>
        <section className="kid-card">
          <h3 className="font-semibold">🌐 我的网页作品</h3>
          <div className="mt-3 space-y-2">
            {hp.webProjects?.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-orange-50 text-sm">
                <a target="_blank" href={`/p/${p.slug}`} className="truncate flex-1">{p.title}</a>
                <button
                  type="button"
                  onClick={() => { setFeaturedId(p.id); }}
                  className={`text-xs font-bold shrink-0 ${featuredId === p.id ? 'text-emerald-600' : 'text-brand'}`}
                >
                  {featuredId === p.id ? '✓ 已选' : '设为主页'}
                </button>
              </div>
            ))}
            {hp.webProjects?.length === 0 && <div className="text-xs text-slate-500">还没有发布的网页</div>}
          </div>
          <Link href="/student/projects" className="text-xs font-bold text-brand mt-3 inline-block">我的网页项目 →</Link>
        </section>
      </div>
    </div>
  );
}
