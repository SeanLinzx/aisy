'use client';

import { RoleShell, type NavItem } from '@/components/role-shell';
import { TeacherScoreFab } from '@/components/course/teacher-score-fab';

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
      <TeacherScoreFab />
    </>
  );
}
