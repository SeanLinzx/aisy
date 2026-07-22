'use client';

import { useLanguage } from '@/contexts/language-context';

import { useState } from 'react';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { MultiLineField } from '@/components/course/multi-line-field';
import { reportGrowth } from '@/lib/growth-report';
import {
  STORY_FILL_STORAGE_KEY,
  buildStoryPrompt,
  defaultStoryScenes,
  emptyStoryScene,
  type StorySceneForm,
} from '@/lib/story-course';
import type { DirectorEmbedProps } from '@/lib/director-pipeline';
import { saveDirectorScript } from '@/lib/director-pipeline';

function SceneCard({
  scene,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  scene: StorySceneForm;
  index: number;
  onChange: (patch: Partial<StorySceneForm>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { tx } = useLanguage();
  const field = (key: keyof StorySceneForm, label: string, placeholder: string, minHeight = 72) => (
    <MultiLineField
      label={tx(label)}
      value={scene[key] as string}
      onChange={(value) => onChange({ [key]: value })}
      placeholder={tx(placeholder)}
      minHeight={minHeight}
    />
  );

  return (
    <div className="kid-card-sky space-y-3 w-full min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-extrabold">{tx('📖 场景 ')}{index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-xs font-bold text-rose-500 shrink-0">
            {tx('删除场景')}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {field('time', '⏰ 时间', '例如：一个下雨的午后')}
        {field('place', '📍 地点', '例如：图书馆的阁楼')}
        {field('characters', '👥 人物', '例如：小红和图书管理员猫', 80)}
        {field('opening', '🌱 事件·开头', '这一场景怎么开始？', 88)}
        {field('climax', '⚡ 事件·高潮', '最紧张或最精彩的一刻', 88)}
        {field('ending', '🌈 事件·结尾', '这一场景怎么结束？', 88)}
      </div>
    </div>
  );
}

export function StoryFillGame({ embedded, stepTitle, onNextStep }: DirectorEmbedProps = {}) {
  const { tx } = useLanguage();
  const [title, setTitle] = useState('我的 AI 童话故事');
  const [scenes, setScenes] = useState<StorySceneForm[]>(defaultStoryScenes());
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateScene(id: string, patch: Partial<StorySceneForm>) {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function generateStory() {
    const filled = scenes.some(
      (s) => s.time || s.place || s.characters || s.opening || s.climax || s.ending,
    );
    if (!filled) {
      setError('请至少填写一个场景的信息。');
      return;
    }
    setLoading(true);
    setError(null);
    setStory('');
    setSaved(false);
    try {
      const prompt = buildStoryPrompt(scenes, title);
      const r = await api.post('/ai-generate/text', {
        prompt,
        title: title || '填空编故事',
        saveAsAsset: true,
      });
      const text = (r.data?.text || '').trim();
      setStory(text);
      try {
        saveDirectorScript({ title, scenes, story: text });
        localStorage.setItem(
          STORY_FILL_STORAGE_KEY,
          JSON.stringify({ title, scenes, story: text, savedAt: Date.now() }),
        );
      } catch {
        /* ignore */
      }
      setSaved(!!r.data?.asset);
      reportGrowth({
        kind: 'creation',
        gameSlug: 'story-fill',
        title: `📝 填空编故事：${title || '我的 AI 童话故事'}`,
        summary: text,
      });
    } catch (e: any) {
      setError(e?.message || '生成故事失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-3">
      {embedded && stepTitle && (
        <div className="text-sm font-extrabold text-sky-700">{stepTitle}</div>
      )}
      <div className="kid-card-yellow">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          ✍️ 像填故事卡片一样，为每个场景写好<strong>{tx('时间、地点、人物')}</strong>{tx('和')}<strong>{tx('事件（开头 → 高潮 → 结尾）')}</strong>，AI 会帮你串成一篇完整童话！每个输入框都支持换行，长文字会自动撑高显示。
        </p>
      </div>

      <div
        className={
          embedded
            ? 'flex flex-col gap-4 w-full'
            : 'grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-4 items-start w-full'
        }
      >
        <div className="min-w-0 space-y-3 order-1">
          <div className="kid-card space-y-3">
            <MultiLineField
              label={tx('故事标题')}
              labelClassName="text-sm font-bold"
              value={title}
              onChange={setTitle}
              placeholder={tx('给你的故事起个名字…')}
              minHeight={56}
            />
          </div>

          <div className="space-y-3">
            {scenes.map((scene, i) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                index={i}
                onChange={(patch) => updateScene(scene.id, patch)}
                onRemove={() => setScenes((prev) => prev.filter((s) => s.id !== scene.id))}
                canRemove={scenes.length > 1}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScenes((prev) => [...prev, emptyStoryScene()])}
              className="kid-button-ghost text-sm"
            >
              ➕ 再加一个场景
            </button>
            <button onClick={() => void generateStory()} disabled={loading} className="kid-button-primary">
              {loading ? 'AI 正在编故事…' : '✨ 生成完整故事'}
            </button>
          </div>
        </div>

        <div
          className={
            embedded
              ? 'min-w-0 space-y-3 order-2'
              : 'min-w-0 space-y-3 min-[900px]:sticky min-[900px]:top-4 min-[900px]:self-start order-2'
          }
        >
          {loading && <AiProgress label={tx('AI 正在把场景卡片连成故事…')} />}
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{tx(error)}</div>
          )}

          {story ? (
            <div className="kid-card-mint space-y-3">
              <h3 className="font-extrabold text-lg">{tx('📜 你的完整故事')}</h3>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-ink">{story}</div>
              {saved && <p className="text-xs font-bold text-emerald-700">{tx('✅ 已保存到素材库')}</p>}
              {!embedded && (
                <p className="text-xs text-ink-soft">{tx('下一步可以去玩「绘本生成」，把故事变成连环画哦！')}</p>
              )}
              {embedded && onNextStep && story && (
                <button type="button" onClick={onNextStep} className="kid-button-primary text-sm">
                  {tx('下一步 → 分镜创作')}
                </button>
              )}
              <AiWarning />
            </div>
          ) : !loading && !error ? (
            <div className="kid-card border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center min-h-[180px] px-4 py-8 w-full">
              <span className="text-4xl mb-2">📖</span>
              <p className="text-sm font-bold text-ink-soft">{tx(embedded ? '在上方填好场景卡片' : '在左侧填好场景卡片')}</p>
              <p className="text-xs text-ink-soft mt-1">{tx('点击「生成完整故事」，童话会出现在这里')}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
