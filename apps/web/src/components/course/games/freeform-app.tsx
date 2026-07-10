'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { persistWebAsset } from '@/lib/persist-web-asset';
import { mergeWebHtml } from '@/lib/merge-web-html';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { HtmlPreview, type PickedElement } from '@/components/course/html-preview';
import { AiProgress } from '@/components/course/ai-progress';
import { FillBlankSentence, renderFilledSentence, type FillBlankSpec } from '@/components/course/fill-blank-sentence';

interface FreeformForm {
  topic: string;
  audience: string;
  scenario: string;
  layoutItems: string;
  clickTarget: string;
  feedback: string;
}

const DEFAULT_FORM: FreeformForm = {
  topic: '我最喜欢的动物图鉴',
  audience: '同学和好朋友',
  scenario: '课间休息或放学后想认识新动物的时候',
  layoutItems: '大标题、几张动物图片卡片、点击后出现的介绍文字',
  clickTarget: '一张动物卡片',
  feedback: '弹出这只动物的名字和一条有趣小知识',
};

const SCENE_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['🎯 我的主题是「', '」，给「', '」使用，使用场景是「', '」。'],
  blanks: [
    {
      key: 'topic',
      placeholder: '想做什么小应用',
      quickOptions: ['我最喜欢的动物图鉴', '班级小任务打卡器', '心情能量补给站', '故事结局选择器'],
    },
    { key: 'audience', placeholder: '给谁用', quickOptions: ['同学和好朋友', '爸爸妈妈和家人'] },
    {
      key: 'scenario',
      placeholder: '什么时候用',
      quickOptions: ['课间休息或放学后想认识新动物的时候', '每天完成任务想打卡的时候'],
    },
  ],
};

const LAYOUT_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['🧱 页面里有「', '」。'],
  blanks: [
    {
      key: 'layoutItems',
      placeholder: '页面上都有什么',
      quickOptions: ['大标题、几张图片卡片、点击后出现的介绍文字', '大标题、一个输入框、一个按钮、结果展示区'],
    },
  ],
};

const INTERACTION_TEMPLATE: { segments: string[]; blanks: FillBlankSpec[] } = {
  segments: ['👆 用户点击「', '」，页面就会「', '」。'],
  blanks: [
    { key: 'clickTarget', placeholder: '点哪里', quickOptions: ['一张动物卡片', '「开始」按钮'] },
    {
      key: 'feedback',
      placeholder: '页面出现什么',
      quickOptions: ['弹出这只动物的名字和一条有趣小知识', '弹出一句鼓励的话，并记录今天已经完成'],
    },
  ],
};

const PAGE_TITLE_DEFAULT = '我的 AI 小应用';

type IterationTarget = { kind: 'page' } | { kind: 'element'; element: PickedElement };

function buildPrompt(form: FreeformForm) {
  return `请帮小学生做一个属于他自己的 AI 小应用网页（单文件 HTML，含内联 CSS 和 JavaScript）。

【场景】
- 主题：${form.topic.trim()}
- 给谁使用：${form.audience.trim()}
- 使用场景：${form.scenario.trim()}

【布局】
- 页面里有：${form.layoutItems.trim()}

【交互】
- 用户点击：${form.clickTarget.trim()}
- 页面反馈：${form.feedback.trim()}

要求：
1. 儿童风格，活泼可爱、色彩明亮，紧扣「${form.topic.trim()}」这个主题设计文案和配色。
2. 必须实现真实可点的 JavaScript 交互，不能只是静态展示。
3. 可以预设 3～5 条示例内容，让页面一打开就有东西可以看、可以点。
4. 输出单文件 HTML（含内联 CSS 和 JS），不要使用外部网络资源。
5. 只输出 HTML 代码，不要 Markdown 代码块。`;
}

function buildIterationPrompt(html: string, target: IterationTarget, instruction: string) {
  const targetBlock =
    target.kind === 'page'
      ? '【修改范围】整页（可以调整布局、配色、文案和交互）'
      : `【修改范围】仅修改用户点选的这一个部分（及其直接相关的样式/结构），不要改动页面其他区域
【选中元素】${target.element.hint}
【元素 HTML 片段】
${target.element.outerHtml}`;

  return `这是我当前的小应用网页 HTML：
${html}

${targetBlock}

【小学生的修改意见】
${instruction.trim()}

要求：输出完整单文件 HTML（含内联 CSS 和 JavaScript），可直接运行。只输出 HTML 代码，不要 Markdown 代码块。`;
}

export function FreeformAppGame() {
  const [form, setForm] = useState<FreeformForm>(DEFAULT_FORM);
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iterateInstruction, setIterateInstruction] = useState('');
  const [iterTarget, setIterTarget] = useState<IterationTarget | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  function setField(key: keyof FreeformForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleElementPick = useCallback((element: PickedElement) => {
    setIterTarget({ kind: 'element', element });
  }, []);

  const iterTargetLabel = iterTarget?.kind === 'page' ? '整页' : iterTarget?.kind === 'element' ? iterTarget.element.hint : null;

  function validateForm() {
    const allBlanks = [...SCENE_TEMPLATE.blanks, ...LAYOUT_TEMPLATE.blanks, ...INTERACTION_TEMPLATE.blanks];
    if (allBlanks.some((b) => !form[b.key as keyof FreeformForm].trim())) {
      setError('场景、布局、交互三段话的每个空都要填哦！');
      return false;
    }
    return true;
  }

  async function generate() {
    if (!validateForm()) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const prompt = buildPrompt(form);
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      const merged = mergeWebHtml({ html: r.data.html || '', css: r.data.css || '', js: r.data.js || '' });
      setHtml(merged);
      setIterateInstruction('');
      setIterTarget(null);
      setPreviewKey((k) => k + 1);

      const persisted = await persistWebAsset({
        title: form.topic.trim() || PAGE_TITLE_DEFAULT,
        html: merged,
        summary: renderFilledSentence(INTERACTION_TEMPLATE.segments, INTERACTION_TEMPLATE.blanks, form as unknown as Record<string, string>),
        prompt,
        description: '课程 · 做自己的 AI 小应用',
        projectId,
        assetId,
        meta: { kind: 'web-page', sourceGame: 'freeform-app', ...form },
      });
      setProjectId(persisted.projectId);
      setAssetId(persisted.assetId);
      setPageUrl(persisted.url);
      setSaved(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  async function applyIteration() {
    if (!iterateInstruction.trim() || !html || !iterTarget) {
      setError('先在预览里点选一个部分，或点「选中整页」。');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const prompt = buildIterationPrompt(html, iterTarget, iterateInstruction);
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      const merged = mergeWebHtml({ html: r.data.html || '', css: r.data.css || '', js: r.data.js || '' });
      setHtml(merged);
      setIterateInstruction('');
      setIterTarget(null);
      setPreviewKey((k) => k + 1);

      const persisted = await persistWebAsset({
        title: form.topic.trim() || PAGE_TITLE_DEFAULT,
        html: merged,
        summary: renderFilledSentence(INTERACTION_TEMPLATE.segments, INTERACTION_TEMPLATE.blanks, form as unknown as Record<string, string>),
        prompt,
        description: '课程 · 做自己的 AI 小应用',
        projectId,
        assetId,
        meta: { kind: 'web-page', sourceGame: 'freeform-app', ...form },
      });
      setProjectId(persisted.projectId);
      setAssetId(persisted.assetId);
      setPageUrl(persisted.url);
      setSaved(true);
    } catch (e: unknown) {
      setError((e as Error)?.message || '修改失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-yellow">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🪄 这次由你自己选题！填一句话说清楚<b>场景</b>，填一句话摆好<b>布局</b>，再填一句话设计<b>交互</b>，AI 就会帮你把它做成一个真正能玩的小应用。
        </p>
      </div>

      <div className="kid-card-orange space-y-3">
        <div className="text-sm font-bold">📍 第一步 · 填空描述场景</div>
        <FillBlankSentence
          segments={SCENE_TEMPLATE.segments}
          blanks={SCENE_TEMPLATE.blanks}
          values={form as unknown as Record<string, string>}
          onChange={(k, v) => setField(k as keyof FreeformForm, v)}
        />
      </div>

      <div className="kid-card-sky space-y-3">
        <div className="text-sm font-bold">🧱 第二步 · 填空摆好布局</div>
        <FillBlankSentence
          segments={LAYOUT_TEMPLATE.segments}
          blanks={LAYOUT_TEMPLATE.blanks}
          values={form as unknown as Record<string, string>}
          onChange={(k, v) => setField(k as keyof FreeformForm, v)}
        />
      </div>

      <div className="kid-card-purple space-y-3">
        <div className="text-sm font-bold">👆 第三步 · 填空设计交互</div>
        <FillBlankSentence
          segments={INTERACTION_TEMPLATE.segments}
          blanks={INTERACTION_TEMPLATE.blanks}
          values={form as unknown as Record<string, string>}
          onChange={(k, v) => setField(k as keyof FreeformForm, v)}
        />
      </div>

      <div className="kid-card space-y-3">
        <button onClick={generate} disabled={busy} className="kid-button-primary w-full">
          {busy ? '🪄 AI 正在制作你的小应用…' : '🚀 生成我的小应用'}
        </button>
        {busy && <AiProgress label="AI 正在按你的场景/布局/交互制作小应用…" />}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      </div>

      {html && (
        <>
          {saved && pageUrl && (
            <div className="kid-card-mint space-y-2">
              <div className="font-extrabold text-emerald-800">✅ 你的小应用已发布！</div>
              <p className="text-sm text-ink-soft">已保存到「我的网页」和素材库。</p>
              <div className="flex flex-wrap gap-2">
                <Link href={pageUrl} target="_blank" className="kid-button-primary !py-2 !px-4 text-sm">
                  🌐 打开我的小应用
                </Link>
                <Link href="/student/projects" className="kid-button-ghost !py-2 !px-4 text-sm">
                  💻 我的网页
                </Link>
              </div>
            </div>
          )}

          <div className="kid-card-purple space-y-3">
            <div className="text-sm font-bold">🔄 点选修改</div>
            <p className="text-xs text-ink-soft">点击预览中要改的部分，或选中整页，用语音/文字告诉 AI 怎么改。</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIterTarget({ kind: 'page' })}
                className={`kid-button-sm border-2 ${iterTarget?.kind === 'page' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-ink-soft border-violet-200'}`}
              >
                🌐 选中整页
              </button>
              {iterTargetLabel && (
                <span className="text-xs font-bold text-violet-700 bg-violet-50 border-2 border-violet-100 rounded-full px-3 py-1.5 self-center">
                  已选中：{iterTargetLabel}
                </span>
              )}
              {iterTarget && (
                <button
                  type="button"
                  onClick={() => {
                    setIterTarget(null);
                    setPreviewKey((k) => k + 1);
                  }}
                  className="kid-button-sm bg-white text-ink-soft border-2 border-orange-200"
                >
                  取消选中
                </button>
              )}
            </div>
            <HtmlPreview key={previewKey} html={html} height={500} interactive pickMode onPick={handleElementPick} />
            <div className="rounded-xl bg-white border-2 border-violet-100 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-sm font-bold">🎤 告诉 AI 要怎么改</label>
                <VoiceInputButton onResult={(t) => setIterateInstruction((p) => (p ? p + ' ' : '') + t)} />
              </div>
              <textarea
                className="kid-textarea !min-h-[72px]"
                value={iterateInstruction}
                onChange={(e) => setIterateInstruction(e.target.value)}
                placeholder="描述你想怎么改…"
              />
              <button onClick={applyIteration} disabled={busy || !iterateInstruction.trim() || !iterTarget} className="kid-button-primary w-full">
                {busy ? '✨ AI 正在修改…' : '✨ 应用修改'}
              </button>
            </div>
            <AiWarning extra="发布后可继续点选页面微调，每次修改会自动保存。" />
          </div>
        </>
      )}
    </div>
  );
}
