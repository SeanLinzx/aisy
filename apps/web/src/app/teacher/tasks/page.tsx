import { redirect } from 'next/navigation';

/** 任务管理已从老师后台移除，旧链接跳回首页 */
export default function TeacherTasksPage() {
  redirect('/teacher');
}
