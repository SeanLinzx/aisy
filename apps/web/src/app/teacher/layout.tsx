import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';
import { TeacherAppShell } from '@/components/teacher-app-shell';
import { isPadMode } from '@/lib/pad-mode';
import type { NavItem } from '@/components/role-shell';

const nav: NavItem[] = [
  { href: '/teacher', label: '首页', emoji: '🏠' },
  {
    href: '/teacher/students',
    label: '学生账号',
    emoji: '🧒',
    matchPrefixes: ['/teacher/students'],
    children: [
      {
        href: '/teacher/classes',
        label: '班级管理',
        emoji: '🏫',
        matchPrefixes: ['/teacher/classes'],
        children: [
          {
            href: '/teacher/groups',
            label: '小组与积分',
            emoji: '👯',
            matchPrefixes: ['/teacher/groups', '/teacher/scores'],
          },
        ],
      },
    ],
  },
  {
    href: '/teacher/classroom',
    label: '课堂控制台',
    emoji: '🎓',
    matchPrefixes: ['/teacher/classroom', '/teacher/turing'],
  },
  { href: '/teacher/assets', label: '学生素材', emoji: '📦' },
  { href: '/teacher/reviews', label: '作品审核', emoji: '✅' },
  { href: '/teacher/quotas', label: '额度分配', emoji: '🎟️' },
  { href: '/teacher/messages', label: '与家长沟通', emoji: '💬' },
];

const padNav: NavItem[] = [
  { href: '/teacher/classroom', label: '控制台', emoji: '🎓', color: 'orange' },
  {
    href: '/teacher/students',
    label: '学生',
    emoji: '🧒',
    color: 'mint',
    matchPrefixes: ['/teacher/classes', '/teacher/groups'],
  },
  { href: '/teacher/assets', label: '素材', emoji: '📦', color: 'sky' },
  { href: '/teacher/reviews', label: '审核', emoji: '✅', color: 'purple' },
  { href: '/teacher', label: '更多', emoji: '🏠', color: 'yellow' },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerUser();
  if (!me) redirect('/login');
  if (me.role !== 'teacher' && me.role !== 'admin') redirect('/forbidden');
  const pad = isPadMode();
  return (
    <TeacherAppShell
      user={me}
      navItems={pad ? padNav : nav}
      title={pad ? '平板控制台' : '老师后台'}
      variant={pad ? 'pad' : 'default'}
    >
      <div className="page-container">{children}</div>
    </TeacherAppShell>
  );
}
