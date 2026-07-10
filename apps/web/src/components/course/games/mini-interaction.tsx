'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { persistWebAsset } from '@/lib/persist-web-asset';
import { splitInlineWebParts } from '@/lib/merge-web-html';
import { AiWarning } from '@/components/ai-warning';
import { HtmlPreview } from '@/components/course/html-preview';
import { AiProgress } from '@/components/course/ai-progress';
import { FillBlankSentence, renderFilledSentence, type FillBlankSpec } from '@/components/course/fill-blank-sentence';
import {
  INTERACTION_TEMPLATES,
  TRIGGER_OPTIONS,
  buildInteractionPrompt,
  interactionRuleSentence,
  type InteractionLayerSpec,
  type TriggerOption,
} from './mini-interaction-templates';

const RULE_SEGMENTS = ['当我对页面上的「', '」进行「', '」时，页面会「', '」。'];

function layerFromValues(values: Record<string, string>): InteractionLayerSpec | null {
  const target = values.target?.trim();
  const trigger = values.trigger?.trim() as TriggerOption;
  const result = values.result?.trim();
  if (!target || !trigger || !result) return null;
  if (!TRIGGER_OPTIONS.includes(trigger)) return null;
  return { target, trigger, result };
}

export function MiniInteractionGame() {
  const [templateId, setTemplateId] = useState(INTERACTION_TEMPLATES[0].id);
  const [form, setForm] = useState<Record<string, string>>(() => ({
    target: INTERACTION_TEMPLATES[0].defaults.target,
    trigger: INTERACTION_TEMPLATES[0].defaults.trigger,
    result: INTERACTION_TEMPLATES[0].defaults.result,
  }));
  const [layers, setLayers] = useState<InteractionLayerSpec[]>([]);
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const template = INTERACTION_TEMPLATES.find((t) => t.id === templateId) ?? INTERACTION_TEMPLATES[0];

  const ruleBlanks: FillBlankSpec[] = useMemo(
    () => [
      {
        key: 'target',
        placeholder: '点哪里',
        input: 'select',
        quickOptions: template.clickTargets,
      },
      {
        key: 'trigger',
        placeholder: '什么操作',
        input: 'select',
        quickOptions: [...TRIGGER_OPTIONS],
      },
      {
        key: 'result',
        placeholder: '出现什么效果',
        quickOptions: template.resultOptions,
      },
    ],
    [template],
  );

  const currentRule = useMemo(
    () => renderFilledSentence(RULE_SEGMENTS, ruleBlanks, form),
    [form, ruleBlanks],
  );

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm(nextTemplate = template) {
    setForm({
      target: nextTemplate.defaults.target,
      trigger: nextTemplate.defaults.trigger,
      result: nextTemplate.defaults.result,
    });
  }

  function pickTemplate(id: string) {
    const t = INTERACTION_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setHtml('');
    setLayers([]);
    setSaved(false);
    setError(null);
    setPageUrl(null);
    resetForm(t);
  }

  function validateLayer(): InteractionLayerSpec | null {
    const layer = layerFromValues(form);
    if (!layer) {
      setError('请选好「点哪里」「什么操作」，并填写会出现什么效果。');
      return null;
    }
    return layer;
  }

  async function persistCurrentHtml(nextHtml: string, nextLayers: InteractionLayerSpec[]) {
    const summary = nextLayers.map((l, i) => `${i + 1}. ${interactionRuleSentence(l)}`).join('\n');
    const parts = splitInlineWebParts(nextHtml);
    const title = `我的小交互：${template.title}${nextLayers.length > 1 ? `（${nextLayers.length} 条）` : ''}`;
    const persisted = await persistWebAsset({
      title,
      html: parts.html || nextHtml,
      css: parts.css || undefined,
      js: parts.js || undefined,
      summary,
      prompt: summary,
      description: '课程 · 小交互',
      projectId,
      assetId,
      meta: {
        kind: 'interaction',
        templateId,
        layers: nextLayers,
        sourceGame: 'mini-interaction',
      },
    });
    setProjectId(persisted.projectId);
    setAssetId(persisted.assetId);
    setPageUrl(persisted.url);
    setSaved(true);
  }

  async function addInteraction() {
    const layer = validateLayer();
    if (!layer) return;

    setBusy(true);
    setError(null);
    try {
      const baseHtml = html || template.html;
      const prompt = buildInteractionPrompt({
        template,
        baseHtml,
        newLayer: layer,
        existingLayers: layers,
      });
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      let out = r.data.html || '';
      if (r.data.css) out = out.replace(/<\/head>/i, `<style>${r.data.css}</style></head>`);
      if (r.data.js) out = out.replace(/<\/body>/i, `<script>${r.data.js}<\/script></body>`);

      const nextLayers = [...layers, layer];
      setHtml(out);
      setLayers(nextLayers);
      await persistCurrentHtml(out, nextLayers);

      // 准备下一条：保留 trigger，换一组默认 target/result 方便叠加
      const nextTarget =
        template.clickTargets.find((t) => t !== layer.target) ?? template.defaults.target;
      const nextResult =
        template.resultOptions.find((r) => r !== layer.result) ?? template.defaults.result;
      setForm({
        target: nextTarget,
        trigger: layer.trigger,
        result: nextResult,
      });
    } catch (e: unknown) {
      setError((e as Error)?.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setHtml('');
    setLayers([]);
    setSaved(false);
    setPageUrl(null);
    setError(null);
    resetForm();
  }

  const previewHtml = html || template.html;
  const isInteractivePreview = !!html;

  return (
    <div className="space-y-4">
      <div className="kid-card-purple">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          👆 先选一张静态页面，用<b>下拉填空</b>说清楚：对页面上的<b>哪个区域</b>、用什么<b>鼠标操作</b>（单击/双击/右键/拖拽）、会出现<b>什么效果</b>。
          下拉框里选不到想要的？点<b>「➕ 自己写一个」</b>就能自己新增一个选项。可以<b>一条一条叠加</b>——例如先让小猫跳起来，再让小草摇摆！
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {INTERACTION_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => pickTemplate(t.id)}
            className={`kid-button-sm border-2 ${templateId === t.id ? 'bg-brand text-white border-brand' : 'bg-white text-ink-soft border-orange-200'}`}
          >
            {t.emoji} {t.title}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="kid-card space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-bold">
              {isInteractivePreview ? '🎉 当前页面（已加交互）' : '📄 无交互页面（先看一看）'}
            </div>
            <span className="tag text-[10px]">{isInteractivePreview ? `${layers.length} 条交互` : '静态预览'}</span>
          </div>
          <p className="text-xs text-ink-soft">{template.desc}</p>
          <HtmlPreview html={previewHtml} height={380} interactive={isInteractivePreview} />
          <p className="text-xs text-center text-ink-soft">
            {isInteractivePreview ? '↑ 可以直接点点看已有交互' : '↑ 右侧填好规则后，让 AI 把交互加上去'}
          </p>
        </div>

        <div className="kid-card space-y-3">
          <div className="text-sm font-bold">✏️ 给「{template.emoji} {template.title}」{layers.length > 0 ? '再加一条' : '加上'}交互</div>

          <FillBlankSentence
            segments={RULE_SEGMENTS}
            blanks={ruleBlanks}
            values={form}
            onChange={setField}
            voice={false}
          />

          <div className="rounded-xl bg-violet-50 border-2 border-violet-100 px-3 py-2 text-sm text-violet-800">
            🧩 这条规则：{currentRule}
          </div>

          {layers.length > 0 && (
            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-100 px-3 py-2 space-y-1">
              <div className="text-xs font-bold text-emerald-800">✅ 已叠加的交互（{layers.length} 条）</div>
              {layers.map((l, i) => (
                <div key={`${l.target}-${i}`} className="text-xs text-emerald-900">
                  {i + 1}. {interactionRuleSentence(l)}
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={addInteraction} disabled={busy} className="kid-button-primary w-full">
            {busy
              ? '✨ AI 正在加交互…'
              : layers.length > 0
                ? '➕ 再叠加一条交互'
                : '✨ 添加第一条交互'}
          </button>

          {layers.length > 0 && (
            <button type="button" onClick={startOver} disabled={busy} className="kid-button-ghost w-full text-sm">
              🔄 清空重来（从静态页重新开始）
            </button>
          )}

          {busy && <AiProgress label={layers.length > 0 ? 'AI 正在叠加新交互，请稍等…' : 'AI 正在把交互加到页面上…'} />}
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
          )}
        </div>
      </div>

      {html && saved && pageUrl && (
        <div className="kid-card-mint flex flex-wrap gap-3 text-sm">
          <Link href={pageUrl} target="_blank" className="text-brand font-bold">
            🌐 打开网页
          </Link>
          <Link href="/student/projects" className="text-emerald-600 font-bold">
            💻 我的网页
          </Link>
          <Link href="/student/assets" className="text-violet-600 font-bold">
            📦 素材库
          </Link>
        </div>
      )}

      {html && <AiWarning extra="可以继续叠加更多交互；若某条不对，可「清空重来」或改改填空再添加。" />}
    </div>
  );
}
