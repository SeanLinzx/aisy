'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { api } from '@/lib/api';
import {
  ASSET_TABS,
  assetDisplayType,
  isHiddenInLibrary,
  parseAssetMeta,
  type AssetTabKey,
} from '@/lib/asset-tabs';
import { resolveUploadPath } from '@/lib/upload-url';
import {
  batchDownloadStudentAssets,
  assetPromptPlain,
  isBatchDownloadable,
  type BatchExportOptions,
} from '@/lib/export-student-assets';
import { assetDisplayTitle, plainTextPreview } from '@/lib/plain-text';
import { VideoCover } from '@/components/video-cover';
import { isVideoThumbnailImage } from '@/lib/video-cover';
import { AssetMediaViewer, resolveAssetMediaPreview } from '@/components/asset-media-viewer';
import {
  fetchStaffStudentAssetsPage,
  type StaffAssetRow,
} from '@/lib/staff-assets-list';

const TEACHER_DELETABLE = new Set(['text', 'ppt', 'image', 'video', 'poster', 'mixed', 'audio']);
const SEARCH_DEBOUNCE_MS = 350;

type StaffRole = 'admin' | 'teacher';

interface Props {
  role: StaffRole;
}

export function StaffStudentAssetsPage({ role }: Props) {
  const [type, setType] = useState<AssetTabKey>('image');
  const [items, setItems] = useState<StaffAssetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [students, setStudents] = useState<Array<{ id: string; displayName: string; username: string }>>([]);
  const [ownerId, setOwnerId] = useState('');
  const [qInput, setQInput] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterPending, startFilterTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', summary: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [createForm, setCreateForm] = useState({
    ownerId: '',
    type: 'image' as string,
    title: '',
    summary: '',
    content: '',
    url: '',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadOpts, setDownloadOpts] = useState<BatchExportOptions>({
    showStudent: true,
    showPrompt: true,
  });
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const backfillAttempted = useRef(new Set<string>());
  const pageRef = useRef(1);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    api
      .get('/users', { params: { role: 'student' } })
      .then((r) => setStudents(r.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setAppliedQ(qInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [qInput]);

  const loadPage = useCallback(
    async (page: number, append: boolean) => {
      const reqId = ++requestIdRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const data = await fetchStaffStudentAssetsPage({
          page,
          tab: type,
          ownerId: ownerId || undefined,
          q: appliedQ || undefined,
          showArchived,
        });
        if (reqId !== requestIdRef.current) return;

        pageRef.current = page;
        setTotal(data.total);
        setHasMore(data.hasMore);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setMsg(null);
      } catch (e: unknown) {
        if (reqId !== requestIdRef.current) return;
        setMsg('❌ ' + ((e as Error)?.message || '加载失败'));
        if (!append) {
          setItems([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [type, ownerId, appliedQ, showArchived],
  );

  const reload = useCallback(() => {
    pageRef.current = 1;
    void loadPage(1, false);
  }, [loadPage]);

  useEffect(() => {
    pageRef.current = 1;
    void loadPage(1, false);
  }, [loadPage]);

  useEffect(() => {
    const el = loadMoreRef.current;
    const root = listScrollRef.current;
    if (!el || !root || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && !loadingMore) {
          void loadPage(pageRef.current + 1, true);
        }
      },
      { root, rootMargin: '120px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadPage, items.length]);

  useEffect(() => {
    if (loading || type !== 'video' || items.length === 0) return;
    const needs = items.filter(
      (a) =>
        a.type === 'video' &&
        a.url &&
        !isVideoThumbnailImage(a.thumbnailUrl, a.url) &&
        !backfillAttempted.current.has(a.id),
    );
    if (needs.length === 0) return;
    needs.forEach((a) => backfillAttempted.current.add(a.id));
    let cancelled = false;
    api
      .post('/assets/backfill-video-thumbnails', { ids: needs.slice(0, 8).map((a) => a.id) })
      .then((r) => {
        if (!cancelled && r.data?.updated > 0) reload();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loading, type, items, reload]);

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFullscreen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  useEffect(() => {
    if (fullscreen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [fullscreen]);

  const downloadableItems = useMemo(() => items.filter(isBatchDownloadable), [items]);
  const selectedAssets = useMemo(
    () => items.filter((a) => selectedIds.has(a.id) && isBatchDownloadable(a)),
    [items, selectedIds],
  );
  const allDownloadableSelected =
    downloadableItems.length > 0 && downloadableItems.every((a) => selectedIds.has(a.id));

  useEffect(() => {
    setSelectedIds(new Set());
    setFullscreen(false);
  }, [type, ownerId, appliedQ, showArchived]);

  useEffect(() => {
    if (focusedId && items.some((a) => a.id === focusedId)) return;
    const firstPreviewable = items.find((a) => resolveAssetMediaPreview(a));
    setFocusedId(firstPreviewable?.id ?? items[0]?.id ?? null);
  }, [items, focusedId]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allDownloadableSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(downloadableItems.map((a) => a.id)));
  }

  async function confirmBatchDownload() {
    if (selectedAssets.length === 0) {
      alert('请先勾选要下载的素材');
      return;
    }
    setDownloading(true);
    setDownloadProgress(`0 / ${selectedAssets.length}`);
    try {
      await batchDownloadStudentAssets(selectedAssets, downloadOpts, (done, total) => {
        setDownloadProgress(`${done} / ${total}`);
      });
      setDownloadOpen(false);
      setMsg(`✅ 已打包下载 ${selectedAssets.length} 个素材`);
    } catch (e: unknown) {
      alert((e as Error)?.message || '批量下载失败');
    } finally {
      setDownloading(false);
      setDownloadProgress('');
    }
  }

  function canDelete(asset: { type: string }) {
    if (role === 'admin') return true;
    return TEACHER_DELETABLE.has(asset.type);
  }

  async function remove(id: string, assetType: string) {
    if (!canDelete({ type: assetType })) {
      alert('老师只能删除学生的文字、图片或视频类素材');
      return;
    }
    if (!confirm('确定永久删除该素材？此操作不可恢复。')) return;
    try {
      await api.delete(`/assets/${id}`);
      reload();
    } catch (e: unknown) {
      alert((e as Error)?.message || '删除失败');
    }
  }

  async function archive(id: string) {
    if (!confirm('删除后将从学生素材库移除，确定？')) return;
    await api.post(`/assets/${id}/archive`);
    reload();
  }

  async function restore(id: string) {
    if (!confirm('恢复后该素材将重新出现在学生素材库，确定？')) return;
    try {
      await api.post(`/assets/${id}/restore`);
      setMsg('✅ 已恢复素材');
      reload();
    } catch (e: unknown) {
      alert((e as Error)?.message || '恢复失败');
    }
  }

  async function toggleHidden(id: string, hidden: boolean) {
    await api.post(`/assets/${id}/library-visibility`, { hidden });
    reload();
  }

  function openEdit(a: StaffAssetRow) {
    setEditId(a.id);
    setEditForm({ title: a.title || '', summary: a.summary || '' });
  }

  async function saveEdit() {
    if (!editId) return;
    try {
      await api.patch(`/assets/${editId}`, editForm);
      setEditId(null);
      reload();
    } catch (e: unknown) {
      alert((e as Error)?.message || '保存失败');
    }
  }

  async function submitCreate() {
    if (!createForm.ownerId || !createForm.title) {
      alert('请选择学生并填写标题');
      return;
    }
    try {
      await api.post('/assets', {
        ownerId: createForm.ownerId,
        type: createForm.type,
        title: createForm.title,
        summary: createForm.summary || undefined,
        content: createForm.content || undefined,
        url: createForm.url || undefined,
      });
      setCreateOpen(false);
      setCreateForm({ ownerId: '', type: 'image', title: '', summary: '', content: '', url: '' });
      reload();
      setMsg('✅ 已为学生创建素材');
    } catch (e: unknown) {
      alert((e as Error)?.message || '创建失败');
    }
  }

  const createTypes =
    role === 'admin'
      ? ['text', 'image', 'video', 'web', 'poster', 'mixed']
      : ['text', 'image', 'video', 'poster'];

  const focusedAsset = useMemo(
    () => items.find((a) => a.id === focusedId) ?? null,
    [items, focusedId],
  );

  const focusedPreview = useMemo(() => {
    if (!focusedAsset) return null;
    const media = resolveAssetMediaPreview(focusedAsset);
    if (!media) return null;
    return { ...media, ownerName: focusedAsset.owner?.displayName };
  }, [focusedAsset]);

  function selectAsset(id: string) {
    setFocusedId(id);
    setFullscreen(false);
  }

  function renderAssetActions(a: StaffAssetRow, variant: 'light' | 'dark' = 'light') {
    const hidden = isHiddenInLibrary(a);
    const archived = Boolean(a.archived);
    const deletable = canDelete(a);
    const dark = variant === 'dark';
    const border = dark ? 'border-white/15' : 'border-orange-100';
    const link = dark ? 'text-sky-300 font-bold' : 'text-brand font-bold';
    const edit = dark ? 'text-violet-300 font-bold' : 'text-violet-600 font-bold';
    const mute = dark ? 'text-white/70 font-bold' : 'text-slate-500 font-bold';
    const restoreCls = dark ? 'text-emerald-300 font-bold' : 'text-emerald-600 font-bold';
    const archiveCls = dark ? 'text-amber-300 font-bold' : 'text-amber-600 font-bold';
    const del = deletable
      ? dark
        ? 'text-rose-300 font-bold'
        : 'text-rose-500 font-bold'
      : dark
        ? 'text-white/30 font-bold cursor-not-allowed'
        : 'text-slate-300 font-bold cursor-not-allowed';

    return (
      <div className={`flex flex-wrap justify-end gap-2 text-xs pt-2 border-t ${border}`}>
        {a.url && (
          <a href={resolveUploadPath(a.url)} target="_blank" rel="noreferrer" className={link}>
            查看原文件
          </a>
        )}
        <button type="button" onClick={() => openEdit(a)} className={edit}>
          编辑
        </button>
        <button
          type="button"
          onClick={() => toggleHidden(a.id, !hidden)}
          className={mute}
          disabled={archived}
        >
          {hidden ? '取消隐藏' : '隐藏'}
        </button>
        {archived ? (
          <button type="button" onClick={() => restore(a.id)} className={restoreCls}>
            恢复
          </button>
        ) : (
          <button type="button" onClick={() => archive(a.id)} className={archiveCls}>
            删除
          </button>
        )}
        <button
          type="button"
          onClick={() => remove(a.id, a.type)}
          disabled={!deletable}
          className={del}
          title={deletable ? '永久删除（不可恢复）' : '老师仅可删除文字/图片/视频类素材'}
        >
          永久删除
        </button>
      </div>
    );
  }

  function renderAssetDetailFooter(a: StaffAssetRow, variant: 'light' | 'dark' = 'light') {
    const archived = Boolean(a.archived);
    const hidden = isHiddenInLibrary(a);
    const dark = variant === 'dark';
    const muted = dark ? 'text-white/75' : 'text-slate-500';
    const faint = dark ? 'text-white/55' : 'text-slate-400';
    const prompt = assetPromptPlain(a);
    const summary = plainTextPreview(a.summary, 300);

    return (
      <div className="space-y-2 min-w-0 max-w-full break-words">
        <div className={`flex flex-wrap items-center gap-2 text-xs ${muted}`}>
          <span>👤 {a.owner?.displayName || '未知'}</span>
          <span>·</span>
          <span>{new Date(a.createdAt).toLocaleString()}</span>
          <span className="tag">{assetDisplayType(a)}</span>
          {archived && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                dark ? 'bg-rose-500/25 text-rose-200' : 'bg-rose-100 text-rose-700'
              }`}
            >
              已删除
            </span>
          )}
          {hidden && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                dark ? 'bg-white/15 text-white/80' : 'bg-slate-100 text-slate-600'
              }`}
            >
              已隐藏
            </span>
          )}
        </div>
        {summary && <p className={`text-xs ${muted} break-words whitespace-pre-wrap`}>{summary}</p>}
        {prompt && (
          <p className={`text-[11px] ${faint} break-words whitespace-pre-wrap line-clamp-4`}>提示词: {prompt}</p>
        )}
        {a.type === 'web' && a.url && (
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className={`inline-block text-sm font-bold ${dark ? 'text-sky-300' : 'text-brand'}`}
          >
            🌐 打开网页
          </a>
        )}
        {renderAssetActions(a, variant)}
      </div>
    );
  }

  const listBusy = loading || filterPending;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">📦 学生素材管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            查看、编辑学生素材库。
            {role === 'teacher' ? '老师可删除文字/图片/视频类素材；' : '管理员可删除任意类型素材；'}
            学生自行删除的素材可在此恢复；左侧点击素材、右侧查看大图，支持全屏；也可代学生新增文字或媒体链接。
          </p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="kid-button-primary shrink-0">
          + 代学生新增
        </button>
      </header>

      {msg && <div className="text-sm font-semibold">{msg}</div>}

      <div className="kid-card flex flex-wrap gap-3 items-end">
        <label className="text-sm space-y-1">
          <span className="text-slate-500">学生</span>
          <select
            className="kid-input min-w-[160px]"
            value={ownerId}
            onChange={(e) => startFilterTransition(() => setOwnerId(e.target.value))}
          >
            <option value="">全部学生</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName} ({s.username})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm space-y-1 flex-1 min-w-[140px]">
          <span className="text-slate-500">搜索标题</span>
          <input
            className="kid-input w-full"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="输入关键词…"
          />
        </label>
        <button type="button" onClick={reload} className="kid-button-ghost" disabled={loading}>
          刷新
        </button>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 cursor-pointer pb-0.5">
          <input
            type="checkbox"
            className="rounded border-orange-300 text-brand focus:ring-brand"
            checked={showArchived}
            onChange={(e) => startFilterTransition(() => setShowArchived(e.target.checked))}
          />
          显示学生已删除
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ASSET_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => startFilterTransition(() => setType(t.key))}
              className={`text-sm px-3 py-1.5 rounded-xl border ${type === t.key ? 'bg-brand text-white border-brand' : 'bg-white text-slate-700 border-orange-200 hover:bg-orange-50'}`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        {downloadableItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600">
              <input
                type="checkbox"
                className="rounded border-orange-300 text-brand focus:ring-brand"
                checked={allDownloadableSelected}
                onChange={toggleSelectAll}
              />
              全选已加载
            </label>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">已选 {selectedIds.size} 项</span>
            <button
              type="button"
              className="kid-button-primary !py-1.5 !px-3 text-sm disabled:opacity-50"
              disabled={selectedIds.size === 0 || downloading}
              onClick={() => setDownloadOpen(true)}
            >
              ⬇ 批量下载
            </button>
          </div>
        )}
      </div>

      {listBusy && items.length === 0 && (
        <div className="kid-card text-center text-slate-500 text-sm py-10">加载中…</div>
      )}
      {!listBusy && items.length === 0 && (
        <div className="kid-card text-center text-slate-500 text-sm py-10">暂无符合条件的素材</div>
      )}

      {items.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
          <aside className="lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-4 flex flex-col gap-2 max-h-[50vh] lg:max-h-[calc(100vh-10rem)]">
            <div className="text-xs font-bold text-slate-500 px-1 shrink-0 flex items-center justify-between gap-2">
              <span>
                素材列表（{items.length}
                {hasMore ? '+' : ''} / {total}）· 点击查看大图
              </span>
              {listBusy && <span className="text-brand animate-pulse">刷新中…</span>}
            </div>
            <div ref={listScrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 -mr-1">
              {items.map((a) => (
                <AssetSidebarRow
                  key={a.id}
                  asset={a}
                  active={focusedId === a.id}
                  checked={selectedIds.has(a.id)}
                  downloadable={isBatchDownloadable(a)}
                  onSelect={() => selectAsset(a.id)}
                  onToggleSelect={() => toggleSelect(a.id)}
                />
              ))}
              <div ref={loadMoreRef} className="h-8 flex items-center justify-center text-[11px] text-slate-400">
                {loadingMore ? '加载更多…' : hasMore ? '向下滚动加载更多' : items.length > 0 ? '已加载全部' : null}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0 lg:sticky lg:top-4">
            <AssetMediaViewer
              data={focusedPreview}
              fullscreen={fullscreen}
              onToggleFullscreen={() => setFullscreen((v) => !v)}
              embeddedHeight="min-h-[420px] lg:min-h-[calc(100vh-12rem)]"
              footer={focusedAsset ? renderAssetDetailFooter(focusedAsset, fullscreen ? 'dark' : 'light') : undefined}
            />
          </div>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="kid-card max-w-md w-full space-y-3">
            <h3 className="font-bold text-lg">编辑素材</h3>
            <label className="block text-sm space-y-1">
              标题
              <input
                className="kid-input w-full"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label className="block text-sm space-y-1">
              摘要
              <textarea
                className="kid-input w-full min-h-[80px]"
                value={editForm.summary}
                onChange={(e) => setEditForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="kid-button-ghost" onClick={() => setEditId(null)}>
                取消
              </button>
              <button type="button" className="kid-button-primary" onClick={saveEdit}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {downloadOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="kid-card max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg">批量下载</h3>
            <p className="text-sm text-slate-500">
              将打包下载已选的 {selectedAssets.length} 个素材（ZIP）。图片可在底部叠加标注信息；视频将附带说明文本。
            </p>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-orange-300 text-brand focus:ring-brand"
                  checked={downloadOpts.showStudent}
                  onChange={(e) => setDownloadOpts((o) => ({ ...o, showStudent: e.target.checked }))}
                />
                显示学生信息（学生姓名）
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-orange-300 text-brand focus:ring-brand"
                  checked={downloadOpts.showPrompt}
                  onChange={(e) => setDownloadOpts((o) => ({ ...o, showPrompt: e.target.checked }))}
                />
                显示提示词信息（生成图片/视频时使用的提示词）
              </label>
            </div>
            {downloading && (
              <p className="text-sm text-brand font-semibold">正在打包… {downloadProgress}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="kid-button-ghost"
                disabled={downloading}
                onClick={() => setDownloadOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="kid-button-primary"
                disabled={downloading}
                onClick={confirmBatchDownload}
              >
                {downloading ? '下载中…' : '开始下载'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="kid-card max-w-md w-full space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg">代学生新增素材</h3>
            <label className="block text-sm space-y-1">
              学生
              <select
                className="kid-input w-full"
                value={createForm.ownerId}
                onChange={(e) => setCreateForm((f) => ({ ...f, ownerId: e.target.value }))}
              >
                <option value="">请选择</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName} ({s.username})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm space-y-1">
              类型
              <select
                className="kid-input w-full"
                value={createForm.type}
                onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
              >
                {createTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm space-y-1">
              标题
              <input
                className="kid-input w-full"
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label className="block text-sm space-y-1">
              摘要（可选）
              <input
                className="kid-input w-full"
                value={createForm.summary}
                onChange={(e) => setCreateForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </label>
            {createForm.type === 'text' && (
              <label className="block text-sm space-y-1">
                正文
                <textarea
                  className="kid-input w-full min-h-[100px]"
                  value={createForm.content}
                  onChange={(e) => setCreateForm((f) => ({ ...f, content: e.target.value }))}
                />
              </label>
            )}
            {(createForm.type === 'image' ||
              createForm.type === 'video' ||
              createForm.type === 'poster' ||
              createForm.type === 'mixed') && (
              <label className="block text-sm space-y-1">
                媒体 URL（/uploads/… 或外链）
                <input
                  className="kid-input w-full"
                  value={createForm.url}
                  onChange={(e) => setCreateForm((f) => ({ ...f, url: e.target.value }))}
                />
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="kid-button-ghost" onClick={() => setCreateOpen(false)}>
                取消
              </button>
              <button type="button" className="kid-button-primary" onClick={submitCreate}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const AssetSidebarRow = memo(function AssetSidebarRow({
  asset: a,
  active,
  checked,
  downloadable,
  onSelect,
  onToggleSelect,
}: {
  asset: StaffAssetRow;
  active: boolean;
  checked: boolean;
  downloadable: boolean;
  onSelect: () => void;
  onToggleSelect: () => void;
}) {
  const hidden = isHiddenInLibrary(a);
  const archived = Boolean(a.archived);
  const hasPreview = !!resolveAssetMediaPreview(a);

  const thumbSrc = a.thumbnailUrl || a.url;
  const thumb =
    thumbSrc && (a.type === 'image' || a.type === 'poster' || a.type === 'mixed')
      ? resolveUploadPath(thumbSrc)
      : null;

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden transition ${
        active
          ? 'border-brand bg-orange-50 ring-2 ring-brand/20'
          : 'border-orange-100 bg-white hover:border-orange-200'
      } ${hidden || archived ? 'opacity-75' : ''}`}
    >
      <button type="button" onClick={onSelect} className="group w-full flex items-center gap-2 p-2 text-left">
        <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center border border-orange-100">
          {a.type === 'video' && (a.url || a.thumbnailUrl) ? (
            <VideoCover asset={a} className="w-full h-full" />
          ) : thumb ? (
            <img src={thumb} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : a.type === 'web' ? (
            <span className="text-2xl">🌐</span>
          ) : a.type === 'audio' ? (
            <span className="text-2xl">🎵</span>
          ) : a.type === 'ppt' ? (
            <span className="text-2xl">📊</span>
          ) : a.content ? (
            <p className="text-[10px] text-slate-600 line-clamp-3 px-1 break-all">{plainTextPreview(a.content, 60)}</p>
          ) : (
            <span className="text-xl opacity-40">📄</span>
          )}
          {hasPreview && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
              <span className="opacity-0 group-hover:opacity-100 text-white text-lg drop-shadow">🔍</span>
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate">{assetDisplayTitle(a.title)}</div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">{a.owner?.displayName || '未知'}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {archived && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">已删</span>
            )}
            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
              {assetDisplayType(a)}
            </span>
          </div>
        </div>
      </button>
      {downloadable && (
        <label
          className="flex items-center gap-2 px-3 py-1.5 border-t border-orange-50 text-[11px] text-slate-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="rounded border-orange-300 text-brand focus:ring-brand"
            checked={checked}
            onChange={onToggleSelect}
          />
          加入批量下载
        </label>
      )}
    </div>
  );
});
