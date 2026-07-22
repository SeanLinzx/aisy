'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { useLanguage } from '@/contexts/language-context';
import { api } from '@/lib/api';
import { buildPitchPrompt, prdToMarkdown } from '@/lib/pm-prompts';
import {
  buildPitchAssetTitle,
  hasPitchContent,
  loadPmAppForPitch,
  loadPmPitch,
  loadPmRequirements,
  pitchSectionsToMarkdown,
  savePmPitch,
  type PitchSectionKey,
  type PmCreatorEmbedProps,
} from '@/lib/pm-pipeline';
import { buildPmAppSummary } from './pm-mini-app-shared';
import { reportGrowth } from '@/lib/growth-report';
import { persistPmTextAsset } from '@/lib/persist-pm-text-asset';
import { persistPmApplicationBundle } from '@/lib/pm-applications';

const SECTIONS: { key: PitchSectionKey; title: string; emoji: string }[] = [
  { key: 'background', title: '背景（场景）', emoji: '🌍' },
  { key: 'goal', title: '目标', emoji: '🎯' },
  { key: 'method', title: '方法', emoji: '🛠️' },
  { key: 'effect', title: '应用效果', emoji: '✨' },
  { key: 'outlook', title: '展望', emoji: '🚀' },
];

function parsePitchSections(markdown: string): Record<PitchSectionKey, string> {
  const result: Record<PitchSectionKey, string> = {
    background: '',
    goal: '',
    method: '',
    effect: '',
    outlook: '',
  };
  const map: Record<string, PitchSectionKey> = {
    '背景（场景）': 'background',
    '背景': 'background',
    '目标': 'goal',
    '方法': 'method',
    '应用效果': 'effect',
    '展望': 'outlook',
  };
  const parts = markdown.split(/^##\s+/m).filter(Boolean);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const title = nl >= 0 ? part.slice(0, nl).trim() : part.trim();
    const body = nl >= 0 ? part.slice(nl + 1).trim() : '';
    for (const [label, key] of Object.entries(map)) {
      if (title.includes(label)) result[key] = body;
    }
  }
  if (!result.background && !result.goal) {
    result.background = markdown;
  }
  return result;
}

export function PmPitchGame({ embedded }: PmCreatorEmbedProps = {}) {
  const { tx } = useLanguage();
  const [hasPrd, setHasPrd] = useState(false);
  const [hasApp, setHasApp] = useState(false);
  const [sections, setSections] = useState<Record<PitchSectionKey, string>>({
    background: '',
    goal: '',
    method: '',
    effect: '',
    outlook: '',
  });
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingApp, setSavingApp] = useState(false);
  const [saved, setSaved] = useState(false);
  const [appSaved, setAppSaved] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prdText, setPrdText] = useState('');
  const [appSummary, setAppSummary] = useState('');
  const [flowSummary, setFlowSummary] = useState('');

  const [appKind, setAppKind] = useState<'workflow' | 'single' | null>(null);
  const skipAutoSaveRef = useRef(true);

  const persistPitchAsset = useCallback(
    async (opts?: { silent?: boolean; sectionsOverride?: Record<PitchSectionKey, string> }) => {
      const nextSections = opts?.sectionsOverride ?? sections;
      if (!hasPitchContent(nextSections)) {
        if (!opts?.silent) setError('请先填写或生成路演内容，再保存。');
        return null;
      }
      if (!opts?.silent) {
        setSaving(true);
        setError(null);
      }
      try {
        const title = buildPitchAssetTitle();
        const summary = nextSections.goal?.trim().slice(0, 40) || nextSections.background?.trim().slice(0, 40) || '路演框架';
        const nextAssetId = await persistPmTextAsset({
          assetId,
          title,
          summary,
          content: pitchSectionsToMarkdown(nextSections),
          meta: {
            kind: 'pm-pitch',
            sourceGame: 'pm-pitch',
            sections: nextSections,
          },
        });
        savePmPitch({ sections: nextSections, assetId: nextAssetId });
        setAssetId(nextAssetId);
        setSaved(true);
        if (!opts?.silent) {
          void reportGrowth({
            kind: 'creation',
            gameSlug: 'pm-pitch',
            title,
            summary,
            detail: { sections: nextSections },
          });
        }
        return nextAssetId;
      } catch (e: unknown) {
        if (!opts?.silent) setError((e as Error)?.message || '保存失败');
        return null;
      } finally {
        if (!opts?.silent) setSaving(false);
      }
    },
    [assetId, sections],
  );

  useEffect(() => {
    const pitch = loadPmPitch();
    if (pitch) {
      setSections(pitch.sections);
      setAssetId(pitch.assetId ?? null);
    }
    const prd = loadPmRequirements();
    if (prd) {
      setHasPrd(true);
      setPrdText(prdToMarkdown(prd.prd));
    }
    const app = loadPmAppForPitch();
    if (app) {
      setHasApp(true);
      setAppSummary(buildPmAppSummary(app.form));
      setFlowSummary(app.aiSummary);
      setAppKind(app.kind);
    }
    skipAutoSaveRef.current = false;
  }, []);

  useEffect(() => {
    if (skipAutoSaveRef.current || !hasPitchContent(sections)) return;
    const timer = window.setTimeout(() => {
      void persistPitchAsset({ silent: true });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [sections, persistPitchAsset]);

  function importPrd() {
    const prd = loadPmRequirements();
    if (!prd) {
      setError(embedded ? '还没有需求说明书，请先完成第 1 步并保存。' : '还没有需求说明书，请先完成第 1 个游戏。');
      return;
    }
    setPrdText(prdToMarkdown(prd.prd));
    setHasPrd(true);
    setError(null);
  }

  function importApp() {
    const app = loadPmAppForPitch();
    if (!app) {
      setError(embedded ? '还没有小应用，请先完成第 2 步并生成。' : '还没有小应用，请先完成「单 AI 小应用」或「AI 工作流小应用」。');
      return;
    }
    setAppSummary(buildPmAppSummary(app.form));
    setFlowSummary(app.aiSummary);
    setAppKind(app.kind);
    setHasApp(true);
    setError(null);
  }

  async function generate() {
    const prd = loadPmRequirements();
    const app = loadPmAppForPitch();
    const nextPrdText = prd ? prdToMarkdown(prd.prd) : prdText;
    const nextAppSummary = app ? buildPmAppSummary(app.form) : appSummary;
    const nextFlowSummary = app ? app.aiSummary : flowSummary;

    if (prd) {
      setPrdText(nextPrdText);
      setHasPrd(true);
    }
    if (app) {
      setAppSummary(nextAppSummary);
      setFlowSummary(nextFlowSummary);
      setAppKind(app.kind);
      setHasApp(true);
    }
    if (!prd && !app && !prdText && !appSummary) {
      setError('请至少导入需求说明书或小应用之一。');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const prompt = buildPitchPrompt({
        prdText: nextPrdText || '（未导入）',
        appSummary: nextAppSummary || '（未导入）',
        aiFlowSummary: nextFlowSummary || '（无 AI 流程）',
      });
      const r = await api.post('/ai-generate/text', { prompt, saveAsAsset: false });
      const parsed = parsePitchSections(r.data.text as string);
      setSections(parsed);
      setSaved(false);
      await persistPitchAsset({ silent: true, sectionsOverride: parsed });
    } catch (e: unknown) {
      setError((e as Error)?.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    await persistPitchAsset();
  }

  async function handleSaveCompleteApp() {
    setSavingApp(true);
    setError(null);
    try {
      await persistPitchAsset({ silent: true });
      await persistPmApplicationBundle({ requireComplete: true });
      setAppSaved(true);
      void reportGrowth({
        kind: 'creation',
        gameSlug: 'pm-creator',
        title: buildPitchAssetTitle().replace(' · 路演材料', ''),
        summary: sections.goal?.trim().slice(0, 40) || '完整 AI 应用',
        detail: { sections },
      });
    } catch (e: unknown) {
      setError((e as Error)?.message || '保存完整应用失败');
    } finally {
      setSavingApp(false);
    }
  }

  function setSection(key: PitchSectionKey, value: string) {
    setSections((s) => ({ ...s, [key]: value }));
    setSaved(false);
    setAppSaved(false);
  }

  const canSave = hasPitchContent(sections);

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="kid-card-yellow">
          <div className="font-extrabold text-lg">🎤 {tx('AI 小应用路演材料准备')}</div>
          <p className="text-sm text-ink-soft mt-1">
            导入需求说明书和小应用，生成「背景、目标、方法、应用效果、展望」五段路演框架。保存后会写入素材库「文字」分类。
          </p>
        </div>
      )}

      {embedded && (
        <div className="kid-card-purple !py-3 !px-4">
          <p className="text-sm text-ink-soft">
            已自动读取本机保存的需求说明书和小应用。生成或编辑后会自动保存到素材库「文字」分类。
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={`kid-button-ghost !py-2 !px-4 text-sm ${hasPrd ? '!border-emerald-400' : ''}`} onClick={importPrd}>
          {hasPrd ? '✅' : '📥'} 导入需求说明书
        </button>
        <button type="button" className={`kid-button-ghost !py-2 !px-4 text-sm ${hasApp ? '!border-emerald-400' : ''}`} onClick={importApp}>
          {hasApp ? '✅' : '📥'} 导入小应用
          {hasApp && appKind && (
            <span className="ml-1 text-[10px] opacity-80">({appKind === 'workflow' ? '工作流' : '单 AI'})</span>
          )}
        </button>
        <button type="button" className="kid-button-primary !py-2 !px-4 text-sm" onClick={generate} disabled={busy}>
          ✨ {embedded ? 'AI 转译路演框架' : 'AI 生成路演框架'}
        </button>
        {embedded && (
          <span className="text-xs text-ink-soft self-center">
            会读取最新需求说明书与小应用，转译成五个维度；改完小应用后可再次点击更新
          </span>
        )}
      </div>

      <AiWarning />
      {busy && <AiProgress label="AI 正在撰写路演材料…" />}
      {error && <p className="text-sm font-bold text-rose-600">{error}</p>}

      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <div key={s.key} className="kid-card space-y-2">
            <label className="font-extrabold text-sm">
              {s.emoji} {s.title}
            </label>
            <textarea
              className="kid-textarea !min-h-[88px] text-sm w-full"
              value={sections[s.key]}
              onChange={(e) => setSection(s.key, e.target.value)}
              placeholder={`在这里写「${s.title}」…`}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="kid-button-primary !py-2 !px-5"
        onClick={handleSave}
        disabled={saving || savingApp || !canSave}
      >
        {saving ? tx('保存中…') : tx('💾 保存路演材料到素材库')}
      </button>
      <p className="text-[11px] text-ink-soft">
        保存为<strong>文字素材</strong>，可在「我的素材库 → 📝 文字」中查看，标签显示为「路演材料」。
      </p>
      {saved && (
        <p className="text-xs font-bold text-emerald-600">
          ✅ {tx('已保存到「我的素材库 · 文字」！')}
          <Link href="/student/assets" className="underline ml-1">
            {tx('去素材库查看 →')}
          </Link>
        </p>
      )}

      <div className="rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 space-y-3">
        <div className="font-extrabold text-violet-800">{tx('🎉 完成三步，保存完整 AI 应用')}</div>
        <p className="text-sm text-ink-soft leading-relaxed">
          {tx('把需求说明书、小应用、路演材料打包成一个作品，出现在「我的 AI 应用」里。你可以做很多个不同的 AI 产品！')}
        </p>
        <button
          type="button"
          className="kid-button-primary !py-2.5 !px-6 !bg-violet-600 hover:!bg-violet-700"
          onClick={handleSaveCompleteApp}
          disabled={savingApp || saving || !canSave}
        >
          {savingApp ? tx('保存中…') : tx('💼 保存完整 AI 应用')}
        </button>
        {appSaved && (
          <p className="text-xs font-bold text-emerald-600">
            ✅ {tx('已保存到你的 AI 应用库！')}
            <Link href="/student/pm-applications" className="underline ml-1">
              {tx('去我的 AI 应用 →')}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
