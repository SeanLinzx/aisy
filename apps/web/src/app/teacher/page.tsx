'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

const ENTRIES = [
  {
    href: '/teacher/assets',
    title: '学生素材',
    desc: '浏览、下载小朋友在课上和课后生成的图片、文字与视频。',
    emoji: '📦',
    cta: '查看素材库 →',
    card: 'bg-gradient-to-br from-sky-100 to-blue-200 border-2 border-sky-100 text-ink',
    featured: false,
  },
  {
    href: '/teacher/reviews',
    title: '作品审核',
    desc: '待审核作品一键通过或驳回，保障内容安全。',
    emoji: '✅',
    cta: '去审核 →',
    card: 'bg-gradient-to-br from-emerald-100 to-teal-200 border-2 border-emerald-100 text-ink',
    featured: false,
  },
  {
    href: '/teacher/students',
    title: '学生账号',
    desc: '添加、重置密码，管理参与训练营的小朋友账号。',
    emoji: '🧒',
    cta: '管理学生 →',
    card: 'bg-gradient-to-br from-amber-100 to-orange-200 border-2 border-orange-100 text-ink',
    featured: false,
  },
  {
    href: '/teacher/classes',
    title: '班级管理',
    desc: '创建班级、分配学生，组织课堂与分组。',
    emoji: '🏫',
    cta: '进入班级 →',
    card: 'bg-gradient-to-br from-violet-100 to-purple-200 border-2 border-violet-100 text-ink',
    featured: false,
  },
  {
    href: '/teacher/groups',
    title: '小组与积分',
    desc: '编辑小组名单，为各组加分并查看排名。',
    emoji: '👯',
    cta: '管理小组 →',
    card: 'bg-gradient-to-br from-pink-100 to-rose-200 border-2 border-pink-100 text-ink',
    featured: false,
  },
  {
    href: '/teacher/quotas',
    title: '额度分配',
    desc: '为学生分配 AI 创作额度，控制用量。',
    emoji: '🎟️',
    cta: '分配额度 →',
    card: 'bg-gradient-to-br from-yellow-100 to-amber-200 border-2 border-yellow-100 text-ink',
    featured: false,
  },
  {
    href: '/teacher/messages',
    title: '与家长沟通',
    desc: '向家长发送通知，分享课堂动态与作品。',
    emoji: '💬',
    cta: '发消息 →',
    card: 'bg-gradient-to-br from-indigo-100 to-slate-200 border-2 border-indigo-100 text-ink',
    featured: false,
  },
] as const;

export default function TeacherHome() {
  const overview = useQuery({
    queryKey: ['t-overview'],
    queryFn: () => api.get('/dashboard/overview').then((r) => r.data),
  });
  const classes = useQuery({
    queryKey: ['t-classes'],
    queryFn: () => api.get('/classes/mine').then((r) => r.data),
  });
  const classroom = useQuery({
    queryKey: ['t-classroom'],
    queryFn: () => api.get('/course/classroom').then((r) => r.data),
    refetchInterval: 8000,
  });

  const active = !!classroom.data?.active;
  const inGame = active && !!classroom.data?.currentGame;
  const studentCount = classroom.data?.students?.length ?? 0;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-4xl p-6 md:p-8 bg-gradient-to-br from-violet-100 via-orange-50 to-sky-100 border-2 border-orange-100 shadow-pop-sm">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <span className="absolute top-3 right-6 text-3xl animate-float-slow">🎓</span>
          <span className="absolute bottom-3 right-24 text-2xl animate-float">📚</span>
          <span className="absolute top-6 right-32 text-xl animate-bounceSoft">✨</span>
        </div>
        <div className="relative">
          <div className="text-sm font-bold text-ink-soft">老师工作台 👋</div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold mt-1">
            欢迎回来，<span className="text-rainbow">老师</span>！
          </h1>
          <p className="text-ink-soft mt-2 font-semibold max-w-2xl">
            上课请从「课堂控制台」开始；课后可查看学生素材、审核作品，或管理班级与积分。
          </p>
        </div>
      </header>

      <section>
        <Link
          href="/teacher/classroom"
          className="relative overflow-hidden rounded-4xl p-7 md:p-9 text-white bg-gradient-to-br from-violet-600 via-orange-500 to-amber-500 shadow-pop block hover:-translate-y-1 transition-all duration-200 group"
        >
          <div aria-hidden className="pointer-events-none absolute -right-4 -top-4 text-[7rem] md:text-[8rem] opacity-20 group-hover:animate-wiggle">
            🎓
          </div>
          <div className="relative max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold bg-white/20 rounded-full px-3 py-1 backdrop-blur">
                上课首选 · 一键控场
              </span>
              {active && (
                <span
                  className={cn(
                    'text-xs font-bold rounded-full px-3 py-1',
                    inGame ? 'bg-emerald-200/90 text-emerald-900' : 'bg-violet-200/90 text-violet-900',
                  )}
                >
                  {inGame ? '● 正在上课' : '● 课堂进行中'}
                  {studentCount > 0 ? ` · ${studentCount} 人参与` : ''}
                </span>
              )}
            </div>
            <div className="font-display text-3xl md:text-4xl font-extrabold mt-3">进入课堂控制台</div>
            <p className="text-sm md:text-base font-semibold opacity-95 mt-2 leading-relaxed max-w-xl">
              选择参与学生、推送课程环节、展示作品、小组抢位与图灵测试——全班屏幕与老师同步。
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-base md:text-lg font-bold group-hover:gap-3 transition-all">
              {active ? '继续上课 →' : '开始上课 →'}
            </div>
          </div>
        </Link>
      </section>

      <section>
        <h2 className="font-display text-xl font-extrabold mb-4 flex items-center gap-2">
          <span className="text-2xl">🧭</span> 常用功能
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ENTRIES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative overflow-hidden rounded-4xl p-5 shadow-pop-sm hover:-translate-y-1 transition-all duration-200 group block',
                item.card,
              )}
            >
              <div aria-hidden className="pointer-events-none absolute -right-1 -top-1 text-5xl opacity-25 group-hover:animate-wiggle">
                {item.emoji}
              </div>
              <div className="relative">
                <div className="font-display text-lg font-extrabold">{item.emoji} {item.title}</div>
                <p className="text-xs font-semibold text-ink-soft mt-1.5 leading-relaxed line-clamp-2">{item.desc}</p>
                <div className="mt-3 text-xs font-bold text-brand-dark inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  {item.cta}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="学生数" value={overview.data?.users ?? '-'} emoji="🧒" />
        <Stat label="班级数" value={overview.data?.classes ?? '-'} emoji="🏫" />
        <Stat label="作品数" value={overview.data?.assets ?? '-'} emoji="🖼️" />
        <Stat label="网页项目" value={overview.data?.webProjects ?? '-'} emoji="🌐" />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="kid-card">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold">🏫 我的班级</h3>
            <Link href="/teacher/classes" className="text-xs font-bold text-brand hover:underline">
              全部班级 →
            </Link>
          </div>
          <div className="space-y-2">
            {classes.data?.map((c: { id: string; name: string; _count?: { members?: number; tasks?: number } }) => (
              <Link
                key={c.id}
                href={`/teacher/classes/${c.id}`}
                className="flex justify-between text-sm rounded-xl px-3 py-2 hover:bg-orange-50"
              >
                <span>{c.name}</span>
                <span className="text-xs text-slate-400">
                  {c._count?.members ?? 0} 人 · {c._count?.tasks ?? 0} 任务
                </span>
              </Link>
            ))}
            {classes.data?.length === 0 && <div className="text-sm text-slate-500">还没有班级，先去「班级管理」创建。</div>}
          </div>
        </div>
        <div className="kid-card">
          <h3 className="font-semibold mb-3">⚡ 最近 AI 任务</h3>
          <div className="space-y-1 text-sm">
            {overview.data?.recentJobs?.slice(0, 8).map((j: { id: string; user?: { displayName: string }; jobType: string; status: string }) => (
              <div key={j.id} className="flex justify-between gap-2">
                <span className="truncate flex-1">
                  {j.user?.displayName} · {j.jobType}
                </span>
                <span className="text-xs text-slate-400 shrink-0">{j.status}</span>
              </div>
            ))}
            {!overview.data?.recentJobs?.length && (
              <div className="text-sm text-slate-500">暂无最近任务</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <div className="kid-card !p-4">
      <div className="text-2xl">{emoji}</div>
      <div className="text-2xl font-bold text-brand-dark mt-1">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
