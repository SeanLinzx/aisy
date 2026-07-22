'use client';

import { RoleShell, type NavItem } from '@/components/role-shell';

export function TeacherAppShell({
  user,
  navItems,
  title,
  variant,
  children,
}: {
  user: { displayName: string; role: string; username: string };
  navItems: NavItem[];
  title: string;
  variant: 'pad' | 'default';
  children: React.ReactNode;
}) {
  return (
    <>
      <RoleShell user={user} navItems={navItems} title={title} variant={variant}>
        {children}
      </RoleShell>
    </>
  );
}
