'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AiProgress } from '@/components/course/ai-progress';
import { ChoiceQuestionGroup } from '@/components/course/choice-question';
import {
  CHALLENGE_QUESTIONS,
  DEFAULT_FORM,
  INTERACTION_QUESTIONS,
  LAYOUT_QUESTIONS,
  LEVEL_QUESTIONS,
  MEMORY_MATCH_SUBTITLE,
  MEMORY_MATCH_TITLE,
  SCENE_QUESTIONS,
  buildMemoryMatchPrompt,
  loadMemoryMatchState,
  mergeWebHtml,
  persistMemoryMatch,
  type MemoryMatchForm,
} from './memory-match-shared';

export function MemoryMatchGame() {
  const router = useRouter();
  const [form, setForm] = useState<MemoryMatchForm>(DEFAULT_FORM);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof MemoryMatchForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    loadMemoryMatchState()
      .then((state) => {
        setForm(state.form);
        setProjectId(state.projectId);
        setAssetId(state.assetId);
        setSlug(state.slug);
        setHasSaved(state.hasSaved);
      })
      .catch(() => {});
  }, []);

  const pageUrl = slug ? `/p/${slug}` : null;

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const prompt = buildMemoryMatchPrompt(form);
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      const merged = mergeWebHtml(r.data);

      const result = await persistMemoryMatch({
        htmlContent: merged,
        form,
        projectId,
        assetId,
      });
      setProjectId(result.projectId);
      setSlug(result.slug);
      setAssetId(result.assetId);
      setHasSaved(true);

      router.push('/student/course/g/memory-match/studio');
    } catch (e: unknown) {
      setError((e as Error)?.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-mint space-y-1">
        <div className="text-lg font-extrabold text-ink">🕵️ {MEMORY_MATCH_TITLE}</div>
        <p className="text-sm font-bold text-brand-dark">{MEMORY_MATCH_SUBTITLE}</p>
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          做选择题说清楚<b>场景</b>、<b>布局</b>、<b>交互</b>三件事，AI 会做出<b>见习侦探 → 线索侦探 → 王牌侦探</b>三关翻牌游戏，按<b>翻牌次数</b>和<b>用时</b>生成「侦探记忆力排行榜」。每一关的<b>卡片数量</b>、<b>翻牌次数限制</b>、<b>时间限制</b>都可以自己设定。选项里没有你想要的？点<b>「➕ 自己写一个」</b>就能自己新增。点击生成后会进入<b>独立预览页</b>，可以在旁边的输入框里继续告诉 AI 怎么改。
        </p>
      </div>

      {hasSaved && (
        <div className="kid-card-mint space-y-2">
          <div className="font-extrabold text-emerald-800">✅ 你已有「{MEMORY_MATCH_TITLE}」</div>
          <p className="text-sm text-ink-soft">可以继续修改，或重新选择下方问题生成新版本。</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/student/course/g/memory-match/studio" className="kid-button-primary !py-2 !px-4 text-sm">
              🔄 进入预览与修改页
            </Link>
            {pageUrl && (
              <Link href={pageUrl} target="_blank" className="kid-button-ghost !py-2 !px-4 text-sm">
                🌐 打开游戏网页
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="kid-card-orange space-y-4">
        <div className="text-sm font-bold">📍 第一步 · 选场景（选择题）</div>
        {SCENE_QUESTIONS.map((q) => (
          <ChoiceQuestionGroup
            key={q.key}
            spec={q}
            value={form[q.key as keyof MemoryMatchForm]}
            onChange={(v) => setField(q.key as keyof MemoryMatchForm, v)}
          />
        ))}
      </div>

      <div className="kid-card-yellow space-y-4">
        <div className="text-sm font-bold">🧱 第二步 · 选布局（选择题）</div>
        {LAYOUT_QUESTIONS.map((q) => (
          <ChoiceQuestionGroup
            key={q.key}
            spec={q}
            value={form[q.key as keyof MemoryMatchForm]}
            onChange={(v) => setField(q.key as keyof MemoryMatchForm, v)}
          />
        ))}
      </div>

      <div className="kid-card-sky space-y-4">
        <div className="text-sm font-bold">👆 第三步 · 选交互（选择题）</div>
        {INTERACTION_QUESTIONS.map((q) => (
          <ChoiceQuestionGroup
            key={q.key}
            spec={q}
            value={form[q.key as keyof MemoryMatchForm]}
            onChange={(v) => setField(q.key as keyof MemoryMatchForm, v)}
          />
        ))}
      </div>

      <div className="kid-card-purple space-y-4">
        <div className="text-sm font-bold">⚙️ 第四步 · 自己设定关卡难度（选择题）</div>
        <p className="text-xs font-semibold text-ink-soft">
          每一关的<b>卡片数量</b>都能自己选，还能设定<b>翻牌次数限制</b>和<b>时间限制</b>让挑战更刺激（不选就是不限制）。
        </p>
        {LEVEL_QUESTIONS.map((q) => (
          <ChoiceQuestionGroup
            key={q.key}
            spec={q}
            value={form[q.key as keyof MemoryMatchForm]}
            onChange={(v) => setField(q.key as keyof MemoryMatchForm, v)}
          />
        ))}
        {CHALLENGE_QUESTIONS.map((q) => (
          <ChoiceQuestionGroup
            key={q.key}
            spec={q}
            value={form[q.key as keyof MemoryMatchForm]}
            onChange={(v) => setField(q.key as keyof MemoryMatchForm, v)}
          />
        ))}
      </div>

      <div className="kid-card space-y-3">
        <button onClick={generate} disabled={busy} className="kid-button-primary w-full">
          {busy ? '🕵️ AI 正在制作三关侦探翻牌游戏…' : `🚀 生成${MEMORY_MATCH_TITLE}`}
        </button>
        {busy && <AiProgress label="AI 正在按你的选择制作见习/线索/王牌侦探三关翻牌游戏…" />}
        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
        )}
      </div>
    </div>
  );
}
