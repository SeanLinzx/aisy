'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function QuotasPage() {
  const [items, setItems] = useState<any[]>([]);
  async function load() { setItems((await api.get('/quotas')).data); }
  useEffect(() => { load(); }, []);

  async function grant(uid: string) {
    const amount = Number(prompt('要分配多少额度？', '100') || 0);
    if (!amount) return;
    await api.post(`/quotas/grant/${uid}`, { amount, reason: '老师分配额度' });
    load();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">🎟 额度分配</h1>
      <div className="kid-card">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-orange-100"><th className="py-2">学生</th><th>角色</th><th>余额</th><th>月初额度</th><th></th></tr></thead>
          <tbody>
            {items.map(q => (
              <tr key={q.id} className="border-b border-orange-50">
                <td className="py-2">{q.user?.displayName} <span className="text-xs text-slate-400">({q.user?.username})</span></td>
                <td className="text-xs">{q.user?.role}</td>
                <td className="font-bold text-brand-dark">{q.balance}</td>
                <td>{q.monthly}</td>
                <td><button onClick={() => grant(q.user.id)} className="text-xs text-brand">+ 分配</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
