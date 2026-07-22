'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { PmChatPanel } from '@/components/course/pm-chat-panel';
import { PmPrdDocument } from '@/components/course/pm-prd-document';
import { EMPTY_WIZARD_ANSWERS, PmPrdWizardPanel } from '@/components/course/pm-prd-wizard-panel';
import { useLanguage } from '@/contexts/language-context';
import { sendPmChat } from '@/lib/pm-chat-api';
import {
  PM_REQUIREMENTS_SYSTEM,
  PM_WIZARD_REVIEW_SYSTEM,
  buildRequirementsFirstMessage,
  isPrdComplete,
  isPrdFieldsComplete,
  isPrdMarkedCompleteInReply,
  mergePrd,
  parsePrdFromAiReply,
  prdToMarkdown,
  stripPrdJsonBlock,
  type PmPrdFields,
} from '@/lib/pm-prompts';
import {
  buildHtmlPromptFromPrd,
  buildInterestSummary,
  buildWizardReviewFirstMessage,
  type PmRequirementsInputMode,
  type PmPrdWizardAnswers,
} from '@/lib/pm-prd-wizard';
import {
  emptyPrd,
  loadPmRequirements,
  savePmRequirements,
  type ChatMessage,
  type PmCreatorEmbedProps,
} from '@/lib/pm-pipeline';
import { reportGrowth } from '@/lib/growth-report';
import { persistPmTextAsset } from '@/lib/persist-pm-text-asset';

export function PmRequirementsGame({ embedded, onNextStep }: PmCreatorEmbedProps = {}) {
  const { tx } = useLanguage();
  const [inputMode, setInputMode] = useState<PmRequirementsInputMode>('wizard');
  const [interest, setInterest] = useState('');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [wizardAnswers, setWizardAnswers] = useState<PmPrdWizardAnswers>(EMPTY_WIZARD_ANSWERS);
  const [wizardReviewStarted, setWizardReviewStarted] = useState(false);
  const [prd, setPrd] = useState<PmPrdFields>(emptyPrd());
  const [prdComplete, setPrdComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [htmlPromptCopied, setHtmlPromptCopied] = useState(false);

  const computeFromAiReply = useCallback((reply: string, prevPrd: PmPrdFields) => {
    const patch = parsePrdFromAiReply(reply);
    const nextPrd = mergePrd(prevPrd, patch);
    const aiMarked = isPrdMarkedCompleteInReply(patch, reply);
    return { nextPrd, complete: isPrdComplete(nextPrd, aiMarked) };
  }, []);

  const applyAiReply = useCallback(
    (reply: string, prevPrd: PmPrdFields) => {
      const { nextPrd, complete } = computeFromAiReply(reply, prevPrd);
      setPrd(nextPrd);
      setPrdComplete(complete);
      setSaved(false);
      return nextPrd;
    },
    [computeFromAiReply],
  );

  useEffect(() => {
    const data = loadPmRequirements();
    if (data) {
      setInterest(data.interest);
      setMessages(data.messages);
      setPrd(data.prd);
      setAssetId(data.assetId ?? null);
      setInputMode(data.inputMode ?? (data.messages.length > 0 ? 'chat' : 'wizard'));
      setWizardAnswers(data.wizardAnswers ?? EMPTY_WIZARD_ANSWERS);
      setWizardReviewStarted(Boolean(data.wizardReviewStarted));
      setPrdComplete(
        data.prdComplete ?? isPrdComplete(data.prd, data.messages.some((m) => /需求说明书可以定稿/.test(m.content))),
      );
      setStarted(
        Boolean(
          data.messages.length > 0
          || data.wizardReviewStarted
          || data.prd.productName?.trim()
          || data.wizardAnswers?.scene,
        ),
      );
    }
  }, []);

  useEffect(() => {
    if (!started) return;
    const timer = window.setTimeout(() => {
      savePmRequirements({
        interest,
        messages,
        prd,
        assetId,
        inputMode,
        wizardAnswers,
        wizardReviewStarted,
        prdComplete,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [started, interest, messages, prd, assetId, inputMode, wizardAnswers, wizardReviewStarted, prdComplete]);

  function handleNextStep() {
    savePmRequirements({
      interest,
      messages,
      prd,
      assetId,
      inputMode,
      wizardAnswers,
      wizardReviewStarted,
      prdComplete,
    });
    onNextStep?.();
  }

  function startWizard() {
    setError(null);
    setInputMode('wizard');
    setStarted(true);
    setSaved(false);
  }

  async function startChat() {
    if (!interest.trim()) {
      setError('请先输入你的兴趣！');
      return;
    }
    setError(null);
    setBusy(true);
    setInputMode('chat');
    setWizardReviewStarted(false);
    const first = buildRequirementsFirstMessage(interest);
    setStarted(true);
    setMessages([{ role: 'user', content: first }]);
    setPrd(emptyPrd());
    setPrdComplete(false);
    try {
      const reply = await sendPmChat({
        prompt: first,
        system: PM_REQUIREMENTS_SYSTEM,
        messages: [],
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: stripPrdJsonBlock(reply) }]);
      applyAiReply(reply, emptyPrd());
    } catch (e: unknown) {
      setError((e as Error)?.message || '对话失败');
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || busy) return;
    const userText = input.trim();
    setInput('');
    setError(null);
    setBusy(true);
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const system = wizardReviewStarted ? PM_WIZARD_REVIEW_SYSTEM : PM_REQUIREMENTS_SYSTEM;
    try {
      const reply = await sendPmChat({
        prompt: userText,
        system,
        messages: history,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: stripPrdJsonBlock(reply) }]);
      setPrd((prev) => {
        const { nextPrd, complete } = computeFromAiReply(reply, prev);
        setPrdComplete(complete);
        setSaved(false);
        return nextPrd;
      });
    } catch (e: unknown) {
      setError((e as Error)?.message || '发送失败');
    } finally {
      setBusy(false);
    }
  }

  async function startWizardAiReview() {
    setError(null);
    setBusy(true);
    setWizardReviewStarted(true);
    setInputMode('chat');
    setStarted(true);
    setSaved(false);
    setPrdComplete(false);
    setPrd(emptyPrd());
    setInterest(buildInterestSummary(wizardAnswers));

    const first = buildWizardReviewFirstMessage(wizardAnswers);
    setMessages([{ role: 'user', content: first }]);

    try {
      const reply = await sendPmChat({
        prompt: first,
        system: PM_WIZARD_REVIEW_SYSTEM,
        messages: [],
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: stripPrdJsonBlock(reply) }]);
      applyAiReply(reply, emptyPrd());
    } catch (e: unknown) {
      setError((e as Error)?.message || 'AI 分析失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  }

  function backToWizard() {
    if (
      wizardReviewStarted
      && messages.length > 0
      && !window.confirm('返回修改作品卡后，需要重新「提交给 AI 分析」。确定吗？')
    ) {
      return;
    }
    setWizardReviewStarted(false);
    setInputMode('wizard');
  }

  function restartWizard() {
    if (!window.confirm('确定清空作品卡与 AI 对话，重新开始吗？')) return;
    setWizardAnswers(EMPTY_WIZARD_ANSWERS);
    setPrd(emptyPrd());
    setInterest('');
    setMessages([]);
    setStarted(false);
    setSaved(false);
    setWizardReviewStarted(false);
    setPrdComplete(false);
    setInputMode('wizard');
  }

  async function copyPrd() {
    try {
      await navigator.clipboard.writeText(prdToMarkdown(prd));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请手动选择右侧文字复制。');
    }
  }

  async function copyHtmlPrompt() {
    try {
      await navigator.clipboard.writeText(buildHtmlPromptFromPrd(prd));
      setHtmlPromptCopied(true);
      window.setTimeout(() => setHtmlPromptCopied(false), 2000);
    } catch {
      setError('复制失败，请稍后重试。');
    }
  }

  async function handleSave() {
    if (!prdComplete) {
      setError('需求说明书尚未完善，请继续回答 AI 的问题，直到 AI 输入/输出都明确。');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const title = prd.productName?.trim() || 'AI 产品需求说明书';
      const nextAssetId = await persistPmTextAsset({
        assetId,
        title,
        summary: prd.tagline?.trim() || interest || 'AI 产品经理 · 需求说明书',
        content: prdToMarkdown(prd),
        meta: {
          kind: 'pm-prd',
          sourceGame: 'pm-requirements',
          prd,
          interest,
          inputMode,
          wizardAnswers,
          prdComplete: true,
        },
      });
      savePmRequirements({
        interest,
        messages,
        prd,
        assetId: nextAssetId,
        inputMode,
        wizardAnswers,
        wizardReviewStarted,
        prdComplete: true,
      });
      setAssetId(nextAssetId);
      setSaved(true);
      void reportGrowth({
        kind: 'creation',
        gameSlug: 'pm-requirements',
        title,
        summary: prd.tagline || interest,
        detail: { prd, inputMode },
      });

      window.alert('✅ 需求说明书保存成功！');

      if (embedded && onNextStep) {
        const goNext = window.confirm('是否跳转到下一步，开始制作 AI 小应用？');
        if (goNext) handleNextStep();
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  const hasPrdDraft = isPrdFieldsComplete(prd) || Boolean(prd.productName?.trim() || prd.problem?.trim());
  const showChat = inputMode === 'chat' || wizardReviewStarted;
  const showWizard = inputMode === 'wizard' && !wizardReviewStarted;

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="kid-card-yellow">
          <div className="font-extrabold text-lg">📝 {tx('问题挖掘与需求说明书')}</div>
          <p className="text-sm text-ink-soft mt-1">
            先用<strong>选择题</strong>填写作品卡，再交给 <strong>AI 产品经理</strong>分析、反问；右侧会逐步生成完整需求说明书。
          </p>
        </div>
      )}

      {!started && (
        <div className="kid-card-yellow !py-3 !px-4 space-y-3">
          <p className="text-sm font-semibold text-ink-soft">
            🕵️ 推荐先用<strong>选择题</strong>完成作品卡，提交后 AI 会继续问你；也可以从兴趣出发<strong>对话填空</strong>。
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="kid-button-primary !py-2 !px-5" onClick={startWizard}>
              🎯 开始选择题向导
            </button>
            <div className="flex flex-wrap gap-2 items-end flex-1 min-w-[240px]">
              <label className="flex-1 min-w-[160px]">
                <span className="text-xs font-bold">我的兴趣（对话模式）</span>
                <input
                  className="kid-input mt-1 w-full"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  placeholder="例如：养猫、打篮球、看科幻书…"
                />
              </label>
              <button type="button" className="kid-button-ghost !py-2 !px-4" onClick={startChat} disabled={busy}>
                💬 开始对话
              </button>
            </div>
          </div>
        </div>
      )}

      <AiWarning />
      {busy && <AiProgress label="AI 产品经理导师正在思考…" estimate="预计约 30 秒" durationMs={30_000} />}

      {started && (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-2 min-h-0">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={backToWizard}
                className={`kid-button-sm border-2 ${
                  showWizard
                    ? 'bg-violet-500 text-white border-violet-500'
                    : 'bg-white text-ink-soft border-violet-200'
                }`}
              >
                🎯 选择题向导
              </button>
              <button
                type="button"
                onClick={() => setInputMode('chat')}
                className={`kid-button-sm border-2 ${
                  showChat
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white text-ink-soft border-emerald-200'
                }`}
              >
                💬 AI 对话完善
              </button>
            </div>

            {showWizard ? (
              <div className="h-[520px] min-h-0">
                <PmPrdWizardPanel
                  answers={wizardAnswers}
                  reviewStarted={wizardReviewStarted}
                  onChange={(next) => {
                    setWizardAnswers(next);
                    setSaved(false);
                  }}
                  onSubmitToAi={() => void startWizardAiReview()}
                />
              </div>
            ) : (
              <div className="h-[520px] min-h-0 overflow-hidden space-y-2 flex flex-col">
                {wizardReviewStarted && (
                  <div className="kid-card !py-2 !px-3 text-xs text-violet-800 bg-violet-50 border-violet-200 shrink-0">
                    ✅ 作品卡已提交。请回答 AI 产品经理的问题，直到右侧需求说明书完善（含明确的 AI 输入/输出）。
                  </div>
                )}
                {!messages.length && inputMode === 'chat' && !wizardReviewStarted && (
                  <div className="kid-card !py-2 !px-3 flex flex-wrap gap-2 items-end shrink-0">
                    <label className="flex-1 min-w-[160px]">
                      <span className="text-xs font-bold">我的兴趣</span>
                      <input
                        className="kid-input mt-1 w-full"
                        value={interest}
                        onChange={(e) => setInterest(e.target.value)}
                        placeholder="例如：养猫、打篮球…"
                      />
                    </label>
                    <button type="button" className="kid-button-primary !py-2 !px-4 text-sm" onClick={startChat} disabled={busy}>
                      开始对话
                    </button>
                  </div>
                )}
                <div className="flex-1 min-h-0">
                  <PmChatPanel
                    messages={messages}
                    input={input}
                    onInputChange={setInput}
                    onSend={sendMessage}
                    busy={busy}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="kid-card space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-extrabold">📋 AI 产品需求说明书</div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  prdComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {prdComplete ? '✅ 已完善' : '✍️ 完善中'}
              </span>
            </div>

            {!prdComplete && hasPrdDraft && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                AI 还在帮你理清需求。请继续对话，直到「用户输入什么」「AI 输出什么」都写清楚，AI 会说「需求说明书可以定稿啦」。
              </p>
            )}

            <div className="bg-orange-50/50 rounded-xl p-4 border-2 border-orange-100">
              <PmPrdDocument
                prd={prd}
                onChange={(next) => {
                  setPrd(next);
                  setSaved(false);
                  setPrdComplete(isPrdComplete(next, prdComplete));
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="kid-button-primary !py-1.5 !px-3 text-xs"
                onClick={handleSave}
                disabled={saving || !prdComplete}
                title={prdComplete ? undefined : '请先与 AI 完善需求说明书'}
              >
                {saving ? tx('保存中…') : tx('💾 保存需求说明书')}
              </button>
              {hasPrdDraft && (
                <>
                  <button type="button" className="kid-button-ghost !py-1.5 !px-3 text-xs" onClick={backToWizard}>
                    ✏️ 修改作品卡
                  </button>
                  <button type="button" className="kid-button-ghost !py-1.5 !px-3 text-xs" onClick={restartWizard}>
                    🔄 重新开始
                  </button>
                  <button type="button" className="kid-button-ghost !py-1.5 !px-3 text-xs" onClick={copyPrd}>
                    {copied ? '✅ 已复制' : '📋 复制说明书'}
                  </button>
                  <button type="button" className="kid-button-ghost !py-1.5 !px-3 text-xs" onClick={copyHtmlPrompt}>
                    {htmlPromptCopied ? '✅ 已复制' : '🌐 生成 HTML 提示词'}
                  </button>
                </>
              )}
            </div>

            {saved && (
              <p className="text-xs font-bold text-emerald-600">
                ✅ {tx('需求说明书已保存成功！')}
                {!embedded && (
                  <Link href="/student/assets" className="underline ml-1">
                    {tx('去素材库查看 →')}
                  </Link>
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm font-bold text-rose-600">{error}</p>}

      {started && embedded && onNextStep && (
        <p className="text-xs text-ink-soft px-1">
          保存需求说明书后，可选择进入下一步制作 AI 小应用；草稿会自动保存到本机。
        </p>
      )}

      {started && embedded && onNextStep && (
        <button
          type="button"
          className="kid-button-primary !py-2 !px-5 text-sm"
          onClick={handleNextStep}
          disabled={!prdComplete}
        >
          下一步：制作 AI 小应用 →
        </button>
      )}

      {started && !embedded && prdComplete && (
        <Link href="/student/course/g/pm-prompt-test" className="kid-button-ghost inline-block !py-2 !px-4 text-sm">
          下一步：系统提示词测试 →
        </Link>
      )}
    </div>
  );
}
