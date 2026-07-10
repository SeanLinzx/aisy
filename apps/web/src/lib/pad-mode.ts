/** 平板专版构建时由 NEXT_PUBLIC_PAD_MODE=1 开启 */
export function isPadMode(): boolean {
  return process.env.NEXT_PUBLIC_PAD_MODE === '1';
}

export const PAD_TEACHER_HOME = '/teacher/classroom';

export const PAD_DASHBOARD_BY_ROLE: Record<string, string> = {
  student: '/student/course/live',
  teacher: PAD_TEACHER_HOME,
  parent: '/parent',
  admin: '/admin',
};
