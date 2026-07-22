export interface TuringAnswer {
  id: string;
  text: string;
  isAI: boolean;
}

export interface TuringActiveSession {
  id: string;
  question: string;
  answers: TuringAnswer[];
  createdAt: number;
  slotId?: string;
}

export interface TuringStudentRecord {
  studentId: string;
  displayName: string;
  picks: Record<string, boolean>;
  correctCount: number;
  totalCount: number;
  done: boolean;
  updatedAt: number;
}

export interface TuringResponsesSession {
  id: string;
  turingSessionId: string;
  question: string;
  answers: TuringAnswer[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
  records: Record<string, TuringStudentRecord>;
}

export interface TuringConsoleState {
  active: TuringActiveSession | null;
  responses: TuringResponsesSession | null;
}

export function turingPickStats(
  answers: TuringAnswer[],
  records: TuringStudentRecord[],
  answerId: string,
): { aiCount: number; total: number } {
  let aiCount = 0;
  let total = 0;
  for (const rec of records) {
    if (!rec.done) continue;
    if (rec.picks[answerId]) aiCount += 1;
    total += 1;
  }
  return { aiCount, total };
}
