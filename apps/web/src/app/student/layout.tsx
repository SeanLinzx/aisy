import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';
import { StudentAppShell } from '@/components/student-app-shell';
import { EXPLORE_TOOL_PATHS } from '@/lib/explore-tools';
import { isPadMode } from '@/lib/pad-mode';

const nav = [
  { href: '/student', label: '首页', emoji: '🏠' },
  { href: '/student/course', label: '课程模式', emoji: '📚' },
  {
    href: '/student/explore',
    label: '探索模式',
    emoji: '🎧',
    color: 'yellow' as const,
    matchPrefixes: [...EXPLORE_TOOL_PATHS],
  },
  { href: '/student/assets', label: '我的素材库', emoji: '📦' },
  { href: '/student/projects', label: '我的网页', emoji: '💻' },
  { href: '/student/settings', label: '我的设置', emoji: '⚙️' },
];

const padNav = [
  { href: '/student/course/live', label: '跟课', emoji: '🎓', color: 'orange' as const },
  { href: '/student/course', label: '课程', emoji: '📚', color: 'sky' as const },
  { href: '/student/explore', label: '探索', emoji: '🎧', color: 'yellow' as const, matchPrefixes: [...EXPLORE_TOOL_PATHS] },
  { href: '/student/assets', label: '素材', emoji: '📦', color: 'mint' as const },
  { href: '/student', label: '首页', emoji: '🏠', color: 'pink' as const },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerUser();
  if (!me) redirect('/login');
  if (me.role !== 'student') redirect('/forbidden');
  return (
    <StudentAppShell user={me} navItems={isPadMode() ? padNav : nav} meId={me.id}>
      <div className="page-container">{children}</div>
    </StudentAppShell>
  );
}
