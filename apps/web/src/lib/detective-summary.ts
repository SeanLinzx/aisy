// 大侦探总结分享 · 问答配置（参考《7我的AI侦探分享.pptx》）
// 纯数据，学生端答题 / 老师端看板共用。

export interface SummaryOption {
  id: string;
  label: string;
  /** 知识题的正确选项；辩论题不设置 */
  correct?: boolean;
}

export type SummaryQuestionKind = 'quiz' | 'debate' | 'share';

export interface SummaryQuestion {
  id: string;
  kind: SummaryQuestionKind;
  emoji: string;
  title: string;
  desc?: string;
  options: SummaryOption[];
  /** 是否附带「说说理由 / 想法」输入框 */
  withText?: boolean;
  textLabel?: string;
  textPlaceholder?: string;
}

export const SUMMARY_QUESTIONS: SummaryQuestion[] = [
  {
    id: 'hallucination',
    kind: 'quiz',
    emoji: '🤯',
    title: '小心！AI 会「胡说八道」！下面哪个是「AI 幻觉」的例子？',
    desc: 'AI 幻觉 = AI 开始一本正经地编错东西的时候。',
    options: [
      { id: 'a', label: '给兔子画出 3 只耳朵、把鸽子画成鸭子', correct: true },
      { id: 'b', label: 'AI 睡觉时做的梦' },
    ],
  },
  {
    id: 'aigc',
    kind: 'quiz',
    emoji: '🎨',
    title: 'AIGC 里的「G」代表什么？',
    desc: 'AIGC 的全称是「人工智能生成内容」。',
    options: [
      { id: 'a', label: 'Generate —— 创造、生成', correct: true },
      { id: 'b', label: 'Game —— 游戏' },
    ],
  },
  {
    id: 'shield',
    kind: 'quiz',
    emoji: '🛡️',
    title: '成为 AIGC 高手的法宝「智慧之盾」是指什么？',
    desc: '它就像给大脑装上「过滤器」🧠',
    options: [
      { id: 'a', label: '不轻信、多提问、找证据', correct: true },
      { id: 'b', label: '相信看到的一切表象' },
    ],
  },
  {
    id: 'thinking',
    kind: 'quiz',
    emoji: '⚡',
    title: 'AI 能帮我们做很多事，那思考的主角是谁？',
    options: [
      { id: 'a', label: 'AI 没有自己的想法，思考的主角还是我们', correct: true },
      { id: 'b', label: 'AI 可以替我们思考一切' },
    ],
  },
  {
    id: 'debate',
    kind: 'debate',
    emoji: '⚖️',
    title: '小组思辨：AI 老师可以用来批改作业吗？',
    desc: '注意：你的观点将成为破解真相的线索！',
    options: [
      { id: 'pro', label: '正方：支持！AI 批改又快又准，老师能有更多时间辅导我们' },
      { id: 'con', label: '反方：反对！AI 不懂我们的解题思路和情感，会打击积极性' },
    ],
    withText: true,
    textLabel: '💬 说说你的理由',
    textPlaceholder: '为什么？可以结合课堂场景，在效率与温度之间找平衡点……',
  },
  {
    id: 'share',
    kind: 'share',
    emoji: '🎉',
    title: '数字狂欢 · 我的分享：这 6 场 AI 之行，你最想讲的是？',
    desc: '经历了奇妙的旅程，相信你收获了自己的成长。',
    options: [
      { id: 'change', label: '🌱 我的改变' },
      { id: 'feeling', label: '💖 我的感受' },
      { id: 'work', label: '🖼️ 我的作品' },
      { id: 'future', label: '🚀 对未来的展望' },
    ],
    withText: true,
    textLabel: '🎤 展开说说吧',
    textPlaceholder: '例如：我学会了写提示词，做出了会动的奶龙房间，以后想用 AI 帮助更多人……',
  },
];

export interface SummaryAnswerRecord {
  optionId?: string;
  optionLabel?: string;
  text?: string;
}

export interface SummaryStudentRecord {
  studentId: string;
  displayName: string;
  answers: Record<string, SummaryAnswerRecord>;
  done: boolean;
  updatedAt: number;
}

export interface SummarySession {
  id: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  records: Record<string, SummaryStudentRecord>;
}

import type { Locale } from '@/lib/i18n/types';
import { pickLocale } from '@/lib/i18n/localize';
import { SUMMARY_QUESTIONS_EN } from '@/lib/i18n/detective-summary-en';

export function getSummaryQuestions(locale: Locale = 'zh'): SummaryQuestion[] {
  return pickLocale(SUMMARY_QUESTIONS, SUMMARY_QUESTIONS_EN, locale);
}

export function getSummaryQuestion(id: string, locale: Locale = 'zh'): SummaryQuestion | undefined {
  return getSummaryQuestions(locale).find((q) => q.id === id);
}

export function summaryQuizScore(answers: Record<string, SummaryAnswerRecord>): { correct: number; total: number } {
  let correct = 0;
  let total = 0;
  for (const q of SUMMARY_QUESTIONS) {
    if (q.kind !== 'quiz') continue;
    total += 1;
    const picked = answers[q.id]?.optionId;
    if (picked && q.options.find((o) => o.id === picked)?.correct) correct += 1;
  }
  return { correct, total };
}
