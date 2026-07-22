// AI 视频识别 · 老师发布题目，学生看大屏作答

export type VideoRecognitionTemplate = 'single' | 'compare';

export interface VideoRecognitionOption {
  id: string;
  label: string;
}

/** 老师发布的单道题 */
export interface VideoRecognitionQuestion {
  id: string;
  num: number;
  template: VideoRecognitionTemplate;
  /** 自定义题干；留空则用模板默认文案 */
  title?: string;
  /** 单视频：标题 */
  videoTitle?: string;
  videoUrl?: string;
  /** 上下对比：上/下标题与视频 */
  videoTopTitle?: string;
  videoBottomTitle?: string;
  videoTopUrl?: string;
  videoBottomUrl?: string;
  videoHint?: string;
  bg?: string;
  emoji?: string;
  /** 正确选项 id：single → yes|no；compare → top|bottom|both|neither */
  correctOptionId: string;
}

export interface VideoRecognitionAnswerRecord {
  optionId?: string;
  optionLabel?: string;
  /** 学生已正式提交本题（锁定答案） */
  submitted?: boolean;
  submittedAt?: number;
}

export interface VideoRecognitionStudentRecord {
  studentId: string;
  displayName: string;
  answers: Record<string, VideoRecognitionAnswerRecord>;
  done: boolean;
  updatedAt: number;
}

export interface VideoRecognitionSession {
  id: string;
  active: boolean;
  /** 老师当前推送到大屏的题号（1 起） */
  currentQuestion: number;
  /** 老师已发布的题目列表 */
  questions: VideoRecognitionQuestion[];
  createdAt: number;
  updatedAt: number;
  records: Record<string, VideoRecognitionStudentRecord>;
}

export const DEFAULT_SINGLE_VIDEO_TITLE = '视频 1';
export const DEFAULT_COMPARE_VIDEO_TOP_TITLE = '视频 1';
export const DEFAULT_COMPARE_VIDEO_BOTTOM_TITLE = '视频 2';

export const VIDEO_RECOGNITION_TEMPLATE_META: Record<
  VideoRecognitionTemplate,
  { label: string; emoji: string; defaultTitle: string }
> = {
  single: {
    label: '单视频',
    emoji: '🎬',
    defaultTitle: '这个视频是 AI 生成的吗？',
  },
  compare: {
    label: '上下对比',
    emoji: '↕️',
    defaultTitle: '上面的是 AI 生成的，还是下面的是 AI 生成的？',
  },
};

export function singleVideoTitle(q: VideoRecognitionQuestion): string {
  return q.videoTitle?.trim() || DEFAULT_SINGLE_VIDEO_TITLE;
}

export function compareVideoTopTitle(q: VideoRecognitionQuestion): string {
  return q.videoTopTitle?.trim() || DEFAULT_COMPARE_VIDEO_TOP_TITLE;
}

export function compareVideoBottomTitle(q: VideoRecognitionQuestion): string {
  return q.videoBottomTitle?.trim() || DEFAULT_COMPARE_VIDEO_BOTTOM_TITLE;
}

export function questionDisplayTitle(q: VideoRecognitionQuestion): string {
  return q.title?.trim() || VIDEO_RECOGNITION_TEMPLATE_META[q.template].defaultTitle;
}

export function questionOptions(q: VideoRecognitionQuestion): VideoRecognitionOption[] {
  if (q.template === 'compare') {
    return [
      { id: 'top', label: '⬆️ 上面' },
      { id: 'bottom', label: '⬇️ 下面' },
      { id: 'both', label: '↕️ 都是 AI' },
      { id: 'neither', label: '📹 都不是 AI' },
    ];
  }
  return [
    { id: 'yes', label: '✅ 是' },
    { id: 'no', label: '❌ 不是' },
  ];
}

export function correctOptionLabel(q: VideoRecognitionQuestion): string {
  return questionOptions(q).find((o) => o.id === q.correctOptionId)?.label || q.correctOptionId;
}

export function isAnswerCorrect(q: VideoRecognitionQuestion, optionId?: string): boolean {
  return !!optionId && optionId === q.correctOptionId;
}

export function isAnswerSubmitted(answer?: VideoRecognitionAnswerRecord): boolean {
  return !!answer?.submitted;
}

export function countSubmittedForQuestion(
  records: Record<string, VideoRecognitionStudentRecord>,
  questionId: string,
): number {
  return Object.values(records).filter((r) => isAnswerSubmitted(r.answers[questionId])).length;
}

export function videoRecognitionScore(
  answers: Record<string, VideoRecognitionAnswerRecord>,
  questions: VideoRecognitionQuestion[],
): { correct: number; total: number } {
  let correct = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (!isAnswerSubmitted(a)) continue;
    if (isAnswerCorrect(q, a?.optionId)) correct += 1;
  }
  const total = questions.filter((q) => isAnswerSubmitted(answers[q.id])).length;
  return { correct, total: total || questions.length };
}

export function normalizeVideoRecognitionSession(raw: VideoRecognitionSession | null): VideoRecognitionSession | null {
  if (!raw) return null;
  return {
    ...raw,
    questions: Array.isArray(raw.questions) ? raw.questions : [],
  };
}
