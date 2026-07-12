import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';
import { TeacherAppShell } from '@/components/teacher-app-shell';
import { isPadMode } from '@/lib/pad-mode';

const nav = [
  { href: '/teacher', label: '首页', emoji: '🏠' },
  { href: '/teacher/classes', label: '班级管理', emoji: '🏫' },
  { href: '/teacher/groups', label: '小组管理', emoji: '👯' },
  { href: '/teacher/scores', label: '小组积分', emoji: '🏆' },
  { href: '/teacher/students', label: '学生账号', emoji: '🧒' },
  { href: '/teacher/tasks', label: '任务管理', emoji: '📋' },
  { href: '/teacher/classroom', label: '课堂控制台', emoji: '🎓' },
  { href: '/teacher/turing', label: '图灵测试出题', emoji: '🤖' },
  { href: '/teacher/reviews', label: '作品审核', emoji: '✅' },
  { href: '/teacher/quotas', label: '额度分配', emoji: '🎟' },
  { href: '/teacher/messages', label: '与家长沟通', emoji: '💬' },
];

const padNav = [
  { href: '/teacher/classroom', label: '控制台', emoji: '🎓', color: 'orange' as const },
  { href: '/teacher/turing', label: '图灵', emoji: '🤖', color: 'purple' as const },
  { href: '/teacher/scores', label: '积分', emoji: '🏆', color: 'yellow' as const },
  { href: '/teacher/students', label: '学生', emoji: '🧒', color: 'mint' as const },
  { href: '/teacher', label: '更多', emoji: '🏠', color: 'sky' as const },
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
