'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PublishedPageLink } from '@/components/published-page-link';
import { uploadLocalHtmlAsWebProject, isUploadedHtmlProject, syncLocalUploadWebProjectsToAssets } from '@/lib/upload-local-html-web-project';
import { webStudioHref } from '@/lib/web-studio-nav';
import { useLanguage } from '@/contexts/language-context';

export default function ProjectsPage() {
  const { tx } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    await syncLocalUploadWebProjectsToAssets().catch(() => {});
    const [projects, homepage] = await Promise.all([
      api.get('/web-projects'),
      api.get('/homepages/mine').catch(() => ({ data: null })),
    ]);
    setItems(projects.data || []);
    setFeaturedId(homepage.data?.featuredWebProjectId ?? null);
  }
  useEffect(() => { load(); }, []);

  async function createNew() {
    const title = prompt(tx('给你的新网页起个名字：'), tx('我的新网页'));
    if (!title) return;
    const r = await api.post('/web-projects', { title });
    router.push(`/student/web?id=${r.data.id}`);
  }

  function openUploadPicker() {
    fileInputRef.current?.click();
  }

  async function handleHtmlFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const defaultTitle = file.name.replace(/\.(html?|htm)$/i, '').trim() || tx('我上传的网页');
    const title = prompt(tx('给这个网页起个名字（可修改）：'), defaultTitle);
    if (!title?.trim()) return;

    setUploading(true);
    try {
      const result = await uploadLocalHtmlAsWebProject(file, title.trim());
      await load();
      const openNow = confirm(
        `${tx('上传成功！')}\n${tx('访问链接')}：${result.url}\n\n${tx('是否现在打开网页？')}`,
      );
      if (openNow) window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      alert((err as Error)?.message || tx('上传失败'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">{tx('💻 我的网页')}</h1>
          <p className="text-slate-600 mt-1 text-sm">{tx('每个项目都可以有多个版本，发布后会有访问链接。课程里保存的网页也会出现在这里。')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,text/html"
            className="hidden"
            onChange={(e) => void handleHtmlFileChange(e)}
          />
          <button
            type="button"
            onClick={openUploadPicker}
            disabled={uploading}
            className="kid-button-ghost !py-2 !px-4 text-sm font-bold"
          >
            {uploading ? tx('上传中…') : tx('📤 上传 HTML')}
          </button>
          <button onClick={createNew} className="kid-button-primary">{tx('+ 新建网页')}</button>
        </div>
      </header>
      <p className="text-xs text-slate-500 -mt-2">{tx('支持上传本地 .html 完整文件，上传后会自动生成可分享的访问链接。')}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && (
          <div className="kid-card text-center text-slate-500 col-span-full">
            {tx('还没有网页项目。')}
            <Link href="/student/explore" className="text-brand font-bold ml-1">{tx('去探索模式')}</Link>
            {tx('或')}
            <Link href="/student/web" className="text-brand font-bold ml-1">{tx('网页工作台')}</Link>
            {tx('创建一个吧。')}
          </div>
        )}
        {items.map((p) => {
          const fromCourse = typeof p.description === 'string' && p.description.startsWith('课程 ·');
          const fromFreeCreate = typeof p.description === 'string' && p.description.startsWith('自由创作 ·');
          const fromUpload = isUploadedHtmlProject(p.description);
          const isHomepage = featuredId === p.id;
          return (
          <div key={p.id} className={`kid-card !p-4 ${isHomepage ? 'ring-2 ring-emerald-300 border-emerald-200' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold truncate">{p.title}</div>
              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                {isHomepage && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">{tx('🏠 主页')}</span>
                )}
                {fromUpload && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">{tx('本地上传')}</span>}
                {fromCourse && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">{tx('课程')}</span>}
                {fromFreeCreate && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold">{tx('自由创作')}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{p.status === 'published' ? tx('已发布') : tx('草稿')}</span>
              </div>
            </div>
            {p.description && <div className="text-[11px] text-slate-400 mt-1 truncate">{p.description}</div>}
            <div className="text-xs text-slate-500 mt-1">v{p.currentVersion} · {tx('共')} {p._count?.versions} {tx('个版本')}</div>
            <div className="mt-3 flex justify-between text-xs flex-wrap gap-2">
              <Link href={webStudioHref(p.id, 'projects')} className="text-brand">{tx('编辑 →')}</Link>
              {p.slug && (
                <>
                  {!isHomepage && (
                    <button
                      type="button"
                      className="text-emerald-600 font-bold"
                      onClick={async () => {
                        try {
                          await api.patch('/homepages/mine', { featuredWebProjectId: p.id });
                          setFeaturedId(p.id);
                        } catch (e: any) {
                          alert(e?.message || tx('设置失败'));
                        }
                      }}
                    >
                      {tx('🏠 设为主页')}
                    </button>
                  )}
                  <PublishedPageLink slug={p.slug} className="text-emerald-600">{tx('访问 ↗')}</PublishedPageLink>
                </>
              )}
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}
