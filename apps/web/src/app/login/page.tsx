'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, apiAuth } from '@/lib/api';
import { isPadMode, PAD_DASHBOARD_BY_ROLE } from '@/lib/pad-mode';
import { useLanguage } from '@/contexts/language-context';

const dashboardByRole: Record<string, string> = isPadMode()
  ? PAD_DASHBOARD_BY_ROLE
  : {
      student: '/student',
      teacher: '/teacher',
      parent: '/parent',
      admin: '/admin',
    };

export default function LoginPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-ink-soft font-semibold">{t('login.loading', '加载中…')}</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const { t, tx } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiDown, setApiDown] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    api.get('/health').then(() => { if (!cancelled) setApiDown(false); }).catch(() => { if (!cancelled) setApiDown(true); });
    return () => { cancelled = true; };
  }, [error]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await apiAuth.login(username, password);
      const next = params.get('next') || dashboardByRole[r.user.role] || '/';
      router.push(next);
    } catch (err: any) {
      setError(err.message || t('login.failed', '登录失败'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center px-6 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="deco-blob bg-candy-yellow w-72 h-72 -top-10 left-10 animate-float-slow" />
        <div className="deco-blob bg-candy-pink w-72 h-72 top-1/3 -right-10 animate-float" />
        <div className="deco-blob bg-candy-sky w-80 h-80 -bottom-10 left-1/4 animate-float-slow" />
        {!isPadMode() && (
          <>
            <span className="absolute top-12 right-[18%] text-3xl animate-float select-none">⭐</span>
            <span className="absolute bottom-20 left-[12%] text-2xl animate-bounceSoft select-none">🎈</span>
            <span className="absolute top-1/3 left-[8%] text-3xl animate-float-slow select-none">🍭</span>
          </>
        )}
      </div>

      <div className="relative w-full max-w-md">
        <div className="kid-card !p-8 animate-pop">
          <div className="text-center">
            <div className="inline-flex items-center justify-center kid-emoji-bubble-lg bg-gradient-to-br from-amber-200 to-pink-300 animate-bounceSoft mb-4">
              {isPadMode() ? '📱' : '🎒'}
            </div>
            <h1 className="font-display text-3xl font-extrabold text-rainbow">
              {isPadMode() ? t('login.padTitle', '平板课堂登录') : t('login.title', '欢迎回来！')}
            </h1>
            <p className="text-sm text-ink-soft mt-2 font-semibold">
              {isPadMode()
                ? t('login.padSubtitle', '老师用平板控制台，学生用平板跟课 ✨')
                : t('login.subtitle', '用老师给你的账号和密码登录吧 ✨')}
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {apiDown && (
              <div className="text-sm font-semibold text-amber-900 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 leading-relaxed">
                {t('login.apiDown', '⚠️ 后端服务未连接（端口 3001）。请在终端进入')}{' '}
                <code className="text-xs bg-white/80 px-1 rounded">ai-camp</code>{' '}
                {t('login.apiDownRun', '目录，运行')}{' '}
                <code className="text-xs bg-white/80 px-1 rounded">./start-dev.sh</code>{' '}
                {t('login.apiDownThen', '启动后再登录。')}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-ink-soft mb-1.5">{t('login.username', '👤 用户名')}</label>
              <input
                className="kid-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('login.usernamePlaceholder', '例如：alice')}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-soft mb-1.5">{t('login.password', '🔑 密码')}</label>
              <input
                type="password"
                className="kid-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            {error && (
              <div className="text-sm font-semibold text-rose-700 bg-rose-50 border-2 border-rose-200 rounded-2xl px-4 py-2.5 shake-once">
                😢 {error}
              </div>
            )}
            <button className="kid-button-primary w-full text-lg" type="submit" disabled={loading}>
              {loading ? t('login.submitting', '登录中…') : t('login.submit', '🚀 一起出发！')}
            </button>
          </form>

          <Link href="/" className="block text-center mt-7 text-xs font-semibold text-ink-soft hover:text-brand transition">
            {t('login.backHome', '← 返回首页')}
          </Link>
        </div>

        <div className="mt-4 text-center text-xs text-ink-soft/70 font-semibold">
          {t('login.tip', '💡 小提示：登录后可以使用 AI 写文字、画画、做网页哦~')}
        </div>
      </div>
    </main>
  );
}
