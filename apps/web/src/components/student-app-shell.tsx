'use client';
import { RoleShell, type NavItem } from '@/components/role-shell';
import { ClassroomBar } from '@/components/course/classroom-follow';
import { useClassroomState } from '@/hooks/use-classroom-state';
import { StudentClassroomProvider } from '@/contexts/student-classroom-context';
import { isPadMode } from '@/lib/pad-mode';

export function StudentAppShell({
  user,
  navItems,
  meId,
  children,
}: {
  user: { displayName: string; role: string; username: string };
  navItems: NavItem[];
  meId: string;
  children: React.ReactNode;
}) {
  const classroom = useClassroomState(meId);
  const pad = isPadMode();

  return (
    <StudentClassroomProvider value={{ locked: classroom.locked, label: classroom.label }}>
      <RoleShell
        user={user}
        navItems={navItems}
        title={pad ? '平板跟课' : '学生工作台'}
        autoCollapseSidebar={classroom.locked}
        navLocked={classroom.locked}
        classroomLabel={classroom.locked ? classroom.label : undefined}
        variant={pad ? 'pad' : 'default'}
      >
        {children}
      </RoleShell>
      <ClassroomBar
        included={classroom.included}
        locked={classroom.locked}
        label={classroom.label}
        isAway={classroom.isAway}
        returnToClass={classroom.returnToClass}
      />
    </StudentClassroomProvider>
  );
}
