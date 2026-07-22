'use client';

import { useMemo } from 'react';
import { api } from '@/lib/api';
import { TuringQuestionBank } from '@/components/course/turing-question-bank';
import {
  turingPickStats,
  type TuringAnswer,
  type TuringConsoleState,
  type TuringStudentRecord,
} from '@/lib/turing-session';

function StudentTuringDetail({ record, answers }: { record: TuringStudentRecord; answers: TuringAnswer[] }) {
  return (
    <div className="rounded-xl border-2 border-orange-100 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-extrabold text-sm">{record.displayName}</span>
        <span className="flex items-center gap-2 text-[11px] font-bold">
          <span className={record.done ? 'text-emerald-600' : 'text-amber-600'}>
            {record.done ? '✅ 已提交' : '✍️ 未提交'}
          </span>
          {record.done && (
            <span className={record.correctCount === record.totalCount ? 'text-violet-600' : 'text-amber-700'}>
              {record.correctCount}/{record.totalCount} 正确
            </span>
          )}
        </span>
      </div>
      {record.done && (
        <div className="space-y-1">
          {answers.map((a, i) => {
            const guessedAi = !!record.picks[a.id];
            const right = guessedAi === a.isAI;
            return (
              <div key={a.id} className="text-xs leading-relaxed">
                <span className="text-ink-soft mr-1">回答 {i + 1}:</span>
                <span className="font-bold text-ink">{a.text}</span>
                <span className={`ml-1 font-bold ${right ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {guessedAi ? '🤖 猜 AI' : '👦 猜人'}
                  {right ? ' ✓' : ' ✗'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TuringTeacherPanel({
  students,
  rosterIds,
  turing,
  busy,
  onRefresh,
  showQuestionBank = true,
}: {
  students: Array<{ id: string; displayName: string; username: string }>;
  rosterIds: string[];
  turing?: TuringConsoleState | null;
  busy?: boolean;
  onRefresh?: () => void;
  showQuestionBank?: boolean;
}) {
  const active = turing?.active ?? null;
  const responses = turing?.responses ?? null;

  const roster = useMemo(
    () => (rosterIds.length > 0 ? students.filter((s) => rosterIds.includes(s.id)) : students),
    [students, rosterIds],
  );

  const records = Object.values(responses?.records || {});
  const doneCount = records.filter((r) => r.done).length;
  const answers = responses?.answers || active?.answers || [];

  const recordByStudent = useMemo(() => {
    const map = new Map<string, TuringStudentRecord>();
    for (const rec of records) map.set(rec.studentId, rec);
    return map;
  }, [records]);

  async function resetResponses() {
    try {
      await api.post('/course/turing/responses/reset');
      onRefresh?.();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="kid-card-purple space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-bold">🤖 图灵测试 · 老师看板</div>
          <div className="text-xs text-ink-soft mt-0.5">
            {showQuestionBank ? '在下方出题并发布，学生提交后实时查看判断结果' : '学生提交后在此查看现场作答与统计'}
          </div>
        </div>
        {active && (
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="tag">参与 {roster.length} 人</span>
            <span className="tag bg-amber-50 text-amber-700 border-amber-200">未提交 {roster.length - doneCount}</span>
            <span className="tag bg-emerald-50 text-emerald-700 border-emerald-200">已提交 {doneCount}</span>
          </div>
        )}
      </div>

      {showQuestionBank && (
        <TuringQuestionBank
          compact
          activeSlotId={active?.slotId}
          activeQuestion={active?.question}
          onPublished={onRefresh}
        />
      )}

      {!showQuestionBank && !active && (
        <p className="text-xs text-ink-soft">请先在上方「课前准备」编辑题目，推送「图灵测试小游戏」并发布后即可查看作答。</p>
      )}

      {active && (
        <>
          <div className="rounded-2xl border-2 border-violet-200 bg-white p-4 space-y-3">
            <div className="text-xs font-bold text-violet-700">现场问题 · 作答统计</div>
            <div className="text-base font-extrabold text-ink">{active.question}</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {answers.map((a, i) => {
                const stats = turingPickStats(answers, records, a.id);
                return (
                  <div key={a.id} className="rounded-xl border-2 border-violet-100 bg-violet-50/50 px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-ink-soft">回答 {i + 1}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.isAI ? 'bg-violet-200 text-violet-800' : 'bg-emerald-200 text-emerald-800'}`}>
                        {a.isAI ? '🤖 AI' : '👦 小朋友'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-relaxed">{a.text}</p>
                    <p className="text-[11px] text-ink-soft">
                      {stats.total > 0 ? `${stats.aiCount}/${stats.total} 人猜是 AI` : '暂无人提交'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-ink-soft">小朋友作答情况</div>
            <div className="grid sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
              {roster.map((s) => {
                const rec = recordByStudent.get(s.id);
                if (rec?.done) {
                  return <StudentTuringDetail key={s.id} record={rec} answers={answers} />;
                }
                return (
                  <div key={s.id} className="rounded-xl border-2 border-dashed border-orange-100 bg-white/80 px-3 py-3">
                    <div className="font-extrabold text-sm">{s.displayName}</div>
                    <div className="text-[11px] font-bold text-amber-600 mt-1">✍️ 还未提交</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={resetResponses} className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft">
              🔄 清空作答记录
            </button>
          </div>
        </>
      )}
    </div>
  );
}
