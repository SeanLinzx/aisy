import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';

/**
 * 独立的「预览与对话修改」编辑页外壳：不带学生工作台的侧边栏和课程框架，
 * 打开后就是这一个页面本身，靠页面内自带的返回链接导航。
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerUser();
  if (!me) redirect('/login');
  if (me.role !== 'student') redirect('/forbidden');

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="page-container">{children}</div>
    </div>
  );
}
