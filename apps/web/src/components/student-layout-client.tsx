'use client';

import { StudentAppShell } from '@/components/student-app-shell';
import { useStudentNavItems } from '@/hooks/use-student-nav';

export function StudentLayoutClient({
  user,
  meId,
  children,
}: {
  user: { displayName: string; role: string; username: string };
  meId: string;
  children: React.ReactNode;
}) {
  const navItems = useStudentNavItems();
  return (
    <StudentAppShell user={user} navItems={navItems} meId={meId}>
      <div className="page-container">{children}</div>
    </StudentAppShell>
  );
}
