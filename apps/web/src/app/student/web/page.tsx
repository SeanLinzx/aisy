'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { assetDisplayType } from '@/lib/asset-tabs';
import { webAssetHref, webLinkSnippet } from '@/lib/persist-web-asset';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { PromptTemplates } from '@/components/prompt-templates';
import { AiProgress } from '@/components/course/ai-progress';
import { ExploreToolHeader } from '@/components/explore-tool-header';

type Mode = 'template' | 'prompt' | 'code';

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
  return (
    <Suspense fallback={<div className="text-slate-500">加载中…</div>}>
      <WebStudioInner />
    </Suspense>
  );
}

function WebStudioInner() {
  const router = useRouter();
  const search = useSearchParams();
  const initialId = search.get('id') || '';

  const [mode, setMode] = useState<Mode>('prompt');
  const [projectId, setProjectId] = useState<string>(initialId);
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('我的网页');
  const [prompt, setPrompt] = useState('');
  const [html, setHtml] = useState<string>('');
  const [css, setCss] = useState<string>('');
  const [js, setJs] = useState<string>('');
  const [busy, setBusy] = useState<'gen' | 'save' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [autoPreview, setAutoPreview] = useState(true);

  // Live preview source
  const previewDoc = useMemo(() => buildPreviewDoc(html, css, js), [html, css, js]);

  // Load project if id provided
  useEffect(() => {
    if (!projectId) return;
    api.get(`/web-projects/${projectId}`).then(r => {
      const p: Project = r.data;
      setProject(p);
      setTitle(p.title);
      const v = p.versions[0];
      if (v) { setHtml(v.html || ''); setCss(v.css || ''); setJs(v.js || ''); setPrompt(v.prompt || ''); }
    }).catch((e) => setError(e.message));
  }, [projectId]);

  // Load assets list once
  useEffect(() => { api.get('/assets').then(r => setAssets(r.data || [])).catch(() => {}); }, []);

  async function generate() {
    if (!prompt.trim()) { setError('先写下你想要的网页内容'); return; }
    setBusy('gen'); setError(null);
    try {
      const r = await api.post('/ai-generate/web', { prompt }, { timeout: 180_000 });
      setHtml(r.data.html || '');
      setCss(r.data.css || '');
      setJs(r.data.js || '');
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
        await api.post(`/web-projects/${projectId}/versions`, { html, css, js, prompt, notes: '编辑保存' });
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
        title="🌐 网页工作台"
        desc="用提示词生成网页，可继续修改、保存版本、一键发布。"
        actions={
          <div className="flex items-center gap-2 text-xs">
            <input className="kid-input !py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="页面标题" style={{ width: 220 }} />
            <button className="kid-button-ghost !py-2" onClick={saveDraft} disabled={busy === 'save'}>{busy === 'save' ? '保存中…' : '💾 保存版本'}</button>
            <button className="kid-button-primary !py-2" onClick={publish} disabled={busy === 'publish'}>{busy === 'publish' ? '发布中…' : '🚀 发布'}</button>
          </div>
        }
      />

      {project?.status === 'published' && project.slug && (
        <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-2">
          ✅ 已发布！访问地址：<a className="underline" target="_blank" href={`/p/${project.slug}`}>/p/{project.slug}</a>
        </div>
      )}
      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}

      <div className="grid grid-cols-12 gap-4">
        {/* Left: mode tabs */}
        <aside className="col-span-12 lg:col-span-3 space-y-3">
          <div className="kid-card !p-3">
            <div className="grid grid-cols-3 gap-1 text-xs">
              {(['template', 'prompt', 'code'] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`py-2 rounded-xl ${mode === m ? 'bg-brand text-white' : 'bg-orange-50 text-brand-dark'}`}>
                  {m === 'template' ? '模板' : m === 'prompt' ? '提示词' : '代码'}
                </button>
              ))}
            </div>
          </div>

          {mode === 'template' && (
            <div className="kid-card !p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-600 mb-1">挑一个模板开始</div>
              {SCAFFOLDS.map((s) => (
                <button key={s.key} onClick={() => applyScaffold(s)} className="w-full text-left rounded-xl border border-orange-100 px-3 py-2 hover:bg-orange-50 text-sm">
                  <span className="mr-2">{s.emoji}</span>{s.label}
                </button>
              ))}
            </div>
          )}

          <div className="kid-card !p-3">
            <div className="text-xs font-semibold text-slate-600 mb-2">🔗 我的网页（插入跳转链接）</div>
            <div className="space-y-1.5 max-h-40 overflow-auto pr-1 mb-3">
              {webAssets.length === 0 && <div className="text-xs text-slate-400">还没有可链接的网页素材</div>}
              {webAssets.slice(0, 20).map((a) => (
                <button
                  key={a.id}
                  onClick={() => insertAsset(a)}
                  className="w-full text-left text-xs rounded-lg px-2 py-1.5 hover:bg-violet-50 flex items-center gap-2 border border-violet-100"
                >
                  <span>👆</span>
                  <span className="truncate flex-1">{a.title}</span>
                  <span className="text-[10px] text-violet-500 shrink-0">{assetDisplayType(a)}</span>
                </button>
              ))}
            </div>
            <div className="text-xs font-semibold text-slate-600 mb-2">📦 其他素材（点击插入）</div>
            <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
              {otherAssets.length === 0 && <div className="text-xs text-slate-400">还没有素材</div>}
              {otherAssets.slice(0, 20).map((a) => (
                <button key={a.id} onClick={() => insertAsset(a)} className="w-full text-left text-xs rounded-lg px-2 py-1 hover:bg-orange-50 flex items-center gap-2">
                  <span>{({ image: '🖼️', video: '🎬', text: '📝', poster: '🖼️', ppt: '📊', code: '💻', mixed: '🎁', audio: '🔊' } as Record<string, string>)[a.type] || '📁'}</span>
                  <span className="truncate flex-1">{a.title}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Middle: editor */}
        <section className="col-span-12 lg:col-span-5 space-y-3">
          {mode === 'prompt' && (
            <div className="kid-card !p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">🪄 提示词</div>
                <VoiceInputButton onResult={(t) => setPrompt((p) => (p ? p + '\n' : '') + t)} />
              </div>
              <PromptTemplates category="web" onPick={(t) => setPrompt(t.prompt)} />
              <textarea className="kid-textarea" rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：帮我做一个介绍小宠物兔子的网页，要有 3 张照片占位、1 段介绍文字" />
              <button onClick={generate} disabled={busy === 'gen'} className="kid-button-primary w-full">{busy === 'gen' ? '生成中…' : '✨ 让 AI 生成 / 重新生成'}</button>
              {busy === 'gen' && <AiProgress label="AI 正在生成网页…" />}
            </div>
          )}

          <div className="kid-card !p-3">
            <div className="text-xs font-semibold text-slate-600 mb-2">📝 HTML</div>
            <textarea className="kid-textarea !min-h-[180px] font-mono text-xs" value={html} onChange={(e) => setHtml(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="kid-card !p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">🎨 CSS</div>
              <textarea className="kid-textarea !min-h-[120px] font-mono text-xs" value={css} onChange={(e) => setCss(e.target.value)} />
            </div>
            <div className="kid-card !p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">⚡ JS（受限）</div>
              <textarea className="kid-textarea !min-h-[120px] font-mono text-xs" value={js} onChange={(e) => setJs(e.target.value)} />
            </div>
          </div>

          {project && (
            <div className="kid-card !p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">🕘 历史版本</div>
              <div className="flex flex-wrap gap-2">
                {project.versions.map((v) => (
                  <button key={v.id} onClick={() => { setHtml(v.html); setCss(v.css || ''); setJs(v.js || ''); setPrompt(v.prompt || ''); }} className="text-xs px-3 py-1 rounded-full bg-orange-50 text-brand-dark border border-orange-100">v{v.version}</button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right: preview */}
        <section className="col-span-12 lg:col-span-4">
          <div className="kid-card !p-3 sticky top-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">🔍 实时预览</div>
              <label className="text-xs text-slate-500 flex items-center gap-1">
                <input type="checkbox" checked={autoPreview} onChange={(e) => setAutoPreview(e.target.checked)} /> 自动刷新
              </label>
            </div>
            <iframe
              key={autoPreview ? html + css + js : 'static'}
              sandbox="allow-scripts"
              srcDoc={previewDoc}
              className="w-full h-[600px] rounded-2xl border border-orange-100 bg-white"
            />
            <div className="mt-3"><AiWarning extra="发布前请先自己看一下网页内容是否合适。" /></div>
            <div className="mt-3 flex gap-2 text-xs">
              <Link href="/student/projects" className="text-brand">← 返回我的网页</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function buildPreviewDoc(html: string, css?: string, js?: string): string {
  const safeHtml = html || '<p style="font-family:system-ui;color:#9ca3af;text-align:center;margin-top:40%">在左侧编辑或生成内容来开始预览</p>';
  // If user provided full HTML doc, inject css/js. Otherwise wrap.
  if (/<\/html>/i.test(safeHtml)) {
    let doc = safeHtml;
    if (css) doc = doc.replace(/<\/head>/i, `<style>${css}</style></head>`);
    if (js) doc = doc.replace(/<\/body>/i, `<script>${js}<\/script></body>`);
    return doc;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css || ''}</style></head><body>${safeHtml}<script>${js || ''}<\/script></body></html>`;
}

function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)); }
function escapeAttr(s: string) { return escapeHtml(s); }
function insertBeforeBodyClose(html: string, snippet: string): string {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${snippet}\n</body>`);
  return html + '\n' + snippet;
}
