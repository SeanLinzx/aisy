'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AiProgress } from '@/components/course/ai-progress';
import {
  clipTuringAnswer,
  DEFAULT_TURING_SLOTS,
  TURING_MAX_ANSWER_LEN,
  turingAiPrompt,
  type TuringPendingSlot,
} from '@/lib/turing-config';

function slotLabel(index: number) {
  return ['待定题 ①', '待定题 ②', '待定题 ③'][index] ?? `待定题 ${index + 1}`;
}

export function TuringQuestionBank({
  compact = false,
  activeSlotId,
  activeQuestion,
  onPublished,
}: {
  compact?: boolean;
  activeSlotId?: string | null;
  activeQuestion?: string | null;
  onPublished?: () => void;
}) {
  const [slots, setSlots] = useState<TuringPendingSlot[]>(DEFAULT_TURING_SLOTS);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(DEFAULT_TURING_SLOTS[0].id);

  async function loadBank() {
    try {
      const bankRes = await api.get('/course/turing/bank');
      if (bankRes.data?.slots?.length) setSlots(bankRes.data.slots);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadBank();
  }, []);

  function updateSlot(id: string, patch: Partial<TuringPendingSlot>) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function saveBank(nextSlots?: TuringPendingSlot[]) {
    setSaving(true);
    setError(null);
    try {
      const payload = (nextSlots ?? slots).map((s) => ({
        ...s,
        question: s.question.trim(),
        human1: clipTuringAnswer(s.human1),
        human2: clipTuringAnswer(s.human2),
        ai1: clipTuringAnswer(s.ai1),
        ai2: clipTuringAnswer(s.ai2),
      }));
      const r = await api.put('/course/turing/bank', { slots: payload });
      setSlots(r.data?.slots ?? payload);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (e as Error)?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function genAi(slot: TuringPendingSlot) {
    if (!slot.question.trim()) {
      setError(`请先填写「${slotLabel(slots.findIndex((s) => s.id === slot.id))}」的问题。`);
      return;
    }
    setGeneratingId(slot.id);
    setError(null);
    try {
      const prompt = turingAiPrompt(slot.question);
      const [a, b] = await Promise.all([
        api.post('/ai-generate/text', { prompt, saveAsAsset: false }),
        api.post('/ai-generate/text', { prompt, saveAsAsset: false }),
      ]);
      const next = slots.map((s) =>
        s.id === slot.id
          ? {
              ...s,
              ai1: clipTuringAnswer((a.data?.text || '').trim()),
              ai2: clipTuringAnswer((b.data?.text || '').trim()),
            }
          : s,
      );
      setSlots(next);
      await saveBank(next);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'AI 生成失败');
    } finally {
      setGeneratingId(null);
    }
  }

  async function publishSlot(slotId: string) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    if (!slot.question.trim() || !slot.human1.trim() || !slot.human2.trim() || !slot.ai1.trim() || !slot.ai2.trim()) {
      setError('请先填好问题、两个小朋友回答，并生成两个 AI 回答后再发布。');
      return;
    }
    setPublishingId(slotId);
    setError(null);
    try {
      await saveBank();
      await api.post('/course/turing/publish-slot', { slotId });
      onPublished?.();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (e as Error)?.message || '发布失败');
    } finally {
      setPublishingId(null);
    }
  }

  async function clearActive() {
    setPublishingId('clear');
    setError(null);
    try {
      await api.delete('/course/turing');
      onPublished?.();
    } catch (e: unknown) {
      setError((e as Error)?.message || '操作失败');
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {activeQuestion && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs sm:text-sm font-bold text-emerald-800">
              ✅ 当前正在进行：<span className="text-ink">{activeQuestion}</span>
            </div>
            <button
              type="button"
              onClick={clearActive}
              disabled={!!publishingId}
              className="kid-button-sm bg-white border-2 border-rose-200 text-rose-600"
            >
              结束这一局
            </button>
          </div>
          <p className="text-[11px] text-ink-soft">学生端已能看到这道题，下方可查看作答；也可发布其他待定题换题。</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs sm:text-sm font-bold">📋 现场出题（共 {slots.length} 题 · 每题 ≤{TURING_MAX_ANSWER_LEN} 字）</div>
        <button type="button" onClick={() => saveBank()} disabled={saving} className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft">
          {saving ? '保存中…' : '💾 保存全部'}
        </button>
      </div>

      <div className="space-y-2">
        {slots.map((slot, index) => {
          const isGen = generatingId === slot.id;
          const isPub = publishingId === slot.id;
          const isLive = activeSlotId === slot.id;
          const ready = slot.question.trim() && slot.human1.trim() && slot.human2.trim() && slot.ai1.trim() && slot.ai2.trim();
          const open = compact ? expandedId === slot.id : true;

          return (
            <div
              key={slot.id}
              className={`rounded-2xl border-2 bg-white/90 space-y-3 ${isLive ? 'border-emerald-300 ring-2 ring-emerald-200' : 'border-violet-100'} ${compact ? 'p-3' : 'kid-card !p-4'}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => compact && setExpandedId(open ? null : slot.id)}
                  className={`font-extrabold text-sm flex items-center gap-2 ${compact ? 'text-left' : ''}`}
                >
                  <span className="tag">{slotLabel(index)}</span>
                  {isLive && <span className="text-[10px] font-bold text-emerald-600">● 学生正在做</span>}
                  {compact && (
                    <span className="text-[10px] font-bold text-ink-soft truncate max-w-[12rem]">
                      {slot.question.trim() || '（未填写）'}
                    </span>
                  )}
                  {compact && <span className="text-ink-soft">{open ? '▾' : '▸'}</span>}
                </button>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => genAi(slot)}
                    disabled={isGen || saving}
                    className="kid-button-sm bg-white border-2 border-violet-200 text-violet-700"
                  >
                    {isGen ? '生成中…' : '🤖 生成 AI'}
                  </button>
                  <button
                    type="button"
                    onClick={() => publishSlot(slot.id)}
                    disabled={isPub || saving || !ready}
                    className="kid-button-primary !py-1.5 !px-3 text-xs"
                  >
                    {isPub ? '发布中…' : '🚀 发布此题'}
                  </button>
                </div>
              </div>

              {open && (
                <>
                  <div>
                    <label className="text-xs font-bold">问题</label>
                    <input
                      className="kid-input mt-1 !py-2 text-sm"
                      value={slot.question}
                      onChange={(e) => updateSlot(slot.id, { question: e.target.value })}
                      placeholder="例如：你最喜欢的一种动物是什么？"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2">
                    {([
                      { key: 'human1' as const, label: '👦 小朋友 1' },
                      { key: 'human2' as const, label: '👧 小朋友 2' },
                    ]).map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs font-bold">{label}</label>
                        <textarea
                          className="kid-textarea !min-h-[52px] mt-1 text-sm"
                          maxLength={TURING_MAX_ANSWER_LEN}
                          value={slot[key]}
                          onChange={(e) => updateSlot(slot.id, { [key]: e.target.value })}
                        />
                        <div className="text-right text-[10px] text-slate-400">
                          {slot[key].length}/{TURING_MAX_ANSWER_LEN}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isGen && <AiProgress label="AI 正在写小朋友风格回答…" durationMs={30_000} />}

                  {(slot.ai1 || slot.ai2) && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {([
                        { key: 'ai1' as const, label: '🤖 AI 1' },
                        { key: 'ai2' as const, label: '🤖 AI 2' },
                      ]).map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-[10px] font-bold text-violet-700">{label}</label>
                          <textarea
                            className="kid-textarea !min-h-[52px] mt-1 text-sm"
                            maxLength={TURING_MAX_ANSWER_LEN}
                            value={slot[key]}
                            onChange={(e) => updateSlot(slot.id, { [key]: e.target.value })}
                          />
                          <div className="text-right text-[10px] text-slate-400">
                            {slot[key].length}/{TURING_MAX_ANSWER_LEN}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
      )}
    </div>
  );
}
