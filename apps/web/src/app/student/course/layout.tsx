// 课程模式整体使用「平板触控友好」作用域：放大点击区域、字号与间距。
// 仅影响 /student/course 下的页面，不波及自由探索等其它区域。
export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return <div className="course-touch">{children}</div>;
}
