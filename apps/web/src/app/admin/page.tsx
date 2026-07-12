'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AdminHome() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get('/dashboard/overview').then(r => setData(r.data)); }, []);
  if (!data) return <div className="text-slate-500">加载中…</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-dark">📊 平台总览</h1>
      <div className="grid sm:grid-cols-5 gap-3">
        <Stat label="用户" value={data.users} />
        <Stat label="班级" value={data.classes} />
        <Stat label="素材" value={data.assets} />
        <Stat label="网页" value={data.webProjects} />
        <Stat label="AI 任务" value={data.jobs} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="kid-card">
          <h3 className="font-semibold mb-2">按角色分布</h3>
          <ul className="text-sm space-y-1">
            {data.byRole?.map((r: any) => (
              <li key={r.role} className="flex justify-between"><span>{r.role}</span><span>{r._count?._all}</span></li>
            ))}
          </ul>
        </div>
        <div className="kid-card">
          <h3 className="font-semibold mb-2">按 AI 任务类型</h3>
          <ul className="text-sm space-y-1">
            {data.byJobType?.map((r: any) => (
              <li key={r.jobType} className="flex justify-between"><span>{r.jobType}</span><span>{r._count?._all}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value }: any) {
  return <div className="kid-card !p-4"><div className="text-2xl font-bold text-brand-dark">{value}</div><div className="text-xs text-slate-500">{label}</div></div>;
}
