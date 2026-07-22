'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiAuth } from '@/lib/api';
import { useLanguage } from '@/contexts/language-context';

export default function SettingsPage() {
  const { t, locale } = useLanguage();
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
    setMsg(t('settings.saved', '已保存 ✅'));
    setTimeout(() => setMsg(null), 1500);
  }

  if (!me) return <div className="text-slate-500">{t('common.loading', '加载中…')}</div>;
  return (
    <div className="space-y-5 page-container--narrow">
      <h1 className="text-2xl font-bold text-brand-dark">⚙️ {t('settings.title', '我的设置')}</h1>
      <div className="kid-card space-y-3">
        <div className="text-sm text-slate-500">{t('settings.username', '用户名：')}{me.username}</div>
        <div>
          <label className="text-sm font-semibold">{t('settings.nickname', '昵称')}</label>
          <input className="kid-input mt-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold">{t('settings.changePassword', '修改密码')}</label>
          <input className="kid-input mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('settings.passwordHint', '留空则不修改')} />
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={save} className="kid-button-primary">{t('common.save', '保存')}</button>
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
        </div>
      </div>

      {quota && (
        <div className="kid-card">
          <h3 className="font-semibold">🎟 {t('settings.quota', '我的额度')}</h3>
          <div className="mt-2 text-sm text-slate-600">
            {t('settings.balance', '余额：')}
            <span className="text-brand-dark font-bold text-lg">{quota.account.balance}</span>
            {' / '}{t('settings.monthly', '月初')} {quota.account.monthly}
          </div>
          <div className="mt-3 text-xs text-slate-400">{t('settings.recentChanges', '最近变动')}</div>
          <div className="mt-1 space-y-1">
            {quota.recent.map((item: any) => (
              <div key={item.id} className="text-xs flex justify-between"><span>{item.reason}</span><span className={item.amount < 0 ? 'text-rose-500' : 'text-emerald-600'}>{item.amount > 0 ? '+' : ''}{item.amount}</span></div>
            ))}
          </div>
        </div>
      )}

      <div className="kid-card">
        <h3 className="font-semibold mb-2">🔗 {t('settings.shortcuts', '快捷入口')}</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/student/assets" className="text-brand font-bold">📦 {t('nav.assetsShort', '素材')}</Link>
          <Link href="/student/projects" className="text-brand font-bold">💻 {t('nav.projects', '我的网页')}</Link>
          <Link href="/student/explore" className="text-brand font-bold">🎧 {t('nav.explore', '探索模式')}</Link>
        </div>
      </div>
    </div>
  );
}
