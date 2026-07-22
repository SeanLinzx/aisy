import { redirect } from 'next/navigation';

/** 小组积分已合并至小组管理 */
export default function TeacherScoresPage() {
  redirect('/teacher/groups');
}
