export const TURING_MAX_ANSWER_LEN = 15;
export const TURING_PENDING_COUNT = 3;

export interface TuringPendingSlot {
  id: string;
  question: string;
  human1: string;
  human2: string;
  ai1: string;
  ai2: string;
}

export const DEFAULT_TURING_SLOTS: TuringPendingSlot[] = [
  { id: 'q1', question: '你最喜欢的一种动物是什么？', human1: '', human2: '', ai1: '', ai2: '' },
  { id: 'q2', question: '今天午餐吃了什么？', human1: '', human2: '', ai1: '', ai2: '' },
  { id: 'q3', question: '周末你最想做什么？', human1: '', human2: '', ai1: '', ai2: '' },
];

export function clipTuringAnswer(s: string): string {
  return s.trim().slice(0, TURING_MAX_ANSWER_LEN);
}

export function turingAiPrompt(question: string): string {
  return `你现在要假装成一个中国小学3-6年级的小朋友，用小学生天真、口语化的口吻回答下面这个问题。要求：不超过${TURING_MAX_ANSWER_LEN}个字，只输出答案本身，不要任何解释或前缀。\n问题：${question}`;
}
