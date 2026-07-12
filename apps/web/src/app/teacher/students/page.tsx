'use client';
import { useEffect, useState } from 'react';
import { api, apiDownloadHref } from '@/lib/api';
import { QrImage } from '@/components/qr-image';

interface StudentLink {
  id: string;
  username: string;
  displayName: string;
  homepageSlug: string | null;
  courseHomeUrl: string | null;
  growthUrl: string | null;
  featuredWebProject?: { title: string; slug: string } | null;
}

export default function StudentsPage() {
  const [items, setItems] = useState<StudentLink[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [form, setForm] = useState({ username: '', displayName: '', password: '123456' });
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const [links, cls] = await Promise.all([
      api.get('/homepages/teacher/student-links', { params: { classId: classId || undefined } }).then((r) => r.data),
      api.get('/classes').then((r) => r.data).catch(() => []),
    ]);
    setItems(links || []);
    setClasses(cls || []);
  }

  useEffect(() => { load(); }, [classId]);

  async function add() {
    setMsg(null);
    if (!form.username || !form.displayName) return;
    try {
      await api.post('/users', { ...form, role: 'student' });
      setForm({ username: '', displayName: '', password: '123456' });
      load();
      setMsg('✅ 学生账号已创建（已自动生成课程主页与成长历程链接）');
    } catch (e: any) {
      setMsg('❌ ' + e.message);
    }
  }

  function downloadZip(kind: 'course' | 'growth' | 'both') {
    const q = new URLSearchParams({ kind });
    if (classId) q.set('classId', classId);
    window.location.href = apiDownloadHref(`/exports/student-qrcodes.zip?${q.toString()}`);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">🧒 学生账号与分享链接</h1>
          <p className="text-slate-600 mt-1 text-sm">每位学生自动拥有「课程主页」和「成长历程」公开链接，可生成二维码并批量导出。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => downloadZip('course')} className="kid-button-ghost text-sm">⬇ 批量导出课程主页二维码</button>
          <button type="button" onClick={() => downloadZip('growth')} className="kid-button-ghost text-sm">⬇ 批量导出成长历程二维码</button>
          <button type="button" onClick={() => downloadZip('both')} className="kid-button-primary text-sm">⬇ 批量导出全部</button>
        </div>
      </header>

      <div className="kid-card grid sm:grid-cols-4 gap-2">
        <input className="kid-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="登录用户名" />
        <input className="kid-input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="昵称" />
        <input className="kid-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="初始密码" />
        <button onClick={add} className="kid-button-primary">+ 创建学生</button>
      </div>

      {classes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-ink-soft">筛选班级：</span>
          <button type="button" onClick={() => setClassId('')} className={`kid-button-sm ${!classId ? 'bg-brand text-white border-brand' : ''}`}>全部</button>
          {classes.map((c: any) => (
            <button key={c.id} type="button" onClick={() => setClassId(c.id)} className={`kid-button-sm ${classId === c.id ? 'bg-brand text-white border-brand' : ''}`}>{c.name}</button>
          ))}
        </div>
      )}

      {msg && <div className="text-sm">{msg}</div>}

      <div className="space-y-3">
        {items.map((s) => (
          <div key={s.id} className="kid-card !p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold text-lg">{s.displayName}</div>
                <div className="text-xs text-slate-500">@{s.username}</div>
                {s.featuredWebProject && (
                  <div className="text-xs text-emerald-600 mt-1">首页网页：{s.featuredWebProject.title}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="kid-button-sm"
              >
                {expanded === s.id ? '收起二维码' : '📱 查看链接与二维码'}
              </button>
            </div>

            {expanded === s.id && s.homepageSlug && (
              <div className="mt-4 grid md:grid-cols-2 gap-4 pt-4 border-t border-orange-100">
                <ShareBlock
                  title="📚 课程主页"
                  url={s.courseHomeUrl!}
                />
                <ShareBlock
                  title="📈 成长历程"
                  url={s.growthUrl!}
                />
              </div>
            )}

            {expanded === s.id && !s.homepageSlug && (
              <p className="text-sm text-rose-500 mt-3">该学生尚未生成主页 slug，请重新登录或联系管理员。</p>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="kid-card text-center text-slate-500">暂无学生</div>}
      </div>
    </div>
  );
}

function ShareBlock({ title, url }: { title: string; url: string }) {
  return (
    <div className="rounded-2xl bg-orange-50/80 border-2 border-orange-100 p-4 flex gap-4 items-start">
      <QrImage url={url} size={100} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="font-bold text-sm">{title}</div>
        <p className="text-xs text-slate-600 break-all">{url}</p>
        <div className="flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand">打开预览 ↗</a>
          <button
            type="button"
            className="text-xs font-bold text-slate-500"
            onClick={() => navigator.clipboard.writeText(url)}
          >
            复制链接
          </button>
        </div>
      </div>
    </div>
  );
}
