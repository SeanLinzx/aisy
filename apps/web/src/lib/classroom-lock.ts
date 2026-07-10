/** 上课跟课期间，学生只允许停留在老师指定的页面 */
export function classroomTargetPath(state: {
  mode: 'game' | 'slides' | 'showcase';
  currentGame: string | null;
  slides: { url: string } | null;
  showcase?: { displayName: string } | null;
}): string {
  if (state.mode === 'showcase' && state.showcase) return '/student/course/showcase';
  const isSlides = state.mode === 'slides' && !!state.slides?.url;
  if (isSlides) return '/student/course/live';
  if (state.currentGame) return `/student/course/g/${state.currentGame}`;
  return '/student/course/live';
}

export function isClassroomPathAllowed(pathname: string, target: string): boolean {
  const norm = (p: string) => (p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p);
  return norm(pathname) === norm(target);
}
