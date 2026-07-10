'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiAuth } from '@/lib/api';

export default function SettingsPage() {
  const [me, setMe] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [quota, setQuota] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiAuth.me().then((u) => { setMe(u); setDisplayName(u.displayName); });
    api.get('/quotas/mine').then(r => setQuota(r.data));
  }, []);

  async function save() {
    setMsg(null);
    await api.patch(`/users/${me.id}`, { displayName, password: password || undefined });
    setPassword('');
    setMsg('已保存 ✅'); setTimeout(() => setMsg(null), 1500);
  }

  if (!me) return <div className="text-slate-500">加载中…</div>;
  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-dark">⚙️ 我的设置</h1>
      <div className="kid-card space-y-3">
        <div className="text-sm text-slate-500">用户名：{me.username}</div>
        <div>
          <label className="text-sm font-semibold">昵称</label>
          <input className="kid-input mt-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold">修改密码</label>
          <input className="kid-input mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="留空则不修改" />
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={save} className="kid-button-primary">保存</button>
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
        </div>
      </div>

      {quota && (
        <div className="kid-card">
          <h3 className="font-semibold">🎟 我的额度</h3>
          <div className="mt-2 text-sm text-slate-600">余额：<span className="text-brand-dark font-bold text-lg">{quota.account.balance}</span> / 月初 {quota.account.monthly}</div>
          <div className="mt-3 text-xs text-slate-400">最近变动</div>
          <div className="mt-1 space-y-1">
            {quota.recent.map((t: any) => (
              <div key={t.id} className="text-xs flex justify-between"><span>{t.reason}</span><span className={t.amount < 0 ? 'text-rose-500' : 'text-emerald-600'}>{t.amount > 0 ? '+' : ''}{t.amount}</span></div>
            ))}
          </div>
        </div>
      )}

      <div className="kid-card">
        <h3 className="font-semibold mb-2">🔗 快捷入口</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/student/homepage" className="text-brand font-bold">🌟 我的主页</Link>
          <Link href="/student/assets" className="text-brand font-bold">📦 素材库</Link>
          <Link href="/student/projects" className="text-brand font-bold">💻 我的网页</Link>
          <Link href="/student/explore" className="text-brand font-bold">🎧 探索模式</Link>
        </div>
      </div>
    </div>
  );
}
