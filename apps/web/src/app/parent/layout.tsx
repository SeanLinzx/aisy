import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';
import { RoleShell } from '@/components/role-shell';

const nav = [
  { href: '/parent', label: '我的孩子', emoji: '👨‍👩‍👧' },
  { href: '/parent/messages', label: '与老师沟通', emoji: '💬' },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerUser();
  if (!me) redirect('/login');
  if (me.role !== 'parent') redirect('/forbidden');
  return <RoleShell user={me} navItems={nav} title="家长视角"><div className="page-container">{children}</div></RoleShell>;
}
