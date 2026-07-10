'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ProvidersPage() {
  const [items, setItems] = useState<any[]>([]);
  async function load() { setItems((await api.get('/ai-providers')).data); }
  useEffect(() => { load(); }, []);

  async function toggle(id: string, status: 'active' | 'disabled') {
    await api.patch(`/ai-providers/${id}/status`, { status }); load();
  }
  async function toggleModel(id: string, enabled: boolean) {
    await api.patch(`/ai-providers/models/${id}/enabled`, { enabled }); load();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">🔌 AI 供应商管理</h1>
      <p className="text-sm text-slate-500">关闭某个供应商后，依赖该供应商的所有调用会自动回退到其他可用供应商（最终回退到 Mock）。</p>
      {items.map(p => (
        <div key={p.id} className="kid-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{p.displayName} <span className="text-xs text-slate-400">({p.name})</span></div>
              <div className="text-xs text-slate-500">{p.baseUrl || '内置'} · 类型 {p.type}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggle(p.id, p.status === 'active' ? 'disabled' : 'active')}
                className={p.status === 'active' ? 'kid-button-ghost text-sm' : 'kid-button-primary text-sm'}>
                {p.status === 'active' ? '禁用' : '启用'}
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">模型列表</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {p.models?.map((m: any) => (
              <button key={m.id} onClick={() => toggleModel(m.id, !m.enabled)}
                className={`px-2 py-1 rounded-full text-xs border ${m.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {m.displayName} · {m.capability}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
