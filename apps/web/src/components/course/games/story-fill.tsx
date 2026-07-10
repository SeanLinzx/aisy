'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { AiProgress } from '@/components/course/ai-progress';
import { reportGrowth } from '@/lib/growth-report';
import {
  STORY_FILL_STORAGE_KEY,
  buildStoryPrompt,
  defaultStoryScenes,
  emptyStoryScene,
  type StorySceneForm,
} from '@/lib/story-course';

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
  const field = (key: keyof StorySceneForm, label: string, placeholder: string) => (
    <div>
      <label className="text-xs font-bold text-ink-soft">{label}</label>
      <input
        className="kid-input mt-1 text-sm"
        value={scene[key] as string}
        onChange={(e) => onChange({ [key]: e.target.value })}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="kid-card-sky space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-extrabold">📖 场景 {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-xs font-bold text-rose-500">
            删除场景
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {field('time', '⏰ 时间', '例如：一个下雨的午后')}
        {field('place', '📍 地点', '例如：图书馆的阁楼')}
        {field('characters', '👥 人物', '例如：小红和图书管理员猫')}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {field('opening', '🌱 事件·开头', '这一场景怎么开始？')}
        {field('climax', '⚡ 事件·高潮', '最紧张或最精彩的一刻')}
        {field('ending', '🌈 事件·结尾', '这一场景怎么结束？')}
      </div>
    </div>
  );
}

export function StoryFillGame() {
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
    <div className="space-y-5">
      <div className="kid-card-yellow">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          ✍️ 像填故事卡片一样，为每个场景写好<strong>时间、地点、人物</strong>和<strong>事件（开头 → 高潮 → 结尾）</strong>，AI 会帮你串成一篇完整童话！
        </p>
      </div>

      <div className="kid-card space-y-3">
        <div>
          <label className="text-sm font-bold">故事标题</label>
          <input className="kid-input mt-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
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
        <button
          type="button"
          onClick={() => setScenes((prev) => [...prev, emptyStoryScene()])}
          className="kid-button-ghost text-sm"
        >
          ➕ 再加一个场景
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => void generateStory()} disabled={loading} className="kid-button-primary">
          {loading ? 'AI 正在编故事…' : '✨ 生成完整故事'}
        </button>
        <VoiceInputButton onResult={(t) => updateScene(scenes[0]?.id, { opening: t })} />
      </div>

      {loading && <AiProgress label="AI 正在把场景卡片连成故事…" />}
      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
      )}

      {story && (
        <div className="kid-card-mint space-y-3">
          <h3 className="font-extrabold text-lg">📜 你的完整故事</h3>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-ink">{story}</div>
          {saved && <p className="text-xs font-bold text-emerald-700">✅ 已保存到素材库</p>}
          <p className="text-xs text-ink-soft">下一步可以去玩「绘本生成」，把故事变成连环画哦！</p>
          <AiWarning />
        </div>
      )}
    </div>
  );
}
