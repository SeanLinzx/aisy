/** 课件是否同步到学生端（未设置时视为 true，兼容旧数据） */
export function slidesSyncToStudents(slides?: { url?: string; syncToStudents?: boolean } | null): boolean {
  return !!slides?.url && slides.syncToStudents !== false;
}

/** 营歌是否同步到学生端 */
export function campSongSyncToStudents(camp?: { active?: boolean; syncStudents?: boolean } | null): boolean {
  return !!camp?.active && camp.syncStudents !== false;
}
