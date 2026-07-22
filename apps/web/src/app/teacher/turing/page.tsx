import { redirect } from 'next/navigation';

/** 图灵测试出题已并入课堂控制台 */
export default function TeacherTuringPage() {
  redirect('/teacher/classroom#turing-prep');
}
