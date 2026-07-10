'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function LogsPage() {
  const [tab, setTab] = useState<'jobs' | 'audit'>('jobs');
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api.get(`/logs/${tab}`).then(r => setItems(r.data || []));
  }, [tab]);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">📜 调用日志</h1>
      <div className="flex gap-2">
        <button onClick={() => setTab('jobs')} className={tab === 'jobs' ? 'kid-button-primary text-sm' : 'kid-button-ghost text-sm'}>AI 任务</button>
        <button onClick={() => setTab('audit')} className={tab === 'audit' ? 'kid-button-primary text-sm' : 'kid-button-ghost text-sm'}>审计</button>
      </div>
      <div className="kid-card overflow-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-slate-500 border-b border-orange-100">
            {tab === 'jobs' ? <><th className="py-2">时间</th><th>用户</th><th>类型</th><th>供应商</th><th>状态</th><th>错误</th></>
                            : <><th className="py-2">时间</th><th>动作</th><th>用户</th><th>详情</th></>}
          </tr></thead>
          <tbody>
            {items.map((it: any) => tab === 'jobs' ? (
              <tr key={it.id} className="border-b border-orange-50">
                <td className="py-1">{new Date(it.createdAt).toLocaleString()}</td>
                <td>{it.user?.displayName}</td>
                <td>{it.jobType}</td>
                <td>{it.providerName}</td>
                <td>{it.status}</td>
                <td className="text-rose-500 truncate max-w-xs">{it.error}</td>
              </tr>
            ) : (
              <tr key={it.id} className="border-b border-orange-50">
                <td className="py-1">{new Date(it.createdAt).toLocaleString()}</td>
                <td>{it.action}</td>
                <td>{it.user?.displayName}</td>
                <td className="truncate max-w-md">{JSON.stringify(it.detail)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
