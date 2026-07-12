'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import {
  clipTuringAnswer,
  DEFAULT_TURING_SLOTS,
  TURING_MAX_ANSWER_LEN,
  turingAiPrompt,
  type TuringPendingSlot,
} from '@/lib/turing-config';

interface Answer {
  id: string;
  text: string;
  isAI: boolean;
}
interface Session {
  id: string;
  question: string;
  answers: Answer[];
  createdAt: number;
  slotId?: string;
}

function slotLabel(index: number) {
  return ['待定题 ①', '待定题 ②', '待定题 ③'][index] ?? `待定题 ${index + 1}`;
}

export default function TeacherTuringPage() {
  const [slots, setSlots] = useState<TuringPendingSlot[]>(DEFAULT_TURING_SLOTS);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [active, setActive] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    try {
      const [activeRes, bankRes] = await Promise.all([
        api.get('/course/turing'),
        api.get('/course/turing/bank'),
      ]);
      setActive(activeRes.data || null);
      if (bankRes.data?.slots?.length) setSlots(bankRes.data.slots);
    } catch {}
  }
  useEffect(() => { loadAll(); }, []);

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
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '保存失败');
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
    } catch (e: any) {
      setError(e?.message || 'AI 生成失败');
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
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '发布失败');
    } finally {
      setPublishingId(null);
    }
  }

  async function clearActive() {
    setPublishingId('clear');
    try {
      await api.delete('/course/turing');
      await loadAll();
    } catch (e: any) {
      setError(e?.message || '操作失败');
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">🤖 图灵测试 · 现场出题</h1>
        <p className="text-slate-600 mt-1 text-sm">
          提前准备 {slots.length} 道待定题，每题 4 个回答（2 个小朋友 + 2 个 AI）。<b>所有回答不超过 {TURING_MAX_ANSWER_LEN} 个字</b>，上课时选一道发布给学生。
        </p>
      </header>

      {active && (
        <div className="kid-card-mint">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="font-bold text-sm">
              ✅ 当前正在进行：<span className="text-ink">{active.question}</span>
              {active.slotId && (
                <span className="text-ink-soft font-semibold ml-1">
                  （{slotLabel(slots.findIndex((s) => s.id === active.slotId))}）
                </span>
              )}
            </div>
            <button
              onClick={clearActive}
              disabled={!!publishingId}
              className="kid-button-sm bg-white border-2 border-rose-200 text-rose-600"
            >
              结束这一局
            </button>
          </div>
          <div className="text-xs text-ink-soft mt-1">学生端已经可以看到这道题（共 {active.answers.length} 个回答）。</div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm font-bold">📋 待定题库（共 {slots.length} 题）</div>
        <button onClick={() => saveBank()} disabled={saving} className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft">
          {saving ? '保存中…' : '💾 保存全部待定题'}
        </button>
      </div>

      <div className="space-y-4">
        {slots.map((slot, index) => {
          const isGen = generatingId === slot.id;
          const isPub = publishingId === slot.id;
          const isLive = active?.slotId === slot.id;
          const ready = slot.question.trim() && slot.human1.trim() && slot.human2.trim() && slot.ai1.trim() && slot.ai2.trim();

          return (
            <div key={slot.id} className={`kid-card space-y-3 ${isLive ? 'ring-2 ring-emerald-300 border-emerald-200' : ''}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-extrabold text-base flex items-center gap-2">
                  <span className="tag">{slotLabel(index)}</span>
                  {isLive && <span className="text-xs font-bold text-emerald-600">● 学生正在做这题</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => genAi(slot)}
                    disabled={isGen || saving}
                    className="kid-button-sm bg-white border-2 border-violet-200 text-violet-700"
                  >
                    {isGen ? '🤖 生成中…' : '🤖 生成 AI 回答'}
                  </button>
                  <button
                    onClick={() => publishSlot(slot.id)}
                    disabled={isPub || saving || !ready}
                    className="kid-button-primary !py-2 !px-4 text-sm"
                  >
                    {isPub ? '发布中…' : '🚀 发布此题'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold">问题</label>
                <input
                  className="kid-input mt-2"
                  value={slot.question}
                  onChange={(e) => updateSlot(slot.id, { question: e.target.value })}
                  placeholder="例如：你最喜欢的一种动物是什么？"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {([
                  { key: 'human1' as const, label: '👦 小朋友 1', n: 1 },
                  { key: 'human2' as const, label: '👧 小朋友 2', n: 2 },
                ]).map(({ key, label, n }) => (
                  <div key={key}>
                    <label className="text-sm font-bold">{label}（≤{TURING_MAX_ANSWER_LEN}字）</label>
                    <textarea
                      className="kid-textarea !min-h-[56px]"
                      maxLength={TURING_MAX_ANSWER_LEN}
                      value={slot[key]}
                      onChange={(e) => updateSlot(slot.id, { [key]: e.target.value })}
                      placeholder={`小朋友 ${n} 的回答`}
                    />
                    <div className="text-right text-xs text-slate-400">{slot[key].length}/{TURING_MAX_ANSWER_LEN}</div>
                  </div>
                ))}
              </div>

              {isGen && <AiProgress label="AI 正在写 15 字以内的小朋友风格回答…" />}

              {(slot.ai1 || slot.ai2) && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {([
                    { key: 'ai1' as const, label: '🤖 AI 回答 1' },
                    { key: 'ai2' as const, label: '🤖 AI 回答 2' },
                  ]).map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs font-bold text-violet-700">{label}（≤{TURING_MAX_ANSWER_LEN}字，可微调）</label>
                      <textarea
                        className="kid-textarea !min-h-[56px] mt-1"
                        maxLength={TURING_MAX_ANSWER_LEN}
                        value={slot[key]}
                        onChange={(e) => updateSlot(slot.id, { [key]: e.target.value })}
                      />
                      <div className="text-right text-xs text-slate-400">{slot[key].length}/{TURING_MAX_ANSWER_LEN}</div>
                    </div>
                  ))}
                </div>
              )}

              {!ready && (
                <p className="text-xs text-ink-soft">填好问题、两位小朋友回答，并生成 AI 回答后，即可「发布此题」。</p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
      )}
      <AiWarning extra="发布前请确认 AI 回答适合小朋友，且不超过 15 个字。" />
    </div>
  );
}
