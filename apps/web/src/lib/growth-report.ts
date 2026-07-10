import { api } from './api';

export type GrowthKind = 'quiz' | 'game' | 'debate' | 'share' | 'creation';

export interface GrowthReportPayload {
  kind: GrowthKind;
  /** 来源游戏/环节 slug */
  gameSlug: string;
  title: string;
  summary?: string;
  /** 完整问答内容、得分明细等，后端存为 JSON */
  detail?: unknown;
  mediaUrl?: string;
  /** 默认 true：同一游戏同一类型 30 分钟内覆盖旧记录，避免反复玩刷屏 */
  replaceRecent?: boolean;
}

/**
 * 把课堂问答 / 游戏成绩 / 分享内容记入学生成长手册（家长扫码可见）。
 * 上报失败静默忽略，不打断游戏。
 */
export function reportGrowth(payload: GrowthReportPayload): void {
  void api.post('/growth/report', payload).catch(() => {});
}
