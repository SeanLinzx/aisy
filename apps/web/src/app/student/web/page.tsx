'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AI_GENERATE_WEB_PROGRESS_ESTIMATE, AI_GENERATE_WEB_PROGRESS_MS } from '@/lib/ai-generate-timeouts';
import { useLanguage } from '@/contexts/language-context';
import { assetDisplayType } from '@/lib/asset-tabs';
import { fetchAssetsList } from '@/lib/assets-cache';
import { webAssetHref, webLinkSnippet } from '@/lib/persist-web-asset';
import { publishPath } from '@/lib/public-url';
import { AiWarning } from '@/components/ai-warning';
import { PromptTemplates } from '@/components/prompt-templates';
import { AiProgress } from '@/components/course/ai-progress';
import { ExploreToolHeader } from '@/components/explore-tool-header';
import { LayoutBoard } from '@/components/web/layout-board';
import { WebInteractionBuilder, type InteractionFormState } from '@/components/web/web-interaction-builder';
import { StackedInteractionsPanel } from '@/components/web/stacked-interactions-panel';
import { HtmlPreview, type PickedElement } from '@/components/course/html-preview';
import { generateWebWithQueue } from '@/lib/ai-generate-queue';
import { runWebStudioIteration } from '@/lib/run-web-iteration';
import { resolveIterationBaseHtml } from '@/lib/web-iteration-base';
import { mergeWebHtml, splitInlineWebParts } from '@/lib/merge-web-html';
import { loadWebProjectHead } from '@/lib/web-project-head';
import { WebVersionTree } from '@/components/course/web-version-tree';
import { versionHtml, type WebProjectVersionRow } from '@/lib/web-project-versions';
import { loadWebProjectLocal, saveWebProjectLocal } from '@/lib/web-project-local-draft';
import { KidLocalDraftHint } from '@/components/course/kid-local-draft-hint';
import { formatKidLocalDraftHint, readKidLocalDraft } from '@/lib/kid-app-local-draft';
import { webProjectLocalKey } from '@/lib/web-project-local-draft';
import { webStudioHref } from '@/lib/web-studio-nav';
import {
  TRIGGER_OPTIONS,
  buildWebWorkbenchInteractionPrompt,
  type InteractionLayerSpec,
  type TriggerOption,
} from '@/lib/web-interaction-prompt';

type Module = 'scene' | 'layout' | 'interaction';

const MODULES: Array<{ key: Module; label: string; emoji: string; hint: string }> = [
  { key: 'scene', label: '场景', emoji: '🎬', hint: '想清楚网页要讲什么故事、展示什么内容' },
  { key: 'layout', label: '布局', emoji: '🧩', hint: '调整页面结构、排版和颜色样式' },
  { key: 'interaction', label: '交互', emoji: '👆', hint: '点选页面上的区域，说明交互规则，让 AI 把点击效果加到网页里；也可在左侧插入素材' },
];

interface Project {
  id: string;
  title: string;
  status: string;
  slug?: string | null;
  versions: Array<{ id: string; version: number; html: string; css?: string; js?: string; prompt?: string }>;
}

interface Asset {
  id: string;
  type: string;
  title: string;
  url?: string;
  content?: string;
  meta?: unknown;
}

const SCAFFOLDS: Array<{ key: string; label: string; emoji: string; prompt: string; html: string }> = [
  {
    key: 'showcase',
    label: '我的 AI 学习成果展',
    emoji: '🌟',
    prompt: '帮我做一个展示我 AI 学习成果的儿童网页，标题加 emoji，介绍 + 3 个作品卡片。',
    html: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>我的成果展</title><style>body{margin:0;font-family:system-ui;background:linear-gradient(135deg,#fef3c7,#bae6fd);min-height:100vh;padding:32px;}h1{color:#ea580c;text-align:center;}main{max-width:760px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:24px;}.card{background:white;padding:16px;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,0.06);text-align:center}</style></head><body><h1>🌟 我的 AI 学习成果展</h1><main><div class="card"><div style="font-size:32px">📝</div><h3>AI 文字</h3><p>我用 AI 写了一段自我介绍</p></div><div class="card"><div style="font-size:32px">🎨</div><h3>AI 图画</h3><p>我用 AI 画了梦中的小狗</p></div><div class="card"><div style="font-size:32px">🌐</div><h3>AI 网页</h3><p>这就是我做的网页！</p></div></main></body></html>`,
  },
  {
    key: 'photo-story',
    label: '我的图片故事页',
    emoji: '📸',
    prompt: '帮我做一个图文故事网页，4 张图片配 4 段文字。',
    html: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>图片故事</title><style>body{margin:0;font-family:system-ui;background:#fff7ed;padding:24px;}article{max-width:640px;margin:0 auto;}article h1{color:#c2410c;text-align:center;}figure{background:white;padding:12px;border-radius:16px;margin:16px 0;box-shadow:0 8px 20px rgba(0,0,0,0.05)}img{width:100%;border-radius:12px;}figcaption{margin-top:8px;color:#475569;}</style></head><body><article><h1>📸 我的图片故事</h1><figure><img src="https://picsum.photos/seed/p1/600/360"><figcaption>第一张：早晨的太阳</figcaption></figure><figure><img src="https://picsum.photos/seed/p2/600/360"><figcaption>第二张：路上的小花</figcaption></figure></article></body></html>`,
  },
  {
    key: 'video-show',
    label: '我的视频展示页',
    emoji: '🎬',
    prompt: '帮我做一个视频展示网页，要带一个介绍标题、一段介绍文字，还有一个视频占位。',
    html: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>视频展示</title><style>body{margin:0;font-family:system-ui;background:#0f172a;color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}main{max-width:640px;text-align:center}h1{color:#facc15}video{width:100%;border-radius:16px;background:black}</style></head><body><main><h1>🎬 我的暑假视频</h1><p>这是我用 AI 生成的暑假回忆视频</p><video controls poster="https://picsum.photos/seed/v1/640/360"><source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4"></video></main></body></html>`,
  },
  {
    key: 'self-intro',
    label: '自我介绍页',
    emoji: '🙋',
    prompt: '帮我做一个个人介绍网页：头像、名字、爱好、想说的一段话。',
    html: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>自我介绍</title><style>body{margin:0;font-family:system-ui;background:linear-gradient(135deg,#dbeafe,#fce7f3);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}main{background:white;padding:32px;border-radius:24px;max-width:480px;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.08)}img{width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid white;box-shadow:0 8px 16px rgba(0,0,0,0.1)}h1{color:#7c3aed;margin:16px 0 4px}.tags{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:12px 0}.tags span{background:#ede9fe;color:#6d28d9;padding:4px 10px;border-radius:999px;font-size:12px}</style></head><body><main><img src="https://picsum.photos/seed/avatar/240/240"><h1>你好，我是小爱</h1><div class="tags"><span>🎨 画画</span><span>🐱 小动物</span><span>🤖 AI</span></div><p>我希望长大成为一名发明家！</p></main></body></html>`,
  },
  {
    key: 'group-work',
    label: '小组作品页',
    emoji: '👯',
    prompt: '帮我做一个小组作品展示页，包括小组成员、合作目标和作品列表。',
    html: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>小组作品</title><style>body{margin:0;font-family:system-ui;background:#ecfeff;padding:24px}main{max-width:720px;margin:0 auto}h1{color:#0e7490;text-align:center}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px}.card{background:white;padding:16px;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,0.05)}</style></head><body><main><h1>👯 红色小组的作品</h1><p>我们的目标：用 AI 做一份「夏天」主题创意展。</p><div class="grid"><div class="card">🌞 夏日插画</div><div class="card">🍉 西瓜诗歌</div><div class="card">🌊 海浪音效</div><div class="card">🎬 暑假短视频</div></div></main></body></html>`,
  },
];

export default function WebStudio() {
  const { tx } = useLanguage();
  return (
    <Suspense fallback={<div className="text-slate-500">{tx('加载中…')}</div>}>
      <WebStudioInner />
    </Suspense>
  );
}

function WebStudioInner() {
  const { tx, locale } = useLanguage();
  const router = useRouter();
  const search = useSearchParams();
  const initialId = search.get('id') || '';

  const [module, setModule] = useState<Module>('scene');
  const [projectId, setProjectId] = useState<string>(initialId);
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('我的网页');
  const [prompt, setPrompt] = useState('');
  const [html, setHtml] = useState<string>('');
  const [css, setCss] = useState<string>('');
  const [js, setJs] = useState<string>('');
  const [busy, setBusy] = useState<'gen' | 'save' | 'publish' | 'interaction' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [autoPreview, setAutoPreview] = useState(true);
  const [interactionLayers, setInteractionLayers] = useState<InteractionLayerSpec[]>([]);
  const [interactionForm, setInteractionForm] = useState<InteractionFormState>({
    target: '',
    trigger: '单击',
    result: '',
  });
  const [customTargets, setCustomTargets] = useState<string[]>([]);
  const [pickMode, setPickMode] = useState(false);
  const [addingTarget, setAddingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [headVersionId, setHeadVersionId] = useState<string | null>(null);
  const [versions, setVersions] = useState<WebProjectVersionRow[]>([]);

  // Live preview source
  const previewDoc = useMemo(() => buildPreviewDoc(html, css, js, tx('在「场景」里描述或生成内容，预览会出现在这里')), [html, css, js, tx]);

  // Load project if id provided
  useEffect(() => {
    if (!projectId) return;
    loadWebProjectHead(projectId)
      .then((headState) => {
        if (!headState) return;
        setProject({
          id: projectId,
          title: headState.title,
          status: 'draft',
          slug: headState.slug,
          versions: headState.versions as Project['versions'],
        });
        setTitle(headState.title);
        setVersions(headState.versions);
        setHeadVersionId(headState.headVersionId);
        const local = loadWebProjectLocal(projectId);
        const localEnv = readKidLocalDraft(webProjectLocalKey(projectId));
        const hasServer = !!headState.headHtml.trim();
        const useLocal = local && localEnv && (!hasServer || local.html.trim());
        if (useLocal && local) {
          setHtml(local.html || '');
          setCss(local.css || '');
          setJs(local.js || '');
          setPrompt(local.prompt || '');
          setTitle(local.title || headState.title);
          if (localEnv.savedAt) setDraftHint(formatKidLocalDraftHint(localEnv.savedAt));
        } else if (headState.headHtml) {
          const parts = splitInlineWebParts(headState.headHtml);
          setHtml(parts.html);
          setCss(parts.css);
          setJs(parts.js);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setHydrated(true));
  }, [projectId]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      saveWebProjectLocal(projectId, { title, prompt, html, css, js });
      setDraftHint(formatKidLocalDraftHint(Date.now()));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [hydrated, projectId, title, prompt, html, css, js]);

  // Load assets list once
  useEffect(() => { void fetchAssetsList().then((rows) => setAssets(rows || [])).catch(() => {}); }, []);

  async function generate() {
    if (!prompt.trim()) { setError(tx('先写下你想要的网页内容')); return; }
    setBusy('gen'); setError(null);
    try {
      const r = await generateWebWithQueue({ prompt });
      setHtml(r.html || '');
      setCss(r.css || '');
      setJs(r.js || '');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function saveDraft() {
    setBusy('save'); setError(null);
    try {
      if (!projectId) {
        const r = await api.post('/web-projects', { title, html, css, js, prompt });
        setProject(r.data);
        setProjectId(r.data.id);
        router.replace(`/student/web?id=${r.data.id}`);
      } else {
        await api.post(`/web-projects/${projectId}/versions`, {
          html,
          css,
          js,
          prompt,
          notes: tx('编辑保存'),
          parentVersionId: headVersionId ?? undefined,
        });
        const headState = await loadWebProjectHead(projectId);
        if (headState) {
          setVersions(headState.versions);
          setHeadVersionId(headState.headVersionId);
        }
      }
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function publish() {
    if (!projectId) await saveDraft();
    if (!projectId) return;
    setBusy('publish'); setError(null);
    try {
      const r = await api.post(`/web-projects/${projectId}/publish`);
      setProject((p) => p ? ({ ...p, status: r.data.status, slug: r.data.slug }) : p);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  function setInteractionField(key: keyof InteractionFormState, value: string) {
    setInteractionForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function confirmCustomTarget() {
    const text = targetDraft.trim();
    setAddingTarget(false);
    setTargetDraft('');
    if (!text) return;
    setCustomTargets((prev) => (prev.includes(text) ? prev : [...prev, text]));
    setInteractionField('target', text);
  }

  function handlePickTarget(el: PickedElement) {
    setCustomTargets((prev) => (prev.includes(el.hint) ? prev : [...prev, el.hint]));
    setInteractionField('target', el.hint);
    setPickMode(false);
  }

  function validateInteractionLayer(): InteractionLayerSpec | null {
    const target = interactionForm.target.trim();
    const trigger = interactionForm.trigger.trim() as TriggerOption;
    const result = interactionForm.result.trim();
    if (!target || !trigger || !result) {
      setError(tx('请选好「点哪里」「什么操作」，并填写会出现什么效果。'));
      return null;
    }
    if (!TRIGGER_OPTIONS.includes(trigger)) {
      setError(tx('请选择有效的鼠标操作。'));
      return null;
    }
    if (!html.trim()) {
      setError(tx('请先在「场景」或「布局」里准备好页面内容。'));
      return null;
    }
    return { target, trigger, result };
  }

  async function addInteraction() {
    const layer = validateInteractionLayer();
    if (!layer) return;

    setBusy('interaction');
    setError(null);
    try {
      const previewHtml = mergeWebHtml({ html, css, js });
      const { html: baseHtml } = await resolveIterationBaseHtml({
        projectId: projectId || undefined,
        activeVersionId: headVersionId,
        versions,
        htmlState: previewHtml,
      });
      const shell = baseHtml.trim() || previewHtml;
      const promptText = buildWebWorkbenchInteractionPrompt({
        pageTitle: title,
        baseHtml: shell,
        newLayer: layer,
        existingLayers: interactionLayers,
      });
      const merged = await runWebStudioIteration({
        prompt: promptText,
        baseHtml: shell,
        instruction: `添加交互：${layer.target} ${layer.trigger} ${layer.result}`,
      });
      const parts = splitInlineWebParts(merged);

      setHtml(parts.html);
      setCss(parts.css);
      setJs(parts.js);
      setInteractionLayers((prev) => [...prev, layer]);
      setPreviewKey((k) => k + 1);
      setPickMode(false);

      const nextTarget = customTargets.find((t) => t !== layer.target) || '';
      setInteractionForm({
        target: nextTarget,
        trigger: layer.trigger,
        result: '',
      });

      if (projectId) {
        const vr = await api.post(`/web-projects/${projectId}/versions`, {
          html: parts.html,
          css: parts.css,
          js: parts.js,
          prompt: promptText,
          notes: `添加交互：${layer.target}`,
          parentVersionId: headVersionId ?? undefined,
        });
        if (vr.data?.id) setHeadVersionId(vr.data.id as string);
        const headState = await loadWebProjectHead(projectId);
        if (headState) {
          setVersions(headState.versions);
          setHeadVersionId(headState.headVersionId);
        }
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || tx('添加交互失败'));
    } finally {
      setBusy(null);
    }
  }

  function selectVersion(id: string) {
    const v = versions.find((x) => x.id === id);
    if (!v) return;
    setHeadVersionId(id);
    const parts = splitInlineWebParts(versionHtml(v));
    setHtml(parts.html);
    setCss(parts.css);
    setJs(parts.js);
    setPrompt(v.prompt || '');
    setPreviewKey((k) => k + 1);
  }

  function insertAsset(a: Asset) {
    if (a.type === 'web') {
      const href = webAssetHref(a);
      if (!href) return;
      setHtml((h) => insertBeforeBodyClose(h, webLinkSnippet(a.title, href)));
      return;
    }
    if (!a.url && a.type !== 'text') return;
    const snippet =
      a.type === 'image'
        ? `<img src="${a.url}" alt="${escapeAttr(a.title)}" style="max-width:100%;border-radius:12px;margin:8px 0" />`
        : a.type === 'video'
          ? `<video src="${a.url}" controls style="width:100%;border-radius:12px"></video>`
          : a.type === 'text'
            ? `<p>${escapeHtml(a.content || a.title)}</p>`
            : `<a href="${a.url}" target="_blank">${escapeHtml(a.title)}</a>`;
    setHtml((h) => insertBeforeBodyClose(h, snippet));
  }

  const webAssets = useMemo(
    () => assets.filter((a) => a.type === 'web' && webAssetHref(a)),
    [assets],
  );
  const otherAssets = useMemo(
    () => assets.filter((a) => a.type !== 'web'),
    [assets],
  );

  function applyScaffold(s: typeof SCAFFOLDS[number]) {
    setTitle(s.label);
    setPrompt(s.prompt);
    setHtml(s.html);
    setCss('');
    setJs('');
  }

  return (
    <div className="space-y-4">
      <ExploreToolHeader
        title={tx("🌐 网页工作台")}
        desc={tx("按「场景 → 布局 → 交互」三步完成：先描述想做什么网页，再调整样子，最后加入链接和互动，保存后一键发布。")}
        actions={
          <div className="flex items-center gap-2 text-xs">
            <input className="kid-input !py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tx("页面标题")} style={{ width: 220 }} />
            <button className="kid-button-ghost !py-2" onClick={saveDraft} disabled={busy === 'save'}>{busy === 'save' ? tx('保存中…') : tx('💾 保存版本')}</button>
            <button className="kid-button-primary !py-2" onClick={publish} disabled={busy === 'publish'}>{busy === 'publish' ? tx('发布中…') : tx('🚀 发布')}</button>
          </div>
        }
      />

      {project?.status === 'published' && project.slug && (
        <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-2 flex flex-wrap items-center gap-3">
          <span>{tx("✅ 已发布！访问地址：")}<a className="underline" target="_blank" rel="noopener noreferrer" href={publishPath(project.slug)}>{publishPath(project.slug)}</a></span>
          {html.trim() && projectId && (
            <Link href={webStudioHref(projectId, 'workbench')} className="kid-button-primary !py-1.5 !px-3 text-xs">
              💬 {tx('对话修改')}
            </Link>
          )}
        </div>
      )}
      {html.trim() && projectId && project?.status !== 'published' && (
        <div className="flex flex-wrap gap-2">
          <Link href={webStudioHref(projectId, 'workbench')} className="kid-button-primary !py-2 !px-4 text-sm">
            💬 {tx('进入对话修改')} →
          </Link>
        </div>
      )}
      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      <KidLocalDraftHint hint={draftHint} />

      <div className="flex flex-wrap gap-2 text-xs">
        {MODULES.map((m, i) => {
          const active = module === m.key;
          const done =
            (m.key === 'scene' && (prompt.trim() || html.trim())) ||
            (m.key === 'layout' && html.trim()) ||
            (m.key === 'interaction' && (interactionLayers.length > 0 || js.trim()));
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setModule(m.key)}
              className={`px-3 py-1.5 rounded-full font-bold border transition ${
                active
                  ? 'bg-brand text-white border-brand'
                  : done
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-500 border-orange-100 hover:bg-orange-50'
              }`}
            >
              {['①', '②', '③'][i]} {m.emoji} {tx(m.label)}
            </button>
          );
        })}
      </div>

      <div className="kid-card-sky !p-4 text-sm text-ink-soft font-semibold leading-relaxed">
        <span className="font-bold text-ink">{MODULES.find((m) => m.key === module)?.emoji} {tx(MODULES.find((m) => m.key === module)?.label || '')}：</span>
        {tx(MODULES.find((m) => m.key === module)?.hint || '')}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: module tools */}
        <aside className="col-span-12 lg:col-span-3 space-y-3">
          <div className="kid-card !p-3">
            <div className="grid grid-cols-3 gap-1 text-xs">
              {MODULES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setModule(m.key)}
                  className={`py-2 rounded-xl font-bold transition ${
                    module === m.key ? 'bg-brand text-white' : 'bg-orange-50 text-brand-dark hover:bg-orange-100'
                  }`}
                >
                  {m.emoji} {tx(m.label)}
                </button>
              ))}
            </div>
          </div>

          {module === 'scene' && (
            <div className="kid-card !p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-600 mb-1">{tx("🎯 场景模板（点一下就能开始）")}</div>
              {SCAFFOLDS.map((s) => (
                <button key={s.key} onClick={() => applyScaffold(s)} className="w-full text-left rounded-xl border border-orange-100 px-3 py-2 hover:bg-orange-50 text-sm">
                  <span className="mr-2">{s.emoji}</span>{tx(s.label)}
                </button>
              ))}
            </div>
          )}

          {module === 'layout' && (
            <div className="kid-card !p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-600">{tx("🧩 布局小贴士")}</div>
              <ul className="text-[11px] text-slate-500 space-y-1.5 leading-relaxed list-disc pl-4">
                <li>{tx("中间「AI 布局板」会自动识别标题、图片、段落等主要块")}</li>
                <li>{tx("拖拽卡片即可调整顺序，HTML 与右侧预览会一起更新")}</li>
                <li>{tx("也可以直接在 HTML / CSS 编辑器里精细修改样式")}</li>
              </ul>
            </div>
          )}

          {module === 'interaction' && (
            <div className="kid-card !p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-600">{tx("👆 交互小贴士")}</div>
              <ul className="text-[11px] text-slate-500 space-y-1.5 leading-relaxed list-disc pl-4">
                <li>{tx("右侧预览点「🎯 点选目标」，选中图片、标题等区域")}</li>
                <li>{tx("中间填写：点哪里 → 什么操作 → 出现什么效果")}</li>
                <li>{tx("可以一条一条叠加多条交互规则")}</li>
                <li>{tx("左侧仍可插入图片、视频、链接等素材")}</li>
              </ul>
            </div>
          )}

          {module === 'interaction' && (
            <div className="kid-card !p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">{tx("🔗 我的网页（插入跳转链接）")}</div>
              <div className="space-y-1.5 max-h-40 overflow-auto pr-1 mb-3">
                {webAssets.length === 0 && <div className="text-xs text-slate-400">{tx("还没有可链接的网页素材")}</div>}
                {webAssets.slice(0, 20).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => insertAsset(a)}
                    className="w-full text-left text-xs rounded-lg px-2 py-1.5 hover:bg-violet-50 flex items-center gap-2 border border-violet-100"
                  >
                    <span>👆</span>
                    <span className="truncate flex-1">{a.title}</span>
                    <span className="text-[10px] text-violet-500 shrink-0">{assetDisplayType(a, locale)}</span>
                  </button>
                ))}
              </div>
              <div className="text-xs font-semibold text-slate-600 mb-2">{tx("📦 其他素材（点击插入）")}</div>
              <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
                {otherAssets.length === 0 && <div className="text-xs text-slate-400">{tx("还没有素材")}</div>}
                {otherAssets.slice(0, 20).map((a) => (
                  <button key={a.id} onClick={() => insertAsset(a)} className="w-full text-left text-xs rounded-lg px-2 py-1 hover:bg-orange-50 flex items-center gap-2">
                    <span>{({ image: '🖼️', video: '🎬', text: '📝', poster: '🖼️', ppt: '📊', code: '💻', mixed: '🎁', audio: '🔊' } as Record<string, string>)[a.type] || '📁'}</span>
                    <span className="truncate flex-1">{a.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Middle: editor */}
        <section className="col-span-12 lg:col-span-5 space-y-3">
          {module === 'scene' && (
            <div className="kid-card !p-4 space-y-2">
              <div className="text-sm font-semibold">{tx("🎬 场景描述")}</div>
              <p className="text-xs text-slate-500">{tx("用一句话告诉 AI：这个网页是给谁看的、要展示什么内容。")}</p>
              <PromptTemplates category="web" onPick={(t) => setPrompt(t.prompt)} />
              <textarea
                className="kid-textarea"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={tx("例如：帮我做一个介绍小宠物兔子的网页，要有 3 张照片占位、1 段介绍文字")}
              />
              <button onClick={generate} disabled={busy === 'gen'} className="kid-button-primary w-full">
                {busy === 'gen' ? tx('生成中…') : tx('✨ 让 AI 生成网页')}
              </button>
              {busy === 'gen' && (
                <AiProgress label={tx("AI 正在根据场景生成网页…")} estimate={tx(AI_GENERATE_WEB_PROGRESS_ESTIMATE)} durationMs={AI_GENERATE_WEB_PROGRESS_MS} />
              )}
            </div>
          )}

          {(module === 'scene' || module === 'layout') && (
            <div className="kid-card !p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">{tx("📝 HTML · 页面结构")}</div>
              <textarea className="kid-textarea !min-h-[180px] font-mono text-xs" value={html} onChange={(e) => setHtml(e.target.value)} />
            </div>
          )}

          {module === 'layout' && html.trim() && (
            <LayoutBoard html={html} onHtmlChange={setHtml} />
          )}

          {module === 'layout' && (
            <div className="kid-card !p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">{tx("🎨 CSS · 颜色与排版")}</div>
              <textarea className="kid-textarea !min-h-[200px] font-mono text-xs" value={css} onChange={(e) => setCss(e.target.value)} />
            </div>
          )}

          {module === 'interaction' && (
            <>
              {!html.trim() ? (
                <div className="kid-card !p-4 text-sm text-ink-soft">
                  {tx("请先在「场景」生成网页，或在「布局」里准备好 HTML 内容，再来加交互。")}
                </div>
              ) : (
                <div className="kid-card !p-3">
                  <WebInteractionBuilder
                    form={interactionForm}
                    layers={interactionLayers}
                    customTargets={customTargets}
                    addingTarget={addingTarget}
                    targetDraft={targetDraft}
                    busy={busy === 'interaction'}
                    error={busy === 'interaction' ? null : error}
                    onFieldChange={setInteractionField}
                    onConfirmCustomTarget={confirmCustomTarget}
                    onStartAddTarget={() => {
                      setAddingTarget(true);
                      setTargetDraft('');
                    }}
                    onCancelAddTarget={() => {
                      setAddingTarget(false);
                      setTargetDraft('');
                    }}
                    onTargetDraftChange={setTargetDraft}
                    onAddInteraction={addInteraction}
                  />
                </div>
              )}
              <details className="kid-card !p-3">
                <summary className="text-xs font-semibold text-slate-600 cursor-pointer">{tx("📝 高级 · 直接编辑 HTML / JS")}</summary>
                <div className="mt-3 space-y-3">
                  <textarea className="kid-textarea !min-h-[100px] font-mono text-xs" value={html} onChange={(e) => setHtml(e.target.value)} />
                  <textarea className="kid-textarea !min-h-[80px] font-mono text-xs" value={js} onChange={(e) => setJs(e.target.value)} placeholder={tx("JS（AI 加交互后会写在这里）")} />
                </div>
              </details>
            </>
          )}

          {module === 'layout' && (
            <button
              type="button"
              onClick={() => setModule('interaction')}
              className="kid-button-ghost text-sm w-full"
            >
              {tx("布局好了 → 去加交互 👆")}
            </button>
          )}

          {module === 'scene' && html.trim() && (
            <button
              type="button"
              onClick={() => setModule('layout')}
              className="kid-button-ghost text-sm w-full"
            >
              {tx("场景生成好了 → 去调布局 🧩")}
            </button>
          )}

          {versions.length > 0 && (
            <WebVersionTree
              versions={versions}
              currentId={headVersionId}
              onSelect={selectVersion}
              projectId={projectId}
              onVersionsChange={setVersions}
            />
          )}
        </section>

        {/* Right: preview */}
        <section className="col-span-12 lg:col-span-4">
          <div className="kid-card !p-3 sticky top-4">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <div className="text-sm font-semibold">
                {module === 'interaction' && html.trim() ? tx('🔍 预览 · 点选目标') : tx('🔍 实时预览')}
              </div>
              {module === 'interaction' && html.trim() ? (
                <div className="flex items-center gap-2">
                  <span className="tag text-[10px]">
                    {interactionLayers.length > 0 ? `${interactionLayers.length} ${tx('条交互')}` : tx('待加交互')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickMode((v) => !v)}
                    className={`kid-button-sm border-2 ${pickMode ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-ink-soft border-violet-200'}`}
                  >
                    {tx('🎯 点选目标')}
                  </button>
                </div>
              ) : (
                <label className="text-xs text-slate-500 flex items-center gap-1">
                  <input type="checkbox" checked={autoPreview} onChange={(e) => setAutoPreview(e.target.checked)} /> {tx('自动刷新')}
                </label>
              )}
            </div>
            {module === 'interaction' && html.trim() ? (
              <>
                <HtmlPreview
                  key={`${previewKey}-${pickMode ? 'pick' : 'view'}`}
                  html={html}
                  css={css}
                  js={js}
                  height={520}
                  interactive
                  pickMode={pickMode}
                  onPick={pickMode ? handlePickTarget : undefined}
                />
                <p className="text-xs text-center text-ink-soft mt-2">
                  {pickMode
                    ? tx('↑ 点一下页面里的区域，会自动填到左边「点哪里」')
                    : interactionLayers.length > 0
                      ? tx('↑ 可以试玩已有交互；想加新的就点「点选目标」')
                      : tx('↑ 点「点选目标」选中区域，再填写交互规则')}
                </p>
              </>
            ) : (
              <iframe
                key={autoPreview ? html + css + js : 'static'}
                sandbox="allow-scripts allow-same-origin"
                srcDoc={previewDoc}
                className="w-full h-[600px] rounded-2xl border border-orange-100 bg-white"
              />
            )}
            <div className="mt-3"><AiWarning extra={tx("发布前请先自己看一下网页内容是否合适。")} /></div>
            {busy === 'interaction' && (
              <div className="mt-2">
                <AiProgress label={tx('AI 正在把交互写入页面…')} estimate={tx(AI_GENERATE_WEB_PROGRESS_ESTIMATE)} durationMs={AI_GENERATE_WEB_PROGRESS_MS} />
              </div>
            )}
            {error && module === 'interaction' && busy !== 'interaction' && (
              <div className="mt-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
            )}
            {module === 'interaction' && html.trim() && interactionLayers.length > 0 && (
              <div className="mt-3">
                <StackedInteractionsPanel layers={interactionLayers} compact />
              </div>
            )}
            <div className="mt-3 flex gap-2 text-xs">
              <Link href="/student/projects" className="text-brand">{tx('← 返回我的网页')}</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function buildPreviewDoc(html: string, css?: string, js?: string, emptyPlaceholder = '在「场景」里描述或生成内容，预览会出现在这里'): string {
  const safeHtml = html || `<p style="font-family:system-ui;color:#9ca3af;text-align:center;margin-top:40%">${emptyPlaceholder}</p>`;
  // If user provided full HTML doc, inject css/js. Otherwise wrap.
  if (/<\/html>/i.test(safeHtml)) {
    let doc = safeHtml;
    if (css) doc = doc.replace(/<\/head>/i, `<style>${css}</style></head>`);
    if (js) doc = doc.replace(/<\/body>/i, `<script>${js}<\/script></body>`);
    return mergeWebHtml({ html: doc });
  }
  return mergeWebHtml({ html: safeHtml, css, js });
}

function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)); }
function escapeAttr(s: string) { return escapeHtml(s); }
function insertBeforeBodyClose(html: string, snippet: string): string {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${snippet}\n</body>`);
  return html + '\n' + snippet;
}
