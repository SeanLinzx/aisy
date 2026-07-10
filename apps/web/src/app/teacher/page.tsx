'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function TeacherHome() {
  const overview = useQuery({ queryKey: ['t-overview'], queryFn: () => api.get('/dashboard/overview').then(r => r.data) });
  const classes = useQuery({ queryKey: ['t-classes'], queryFn: () => api.get('/classes/mine').then(r => r.data) });

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-dark">👨‍🏫 老师工作台</h1>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat label="学生数" value={overview.data?.users ?? '-'} emoji="🧒" />
        <Stat label="班级数" value={overview.data?.classes ?? '-'} emoji="🏫" />
        <Stat label="作品数" value={overview.data?.assets ?? '-'} emoji="🖼️" />
        <Stat label="网页项目" value={overview.data?.webProjects ?? '-'} emoji="🌐" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="kid-card">
          <h3 className="font-semibold mb-3">🏫 我的班级</h3>
          <div className="space-y-2">
            {classes.data?.map((c: any) => (
              <Link key={c.id} href={`/teacher/classes/${c.id}`} className="flex justify-between text-sm rounded-xl px-3 py-2 hover:bg-orange-50">
                <span>{c.name}</span>
                <span className="text-xs text-slate-400">{c._count?.members ?? 0} 人 · {c._count?.tasks ?? 0} 任务</span>
              </Link>
            ))}
            {classes.data?.length === 0 && <div className="text-sm text-slate-500">还没有班级</div>}
          </div>
        </div>
        <div className="kid-card">
          <h3 className="font-semibold mb-3">⚡ 最近 AI 任务</h3>
          <div className="space-y-1 text-sm">
            {overview.data?.recentJobs?.slice(0, 8).map((j: any) => (
              <div key={j.id} className="flex justify-between">
                <span className="truncate flex-1 mr-2">{j.user?.displayName} · {j.jobType}</span>
                <span className="text-xs text-slate-400">{j.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, emoji }: any) {
  return (
    <div className="kid-card !p-4">
      <div className="text-2xl">{emoji}</div>
      <div className="text-2xl font-bold text-brand-dark mt-1">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
