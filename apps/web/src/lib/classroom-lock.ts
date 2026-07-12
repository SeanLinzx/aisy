/** 上课跟课期间，学生只允许停留在老师指定的页面（作品展示以浮窗呈现，不单独跳转） */
export function classroomTargetPath(state: {
  mode: 'game' | 'slides' | 'showcase';
  currentGame: string | null;
  slides: { url: string } | null;
  showcase?: { displayName: string } | null;
}): string {
  const isSlides = state.mode === 'slides' && !!state.slides?.url;
  if (state.currentGame) return `/student/course/g/${state.currentGame}`;
  if (isSlides) return '/student/course/live';
  return '/student/course/live';
}

export function isClassroomPathAllowed(pathname: string, target: string): boolean {
  const norm = (p: string) => (p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p);
  return norm(pathname) === norm(target);
}
