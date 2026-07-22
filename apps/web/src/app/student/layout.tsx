import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';
import { StudentLayoutClient } from '@/components/student-layout-client';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerUser();
  if (!me) redirect('/login');
  if (me.role !== 'student') redirect('/forbidden');
  return (
    <StudentLayoutClient user={me} meId={me.id}>
      {children}
    </StudentLayoutClient>
  );
}
