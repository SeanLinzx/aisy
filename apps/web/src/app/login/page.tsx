'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, apiAuth } from '@/lib/api';
import { isPadMode, PAD_DASHBOARD_BY_ROLE } from '@/lib/pad-mode';

const dashboardByRole: Record<string, string> = isPadMode()
  ? PAD_DASHBOARD_BY_ROLE
  : {
      student: '/student',
      teacher: '/teacher',
      parent: '/parent',
      admin: '/admin',
    };

const QUICK_USERS: Array<{ u: string; emoji: string; label: string; cls: string }> = [
  { u: 'alice',    emoji: '👧', label: '小朋友 Alice', cls: 'tag-pink' },
  { u: 'bob',      emoji: '👦', label: '小朋友 Bob',   cls: 'tag-sky' },
  { u: 'teacher1', emoji: '👩‍🏫', label: '老师',       cls: 'tag-mint' },
  { u: 'parent1',  emoji: '👨‍👧', label: '家长',       cls: 'tag-yellow' },
  { u: 'admin',    emoji: '🛠️', label: '管理员',      cls: 'tag-purple' },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-ink-soft font-semibold">加载中…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
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
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  }

  function quick(u: string) {
    setUsername(u);
    setPassword('123456');
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
              {isPadMode() ? '平板课堂登录' : '欢迎回来！'}
            </h1>
            <p className="text-sm text-ink-soft mt-2 font-semibold">
              {isPadMode()
                ? '老师用平板控制台，学生用平板跟课 ✨'
                : '用老师给你的账号和密码登录吧 ✨'}
            </p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {apiDown && (
              <div className="text-sm font-semibold text-amber-900 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 leading-relaxed">
                ⚠️ 后端服务未连接（端口 3001）。请在终端进入 <code className="text-xs bg-white/80 px-1 rounded">ai-camp</code> 目录，运行 <code className="text-xs bg-white/80 px-1 rounded">./start-dev.sh</code> 启动后再登录。
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-ink-soft mb-1.5">👤 用户名</label>
              <input
                className="kid-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如：alice"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-soft mb-1.5">🔑 密码</label>
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
              {loading ? '登录中…' : '🚀 一起出发！'}
            </button>
          </form>

          <div className="mt-7 border-t-2 border-dashed border-orange-200 pt-5">
            <div className="text-xs font-bold text-ink-soft mb-2.5 flex items-center gap-1.5">
              🎁 演示账号 <span className="text-ink-soft/70 font-medium">（密码统一为 123456）</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_USERS.map((u) => (
                <button
                  key={u.u}
                  type="button"
                  onClick={() => quick(u.u)}
                  className={`${u.cls} hover:wiggle cursor-pointer transition-transform hover:scale-105 active:scale-95`}
                  title={`一键填入 ${u.u}`}
                >
                  <span className="mr-1">{u.emoji}</span>{u.label}
                </button>
              ))}
            </div>
          </div>

          <Link href="/" className="block text-center mt-6 text-xs font-semibold text-ink-soft hover:text-brand transition">
            ← 返回首页
          </Link>
        </div>

        <div className="mt-4 text-center text-xs text-ink-soft/70 font-semibold">
          💡 小提示：登录后可以使用 AI 写文字、画画、做网页哦~
        </div>
      </div>
    </main>
  );
}
