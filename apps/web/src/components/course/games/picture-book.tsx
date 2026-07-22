'use client';

import { useLanguage } from '@/contexts/language-context';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { MultiLineField } from '@/components/course/multi-line-field';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';
import {
  STORY_FILL_STORAGE_KEY,
  buildPictureBookPrompt,
  splitStoryIntoPages,
  type PictureBookStyle,
  type StorySceneForm,
} from '@/lib/story-course';
import type { DirectorEmbedProps } from '@/lib/director-pipeline';
import {
  loadDirectorScript,
  markPictureBookImportPending,
  saveDirectorStoryboard,
  savePictureBookForFrameVideo,
} from '@/lib/director-pipeline';

interface BookScene {
  id: string;
  caption: string;
  imageUrl?: string;
  status: 'idle' | 'generating' | 'done' | 'failed';
  error?: string;
}

function defaultStyle(): PictureBookStyle {
  return {
    artStyle: '温暖柔和的水彩儿童绘本',
    character: '穿红色连帽衫的小女孩，黑色短发，大眼睛',
    background: '童话世界，色彩明亮，线条简洁',
  };
}

export function PictureBookGame({ embedded, stepTitle, onNextStep }: DirectorEmbedProps = {}) {
  const { tx } = useLanguage();
  const router = useRouter();
  const report = useReportGameProgress('picture-book');
  const [title, setTitle] = useState('我的 AI 绘本');
  const [style, setStyle] = useState<PictureBookStyle>(defaultStyle());
  const [scenes, setScenes] = useState<BookScene[]>([
    { id: 'p1', caption: '', status: 'idle' },
    { id: 'p2', caption: '', status: 'idle' },
    { id: 'p3', caption: '', status: 'idle' },
  ]);
  const [busy, setBusy] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasImported, setHasImported] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  function buildStoryboardPayload() {
    return {
      title,
      style,
      scenes: scenes.map((s) => ({ id: s.id, caption: s.caption, imageUrl: s.imageUrl })),
    };
  }

  function importToFrameVideo(goNext?: boolean) {
    const result = savePictureBookForFrameVideo(buildStoryboardPayload());
    if (!result.ok) {
      setError(result.reason);
      setImportMsg(null);
      return false;
    }
    setError(null);
    setImportMsg(
      `✅ 已导入 ${result.input.pageCount} 页插图，可生成 ${result.input.descs.length} 段首尾帧过渡视频`,
    );
    if (goNext && onNextStep) {
      onNextStep();
      return true;
    }
    if (!embedded) {
      markPictureBookImportPending();
      router.push('/student/course/g/video-studio?mode=keyframe');
    }
    return true;
  }

  useEffect(() => {
    if (embedded) {
      const script = loadDirectorScript();
      if (script?.story?.trim()) {
        setTitle(script.title || '我的 AI 绘本');
        const pages = splitStoryIntoPages(script.story, 3);
        setScenes(pages.map((caption, i) => ({ id: `p${i + 1}`, caption, status: 'idle' as const })));
        setHasImported(true);
        return;
      }
    }
    try {
      const raw = localStorage.getItem(STORY_FILL_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        title?: string;
        scenes?: StorySceneForm[];
        story?: string;
      };
      if (data.title) setTitle(`${data.title} · 绘本`);
    } catch {
      /* ignore */
    }
  }, [embedded]);

  function importFromStoryFill() {
    try {
      const raw = localStorage.getItem(STORY_FILL_STORAGE_KEY);
      if (!raw) {
        setError('还没有编好的故事，请先完成「填空编故事」游戏。');
        return;
      }
      const data = JSON.parse(raw) as { title?: string; scenes?: StorySceneForm[]; story?: string };
      const storyText = data.story?.trim();
      if (!storyText) {
        setError('请先在「填空编故事」中点击「生成完整故事」后再导入。');
        return;
      }

      const sceneCount = data.scenes?.length ?? 0;
      const pageCount = sceneCount > 0 ? sceneCount : Math.max(1, storyText.split(/\n+/).filter(Boolean).length);
      const captions = splitStoryIntoPages(storyText, pageCount);

      setScenes(
        captions.map((caption, i) => ({
          id: `p${i + 1}`,
          caption,
          status: 'idle' as const,
        })),
      );
      if (data.title) setTitle(`${data.title} · 绘本`);
      setHasImported(true);
      setError(null);
    } catch {
      setError('读取故事失败，请手动填写每页画面。');
    }
  }

  function updateCaption(id: string, caption: string) {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, caption } : s)));
  }

  function addScene() {
    setScenes((prev) => [...prev, { id: `p${Date.now()}`, caption: '', status: 'idle' }]);
  }

  async function generateOne(sceneId: string, refUrl?: string) {
    const scene = scenes.find((s) => s.id === sceneId);
    if (!scene?.caption.trim()) {
      setError('请先填写这一页的画面描述。');
      return;
    }
    const idx = scenes.findIndex((s) => s.id === sceneId);
    setGeneratingId(sceneId);
    setError(null);
    setScenes((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, status: 'generating', error: undefined } : s)),
    );
    void report({ status: 'generating', prompt: scene.caption, summary: `正在画第 ${idx + 1} 页` });

    try {
      const prompt = buildPictureBookPrompt(style, scene.caption.trim(), idx, scenes.length);
      const refs = refUrl ? [{ type: 'image', url: refUrl }] : undefined;
      const r = await api.post('/ai-generate/image', {
        prompt,
        saveAsAsset: true,
        title: `${title}·第${idx + 1}页`,
        references: refs,
        options: { size: '1K', n: 1 },
      });
      const url = r.data.imageUrls?.[0];
      if (!url) throw new Error('没有拿到图片');

      setScenes((prev) => {
        const next = prev.map((s) =>
          s.id === sceneId ? { ...s, imageUrl: url, status: 'done' as const } : s,
        );
        const done = next.filter((s) => s.status === 'done').length;
        void report({
          status: done === next.length ? 'done' : 'generating',
          prompt: scene.caption,
          imageUrls: next.filter((s) => s.imageUrl).map((s) => s.imageUrl!),
          thumbnailUrl: url,
          summary: `已完成 ${done}/${next.length} 页绘本`,
          items: next.map((s, i) => ({
            url: s.imageUrl,
            label: `第 ${i + 1} 页`,
            prompt: s.caption,
            status: s.status,
          })),
        });
        return next;
      });
      return url;
    } catch (e: any) {
      const msg = e?.message || '生成失败';
      setScenes((prev) =>
        prev.map((s) => (s.id === sceneId ? { ...s, status: 'failed', error: msg } : s)),
      );
      void report({ status: 'failed', error: msg });
      setError(msg);
      return undefined;
    } finally {
      setGeneratingId(null);
    }
  }

  async function generateAll() {
    if (scenes.some((s) => !s.caption.trim())) {
      setError('请为每一页填写画面描述后再生成。');
      return;
    }
    setBusy(true);
    setError(null);
    void report({ status: 'generating', summary: '开始生成绘本…' });

    let refUrl: string | undefined;
    for (const scene of scenes) {
      const url = await generateOne(scene.id, refUrl);
      if (url) refUrl = url;
      else break;
    }
    setBusy(false);
  }

  const doneCount = scenes.filter((s) => s.status === 'done').length;

  return (
    <div className="w-full space-y-3">
      {embedded && stepTitle && (
        <div className="text-sm font-extrabold text-sky-700">{stepTitle}</div>
      )}
      <div className="kid-card-yellow !py-2.5 !px-3">
        <p className="text-xs font-semibold text-ink-soft leading-relaxed">
          📚 为每一页写好画面，AI 按<strong>{tx('统一画风')}</strong>生成插图；从第二页起参考第一页保持角色一致。
        </p>
      </div>

      <div className="kid-card !p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <label className="text-sm font-bold">{tx('绘本标题')}</label>
          <button type="button" onClick={importFromStoryFill} className="kid-button-sm bg-violet-50 border-violet-200 text-violet-700 text-xs">
            📥 导入完整故事
          </button>
        </div>
        <MultiLineField
          label={tx('绘本标题')}
          labelClassName="text-sm font-bold"
          value={title}
          onChange={setTitle}
          minHeight={56}
        />
        {hasImported && <p className="text-[11px] text-emerald-700 font-bold">{tx('✅ 已从上一关导入完整故事文本')}</p>}
      </div>

      <div className="kid-card-purple !p-3">
        <button
          type="button"
          onClick={() => setShowStyle((v) => !v)}
          className="w-full flex items-center justify-between text-sm font-bold"
        >
          <span>{tx('🎨 全书统一风格')}</span>
          <span className="text-xs text-ink-soft">{showStyle ? '收起 ▲' : '展开 ▼'}</span>
        </button>
        {showStyle && (
          <div className="space-y-3 mt-2">
            <MultiLineField
              label={tx('画风')}
              value={style.artStyle}
              onChange={(value) => setStyle((s) => ({ ...s, artStyle: value }))}
              minHeight={64}
            />
            <MultiLineField
              label={tx('主角外貌')}
              value={style.character}
              onChange={(value) => setStyle((s) => ({ ...s, character: value }))}
              minHeight={64}
            />
            <MultiLineField
              label={tx('背景风格')}
              value={style.background}
              onChange={(value) => setStyle((s) => ({ ...s, background: value }))}
              minHeight={64}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {scenes.map((scene, i) => (
          <div key={scene.id} className="kid-card !p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-sm">📄 第 {i + 1} 页</span>
              <button
                type="button"
                disabled={!!generatingId || busy}
                onClick={() => void generateOne(scene.id, scenes[0]?.imageUrl)}
                className="kid-button-sm bg-white border-2 border-orange-200 text-xs shrink-0"
              >
                {generatingId === scene.id ? '生成中…' : '只生成本页'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 items-start">
              <textarea
                className="kid-textarea !min-h-[120px] text-sm leading-relaxed w-full resize-y"
                value={scene.caption}
                onChange={(e) => updateCaption(scene.id, e.target.value)}
                placeholder={tx('这一页画面里发生了什么？支持换行，长描述会自动撑高。')}
                rows={4}
              />
              <div className="min-h-[120px]">
                {scene.status === 'generating' && (
                  <div className="h-full min-h-[96px] rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 animate-pulse">
                    AI 正在画这一页…
                  </div>
                )}
                {scene.imageUrl && scene.status === 'done' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveUploadPath(scene.imageUrl)}
                    alt={`第 ${i + 1} 页`}
                    className="w-full h-full min-h-[96px] max-h-56 object-contain rounded-xl border-2 border-orange-100 bg-white"
                  />
                )}
                {scene.status === 'failed' && (
                  <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-2 py-2">{scene.error || '生成失败'}</p>
                )}
                {scene.status === 'idle' && !scene.imageUrl && (
                  <div className="h-full min-h-[96px] rounded-xl border-2 border-dashed border-orange-100 bg-orange-50/40 flex items-center justify-center text-[11px] text-ink-soft">
                    生成后插图会显示在这里
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={addScene} className="kid-button-ghost text-sm">
          ➕ 再加一页
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center sticky bottom-3 z-10 bg-[#fff8f0]/90 backdrop-blur-sm rounded-2xl p-2 border border-orange-100 shadow-sm">
        <button onClick={() => void generateAll()} disabled={busy || !!generatingId} className="kid-button-primary !py-2 text-sm">
          {busy ? `逐页生成中 (${doneCount}/${scenes.length})…` : '📚 一键生成整本绘本'}
        </button>
        {doneCount >= 2 && (
          <button
            type="button"
            onClick={() => importToFrameVideo(embedded && !!onNextStep)}
            className="kid-button-mint !py-2 text-sm"
          >
            {embedded && onNextStep ? '🎬 导入并进入视频创作' : '🎬 一键导入到首尾帧生视频'}
          </button>
        )}
        {!embedded && (
          <Link href="/student/course/g/story-fill" className="kid-button-ghost text-sm">
            ← 回去编故事
          </Link>
        )}
        {embedded && onNextStep && doneCount > 0 && doneCount < 2 && (
          <button
            type="button"
            onClick={() => {
              saveDirectorStoryboard(buildStoryboardPayload());
              onNextStep();
            }}
            className="kid-button-ghost text-sm"
          >
            {tx('先进入视频页（需至少 2 页图才能导入）')}
          </button>
        )}
      </div>

      {importMsg && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 font-semibold">
          {tx(importMsg)}
        </div>
      )}

      {(busy || generatingId) && <AiProgress label={tx('AI 正在按统一画风绘制绘本…')} />}
      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{tx(error)}</div>
      )}

      {doneCount > 0 && (
        <div className="kid-card-mint !p-3">
          <h3 className="font-extrabold text-sm mb-2">📖 绘本预览（{doneCount}/{scenes.length} 页）</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {scenes
              .filter((s) => s.imageUrl)
              .map((s, i) => (
                <div key={s.id} className="space-y-1">
                  <div className="text-[11px] font-bold text-ink-soft">第 {i + 1} 页</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveUploadPath(s.imageUrl!)} alt="" className="w-full max-h-40 object-contain rounded-lg border border-orange-100 bg-white" />
                  <p className="text-[11px] text-ink-soft whitespace-pre-wrap break-words">{s.caption}</p>
                </div>
              ))}
          </div>
          <div className="mt-3">
            <AiWarning />
          </div>
        </div>
      )}
    </div>
  );
}
