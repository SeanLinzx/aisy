import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';
import { isPadMode, PAD_DASHBOARD_BY_ROLE } from '@/lib/pad-mode';
import { HomeClient } from '@/components/home-client';

const dashboardByRole: Record<string, string> = isPadMode()
  ? PAD_DASHBOARD_BY_ROLE
  : {
      student: '/student',
      teacher: '/teacher',
      parent: '/parent',
      admin: '/admin',
    };

export default async function Home() {
  const me = await getServerUser();
  if (isPadMode() && me) {
    redirect(dashboardByRole[me.role] || '/login');
  }
  const target = me ? dashboardByRole[me.role] : '/login';

  return <HomeClient target={target} me={me} />;
}
