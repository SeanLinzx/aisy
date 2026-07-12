// AI 视频识别 · 10 道课堂题（老师大屏放视频，学生在电脑上作答）
// 纯数据，学生端 / 老师端共用。

export interface VideoRecognitionOption {
  id: string;
  label: string;
  correct?: boolean;
}

export interface VideoRecognitionQuestion {
  id: string;
  num: number;
  emoji: string;
  title: string;
  /** 老师端展示：视频标题 */
  videoTitle: string;
  /** 老师端展示：视频说明（可在大屏前口述） */
  videoHint: string;
  /** 占位背景色；后续可替换为真实视频 URL */
  bg: string;
  options: VideoRecognitionOption[];
}

export const VIDEO_RECOGNITION_QUESTIONS: VideoRecognitionQuestion[] = [
  {
    id: 'q1', num: 1, emoji: '🐱', title: '第 1 题：这段视频是 AI 生成的吗？',
    videoTitle: '会跳舞的小猫', videoHint: '观察动作是否过于流畅、毛发细节是否偶尔发糊。',
    bg: 'from-pink-300 to-amber-200',
    options: [
      { id: 'ai', label: '🤖 是 AI 生成的', correct: true },
      { id: 'real', label: '📹 是真实拍摄的' },
    ],
  },
  {
    id: 'q2', num: 2, emoji: '🎂', title: '第 2 题：这段视频是 AI 生成的吗？',
    videoTitle: '小朋友过生日', videoHint: '注意镜头是否有轻微抖动、光线和细节是否自然。',
    bg: 'from-sky-300 to-emerald-200',
    options: [
      { id: 'ai', label: '🤖 是 AI 生成的' },
      { id: 'real', label: '📹 是真实拍摄的', correct: true },
    ],
  },
  {
    id: 'q3', num: 3, emoji: '🧑‍🚀', title: '第 3 题：这段视频是 AI 生成的吗？',
    videoTitle: '宇航员在火星跳舞', videoHint: '想想现实中能不能在火星拍到这样的视频。',
    bg: 'from-violet-300 to-rose-200',
    options: [
      { id: 'ai', label: '🤖 是 AI 生成的', correct: true },
      { id: 'real', label: '📹 是真实拍摄的' },
    ],
  },
  {
    id: 'q4', num: 4, emoji: '👩‍🏫', title: '第 4 题：这段视频是 AI 生成的吗？',
    videoTitle: '老师上课', videoHint: '观察教室背景、人物动作是否连贯自然。',
    bg: 'from-amber-200 to-orange-200',
    options: [
      { id: 'ai', label: '🤖 是 AI 生成的' },
      { id: 'real', label: '📹 是真实拍摄的', correct: true },
    ],
  },
  {
    id: 'q5', num: 5, emoji: '🐉', title: '第 5 题：这段视频是 AI 生成的吗？',
    videoTitle: '龙在城市上空飞', videoHint: '龙是虚构角色，这种画面通常只能由 AI 想象出来。',
    bg: 'from-slate-300 to-sky-200',
    options: [
      { id: 'ai', label: '🤖 是 AI 生成的', correct: true },
      { id: 'real', label: '📹 是真实拍摄的' },
    ],
  },
  {
    id: 'q6', num: 6, emoji: '⚽', title: '第 6 题：这段视频是 AI 生成的吗？',
    videoTitle: '操场上踢足球', videoHint: '看球的运动轨迹、人物动作是否符合物理规律。',
    bg: 'from-emerald-300 to-lime-200',
    options: [
      { id: 'ai', label: '🤖 是 AI 生成的' },
      { id: 'real', label: '📹 是真实拍摄的', correct: true },
    ],
  },
  {
    id: 'q7', num: 7, emoji: '👋', title: '第 7 题：AI 视频里手指经常有什么问题？',
    videoTitle: '人物挥手打招呼', videoHint: '仔细观察人物的手有几个手指、形状是否正常。',
    bg: 'from-rose-200 to-pink-300',
    options: [
      { id: 'a', label: '手指数量或形状看起来怪怪的', correct: true },
      { id: 'b', label: '手指永远比真人更灵活' },
      { id: 'c', label: '手指颜色和衣服一样' },
    ],
  },
  {
    id: 'q8', num: 8, emoji: '📝', title: '第 8 题：AI 视频里的文字经常有什么问题？',
    videoTitle: '商店招牌特写', videoHint: '看招牌、海报上的字是否清晰可读。',
    bg: 'from-indigo-200 to-violet-300',
    options: [
      { id: 'a', label: '文字模糊、乱码或像外星文', correct: true },
      { id: 'b', label: '文字比印刷体还标准' },
      { id: 'c', label: '文字会自己飞起来' },
    ],
  },
  {
    id: 'q9', num: 9, emoji: '🔄', title: '第 9 题：AI 视频里物体运动常出现什么问题？',
    videoTitle: '杯子从桌上掉落', videoHint: '注意物体移动时形状、大小是否突然变化。',
    bg: 'from-cyan-200 to-teal-300',
    options: [
      { id: 'a', label: '物体突然变形、消失或穿模', correct: true },
      { id: 'b', label: '物体运动比真实世界更慢' },
      { id: 'c', label: '物体永远悬浮在空中' },
    ],
  },
  {
    id: 'q10', num: 10, emoji: '🛡️', title: '第 10 题：看到一段很逼真的视频，我们应该怎么做？',
    videoTitle: '综合回顾', videoHint: '结合今天学到的 AI 视频识别方法。',
    bg: 'from-amber-300 to-yellow-200',
    options: [
      { id: 'a', label: '不轻信，多观察细节，有疑问就问老师或家长', correct: true },
      { id: 'b', label: '看起来很真就一定是真的' },
      { id: 'c', label: '只要是视频就不能相信' },
    ],
  },
];

export interface VideoRecognitionAnswerRecord {
  optionId?: string;
  optionLabel?: string;
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
  /** 老师当前推送到大屏的题号（1-10） */
  currentQuestion: number;
  createdAt: number;
  updatedAt: number;
  records: Record<string, VideoRecognitionStudentRecord>;
}

export function videoRecognitionScore(
  answers: Record<string, VideoRecognitionAnswerRecord>,
): { correct: number; total: number } {
  let correct = 0;
  for (const q of VIDEO_RECOGNITION_QUESTIONS) {
    const picked = answers[q.id]?.optionId;
    if (picked && q.options.find((o) => o.id === picked)?.correct) correct += 1;
  }
  return { correct, total: VIDEO_RECOGNITION_QUESTIONS.length };
}
