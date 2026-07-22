'use client';
import { RoleShell, type NavItem } from '@/components/role-shell';
import { ClassroomBar } from '@/components/course/classroom-follow';
import { ClassroomShowcasePopup } from '@/components/course/classroom-showcase-popup';
import { CampSongPopup } from '@/components/course/camp-song-popup';
import { useClassroomState } from '@/hooks/use-classroom-state';
import { StudentClassroomProvider } from '@/contexts/student-classroom-context';
import { CourseStreamProvider } from '@/contexts/course-stream-context';
import { useLanguage } from '@/contexts/language-context';
import { isPadMode } from '@/lib/pad-mode';

function StudentAppShellInner({
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
  const { t } = useLanguage();

  return (
    <StudentClassroomProvider value={{ locked: classroom.locked, label: classroom.label, state: classroom.state, loaded: classroom.loaded }}>
      <RoleShell
        user={user}
        navItems={navItems}
        title={pad ? t('shell.padFollow', '平板跟课') : t('shell.studentDesk', '学生工作台')}
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
        label={classroom.showcaseLabel ? `${classroom.label} · ${classroom.showcaseLabel}` : classroom.label}
        isAway={classroom.isAway}
        returnToClass={classroom.returnToClass}
      />
      {classroom.included && classroom.showcase && (
        <ClassroomShowcasePopup showcase={classroom.showcase} />
      )}
      {classroom.included && classroom.campSong?.active && (
        <CampSongPopup campSong={classroom.campSong} />
      )}
    </StudentClassroomProvider>
  );
}

/**
 * CourseStreamProvider 包在最外层：全应用共享一条 SSE 长连接，
 * useClassroomState 及各小游戏组件都从这里读取实时数据，不再各自开连接。
 */
export function StudentAppShell(props: {
  user: { displayName: string; role: string; username: string };
  navItems: NavItem[];
  meId: string;
  children: React.ReactNode;
}) {
  return (
    <CourseStreamProvider>
      <StudentAppShellInner {...props} />
    </CourseStreamProvider>
  );
}
