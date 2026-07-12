import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';
import { RoleShell } from '@/components/role-shell';

const nav = [
  { href: '/admin', label: '总览', emoji: '📊' },
  { href: '/admin/users', label: '用户管理', emoji: '👥' },
  { href: '/admin/classes', label: '班级 / 小组', emoji: '🏫' },
  { href: '/admin/templates', label: '模板管理', emoji: '🪄' },
  { href: '/admin/providers', label: 'AI 供应商', emoji: '🔌' },
  { href: '/admin/sensitive', label: '敏感词', emoji: '🚫' },
  { href: '/admin/reviews', label: '审核管理', emoji: '✅' },
  { href: '/admin/plaza', label: '展示广场', emoji: '🌟' },
  { href: '/admin/quotas', label: '配额策略', emoji: '🎟' },
  { href: '/admin/logs', label: '调用日志', emoji: '📜' },
  { href: '/admin/configs', label: '系统配置', emoji: '⚙️' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerUser();
  if (!me) redirect('/login');
  if (me.role !== 'admin') redirect('/forbidden');
  return <RoleShell user={me} navItems={nav} title="管理员后台"><div className="page-container">{children}</div></RoleShell>;
}
