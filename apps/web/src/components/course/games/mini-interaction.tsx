'use client';

import { useLanguage } from '@/contexts/language-context';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AI_GENERATE_WEB_PROGRESS_ESTIMATE, AI_GENERATE_WEB_PROGRESS_MS, AI_GENERATE_WEB_TIMEOUT_MS } from '@/lib/ai-generate-timeouts';
import { persistWebAsset, webAssetHref } from '@/lib/persist-web-asset';
import { splitInlineWebParts, mergeWebHtml } from '@/lib/merge-web-html';
import { AiWarning } from '@/components/ai-warning';
import { HtmlPreview, type PickedElement } from '@/components/course/html-preview';
import { AiProgress } from '@/components/course/ai-progress';
import { StackedInteractionsPanel } from '@/components/web/stacked-interactions-panel';
import { PublishedPageLink } from '@/components/published-page-link';
import { WebVersionTree } from '@/components/course/web-version-tree';
import { loadWebProjectHead } from '@/lib/web-project-head';
import { versionHtml, type WebProjectVersionRow } from '@/lib/web-project-versions';
import { renderFilledSentence, type FillBlankSpec } from '@/components/course/fill-blank-sentence';
import {
  INTERACTION_TEMPLATES,
  TRIGGER_OPTIONS,
  buildInteractionPrompt,
  interactionRuleSentence,
  type InteractionLayerSpec,
  type TriggerOption,
} from './mini-interaction-templates';

const RULE_SEGMENTS = ['当我对页面上的「', '」进行「', '」时，页面会「', '」。'];
const ADD_CUSTOM_TARGET = '__add_custom_target__';

function OptionChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`kid-button-sm border-2 text-left ${
        selected
          ? 'bg-brand text-white border-brand'
          : 'bg-white text-ink-soft border-orange-200 hover:border-orange-300'
      }`}
    >
      {selected && '✓ '}
      {children}
    </button>
  );
}

function parseMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try {
    return JSON.parse(raw as string);
  } catch {
    return {};
  }
}

function layerFromValues(values: Record<string, string>): InteractionLayerSpec | null {
  const target = values.target?.trim();
  const trigger = values.trigger?.trim() as TriggerOption;
  const result = values.result?.trim();
  if (!target || !trigger || !result) return null;
  if (!TRIGGER_OPTIONS.includes(trigger)) return null;
  return { target, trigger, result };
}

function layersFromVersionNotes(notes?: string | null): InteractionLayerSpec[] | null {
  if (!notes?.trim()) return null;
  try {
    const data = JSON.parse(notes) as { layers?: InteractionLayerSpec[] };
    return Array.isArray(data.layers) ? data.layers : null;
  } catch {
    return null;
  }
}

function encodeVersionNotes(layers: InteractionLayerSpec[], summary: string): string {
  return JSON.stringify({
    kind: 'mini-interaction',
    summary: summary.slice(0, 80),
    layers,
  });
}

export function MiniInteractionGame() {
  const { tx } = useLanguage();
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
  const [customTargets, setCustomTargets] = useState<string[]>([]);
  const [pickMode, setPickMode] = useState(false);
  const [addingTarget, setAddingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState('');
  const [headVersionId, setHeadVersionId] = useState<string | null>(null);
  const [versions, setVersions] = useState<WebProjectVersionRow[]>([]);

  const template = INTERACTION_TEMPLATES.find((t) => t.id === templateId) ?? INTERACTION_TEMPLATES[0];
  const targetOptions = useMemo(
    () => [...template.clickTargets, ...customTargets],
    [template.clickTargets, customTargets],
  );

  // 进入页面时恢复上次已保存的交互页面
  useEffect(() => {
    api
      .get('/assets')
      .then(async (r) => {
        const all = r.data || [];
        const asset = all.find((a: { meta?: unknown }) => {
          const m = parseMeta(a.meta);
          return m.kind === 'interaction' && m.sourceGame === 'mini-interaction';
        });
        if (!asset) return;
        const meta = parseMeta(asset.meta);
        if (typeof meta.templateId === 'string') setTemplateId(meta.templateId);
        if (Array.isArray(meta.layers)) setLayers(meta.layers as InteractionLayerSpec[]);
        let restoredHtml = asset.content || '';
        const projectId = typeof meta.projectId === 'string' ? meta.projectId : null;
        // asset.content 历史数据可能只存了 html 片段，丢了 css/js；优先从项目版本记录里重新合并一份完整的。
        if (projectId) {
          try {
            const projectRes = await api.get(`/web-projects/${projectId}`);
            const latest = projectRes.data?.versions?.[0];
            if (latest?.html) restoredHtml = mergeWebHtml({ html: latest.html, css: latest.css, js: latest.js });
          } catch {
            // 拉取失败时，回退用 asset.content
          }
        }
        if (restoredHtml) setHtml(restoredHtml);
        setProjectId(projectId);
        setAssetId(typeof asset.id === 'string' ? asset.id : null);
        if (asset.url) setPageUrl(webAssetHref(asset) || asset.url);
        setSaved(!!restoredHtml);
        if (projectId) {
          void loadWebProjectHead(projectId).then((head) => {
            if (!head) return;
            setVersions(head.versions);
            setHeadVersionId(head.headVersionId);
          });
        }
      })
      .catch(() => {});
  }, []);

  const ruleBlanks: FillBlankSpec[] = useMemo(
    () => [
      {
        key: 'target',
        placeholder: '点哪里',
        input: 'select',
        quickOptions: [...template.clickTargets, ...customTargets],
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
    [template, customTargets],
  );

  const currentRule = useMemo(
    () => renderFilledSentence(RULE_SEGMENTS, ruleBlanks, form),
    [form, ruleBlanks],
  );

  function confirmCustomTarget() {
    const text = targetDraft.trim();
    setAddingTarget(false);
    setTargetDraft('');
    if (!text) return;
    setCustomTargets((prev) => (prev.includes(text) ? prev : [...prev, text]));
    setField('target', text);
  }

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
    setCustomTargets([]);
    setPickMode(false);
    setAddingTarget(false);
    setTargetDraft('');
    resetForm(t);
  }

  function handlePick(el: PickedElement) {
    setCustomTargets((prev) => (prev.includes(el.hint) ? prev : [...prev, el.hint]));
    setField('target', el.hint);
    setPickMode(false);
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
      parentVersionId: headVersionId,
      versionNotes: encodeVersionNotes(nextLayers, summary),
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
    if (persisted.versionId) {
      setHeadVersionId(persisted.versionId);
      const head = await loadWebProjectHead(persisted.projectId);
      if (head) {
        setVersions(head.versions);
        setHeadVersionId(head.headVersionId);
      }
    }
    setSaved(true);
  }

  function selectVersion(id: string) {
    const v = versions.find((x) => x.id === id);
    if (!v) return;
    setHeadVersionId(id);
    setHtml(versionHtml(v));
    const restoredLayers = layersFromVersionNotes(v.notes);
    if (restoredLayers) setLayers(restoredLayers);
    setError(null);
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
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: AI_GENERATE_WEB_TIMEOUT_MS });
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
          👆 先选一张静态页面，分三行填好：<b>{tx('点哪里')}</b> → <b>{tx('什么操作')}</b> → <b>{tx('会出现什么效果')}</b>{tx('。第三行可以自由写想法，也可以点快捷选项。可以')}<b>{tx('一条一条叠加')}</b>——例如先让小猫跳起来，再让小草摇摆！
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

      <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-4 items-start">
        <div className="kid-card space-y-2 lg:min-h-[640px]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm font-bold">
              {isInteractivePreview ? '🎉 当前页面（已加交互）' : '📄 无交互页面（先看一看）'}
            </div>
            <div className="flex items-center gap-2">
              <span className="tag text-[10px]">{isInteractivePreview ? `${layers.length} 条交互` : '静态预览'}</span>
              <button
                type="button"
                onClick={() => setPickMode((v) => !v)}
                className={`kid-button-sm border-2 ${pickMode ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-ink-soft border-violet-200'}`}
              >
                🎯 点选目标
              </button>
            </div>
          </div>
          <p className="text-xs text-ink-soft">{template.desc}</p>
          <HtmlPreview
            key={pickMode ? 'pick' : 'view'}
            html={previewHtml}
            height={560}
            interactive={isInteractivePreview}
            pickMode={pickMode}
            onPick={pickMode ? handlePick : undefined}
          />
          <p className="text-xs text-center text-ink-soft">
            {pickMode
              ? '↑ 点一下页面里的区域，就会自动填到右边「点哪里」这一格'
              : isInteractivePreview
                ? '↑ 可以直接点点看已有交互'
                : '↑ 右侧填好规则后，让 AI 把交互加上去；也可以点上面「🎯 点选目标」直接在页面里选'}
          </p>
        </div>

        <div className="kid-card space-y-3">
          <div className="text-sm font-bold">✏️ 给「{template.emoji} {template.title}」{layers.length > 0 ? '再加一条' : '加上'}交互</div>

          {/* 第一行：选择目标 */}
          <div className="rounded-xl bg-orange-50/80 border-2 border-orange-100 p-3 space-y-2">
            <div className="text-xs font-bold text-orange-800">{tx('① 点哪里')}</div>
            {addingTarget ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      confirmCustomTarget();
                    } else if (e.key === 'Escape') {
                      setAddingTarget(false);
                      setTargetDraft('');
                    }
                  }}
                  placeholder={tx('写下你想点的区域')}
                  className="kid-input flex-1 min-w-[160px] !py-2 text-sm"
                />
                <button type="button" onClick={confirmCustomTarget} className="kid-button-sm bg-brand text-white border-brand">
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingTarget(false);
                    setTargetDraft('');
                  }}
                  className="kid-button-sm bg-white text-ink-soft border-orange-200"
                >
                  ✕
                </button>
              </div>
            ) : (
              <select
                className="kid-input w-full !py-2 text-sm font-bold"
                value={form.target || ''}
                onChange={(e) => {
                  if (e.target.value === ADD_CUSTOM_TARGET) {
                    setAddingTarget(true);
                    setTargetDraft('');
                  } else {
                    setField('target', e.target.value);
                  }
                }}
              >
                <option value="">{tx('选择页面上的区域…')}</option>
                {targetOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value={ADD_CUSTOM_TARGET}>{tx('➕ 自己写一个…')}</option>
              </select>
            )}
            <div className="flex flex-wrap gap-1.5">
              {targetOptions.map((opt) => (
                <OptionChip key={opt} selected={form.target === opt} onClick={() => setField('target', opt)}>
                  {opt}
                </OptionChip>
              ))}
            </div>
            <p className="text-[11px] text-ink-soft">{tx('也可以点左边「🎯 点选目标」，直接在预览里选区域')}</p>
          </div>

          {/* 第二行：选择动作 */}
          <div className="rounded-xl bg-sky-50/80 border-2 border-sky-100 p-3 space-y-2">
            <div className="text-xs font-bold text-sky-800">{tx('② 什么操作')}</div>
            <select
              className="kid-input w-full !py-2 text-sm font-bold"
              value={form.trigger || ''}
              onChange={(e) => setField('trigger', e.target.value)}
            >
              <option value="">{tx('选择鼠标操作…')}</option>
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5">
              {TRIGGER_OPTIONS.map((opt) => (
                <OptionChip key={opt} selected={form.trigger === opt} onClick={() => setField('trigger', opt)}>
                  {opt}
                </OptionChip>
              ))}
            </div>
          </div>

          {/* 第三行：说明规则（自由输入） */}
          <div className="rounded-xl bg-violet-50/80 border-2 border-violet-100 p-3 space-y-2">
            <div className="text-xs font-bold text-violet-800">{tx('③ 会出现什么效果')}</div>
            <textarea
              className="kid-textarea !min-h-[88px] w-full text-sm leading-relaxed"
              value={form.result || ''}
              onChange={(e) => setField('result', e.target.value)}
              placeholder={tx('在这里自由写下你想要的效果，比如：小猫会跳起来并发出喵喵声，旁边弹出爱心…')}
            />
            <div className="flex flex-wrap gap-1.5">
              {template.resultOptions.map((opt) => (
                <OptionChip key={opt} selected={form.result === opt} onClick={() => setField('result', opt)}>
                  {opt}
                </OptionChip>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-violet-100/60 border-2 border-violet-200 px-3 py-3">
            <div className="text-xs font-bold text-violet-700 mb-1.5">{tx('🧩 这条规则')}</div>
            <p className="text-sm text-violet-900 leading-relaxed break-words whitespace-normal">{currentRule}</p>
          </div>

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

          {busy && (
            <AiProgress
              label={layers.length > 0 ? 'AI 正在叠加新交互，请稍等…' : 'AI 正在把交互加到页面上…'}
              estimate={AI_GENERATE_WEB_PROGRESS_ESTIMATE}
              durationMs={AI_GENERATE_WEB_PROGRESS_MS}
            />
          )}
          {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{tx(error)}</div>
          )}

          <StackedInteractionsPanel layers={layers} compact />

          {versions.length > 0 && (
            <WebVersionTree
              embedded
              versions={versions}
              currentId={headVersionId}
              onSelect={selectVersion}
              projectId={projectId}
              onVersionsChange={setVersions}
            />
          )}
        </div>
      </div>

      {html && saved && pageUrl && (
        <div className="kid-card-mint flex flex-wrap gap-3 text-sm">
          <PublishedPageLink href={pageUrl} className="text-brand font-bold">
            🌐 {tx('打开网页')}
          </PublishedPageLink>
          <Link href="/student/projects" className="text-emerald-600 font-bold">
            💻 我的网页
          </Link>
          <Link href="/student/assets" className="text-violet-600 font-bold">
            📦 素材库
          </Link>
        </div>
      )}

      {html && <AiWarning extra={tx('可以继续叠加更多交互；若某条不对，可「清空重来」或改改填空再添加。')} />}
    </div>
  );
}
