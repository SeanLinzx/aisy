/** 对话修改页（/studio/web）的返回来源 */
export type WebStudioFrom = 'workbench' | 'projects' | 'assets';

export function webStudioHref(projectId: string, from?: WebStudioFrom): string {
  const q = new URLSearchParams({ id: projectId });
  if (from) q.set('from', from);
  return `/studio/web?${q.toString()}`;
}

export function webStudioBackNav(
  from: string | null | undefined,
  projectId: string,
): { href: string; label: string } {
  switch (from) {
    case 'workbench':
      return {
        href: projectId ? `/student/web?id=${projectId}` : '/student/web',
        label: '返回网页工作台',
      };
    case 'assets':
      return { href: '/student/assets', label: '返回素材库' };
    case 'projects':
      return { href: '/student/projects', label: '返回我的网页' };
    default:
      // 旧链接或未带来源：回到侧边栏「我的网页」，避免误跳到另一套 /student/web 创作页
      return { href: '/student/projects', label: '返回我的网页' };
  }
}
