'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/language-context';
import {
  dedupePmApplicationList,
  deletePmApplication,
  listPmApplications,
  restorePmApplicationToWorkspace,
  startNewPmApplication,
  type PmApplicationListItem,
} from '@/lib/pm-applications';
import { invalidateAssetsCache } from '@/lib/assets-cache';

function stepLabel(step: 1 | 2 | 3, completed: boolean, tx: (s: string) => string) {
  if (completed) return tx('已完成三步');
  if (step === 3) return tx('第 3 步 · 路演材料');
  if (step === 2) return tx('第 2 步 · AI 小应用');
  return tx('第 1 步 · 需求说明书');
}

function formatSavedAt(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PmApplicationsPage() {
  const { tx } = useLanguage();
  const router = useRouter();
  const [rawItems, setRawItems] = useState<PmApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllDuplicates, setShowAllDuplicates] = useState(false);

  const items = useMemo(
    () => (showAllDuplicates ? rawItems : dedupePmApplicationList(rawItems)),
    [rawItems, showAllDuplicates],
  );
  const hiddenDuplicateCount = rawItems.length - dedupePmApplicationList(rawItems).length;

  async function load() {
    setLoading(true);
    try {
      invalidateAssetsCache();
      setRawItems(await listPmApplications());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  function handleNew() {
    startNewPmApplication();
    router.push('/student/pm-creator');
  }

  async function handleEdit(item: PmApplicationListItem) {
    setOpeningId(item.assetId);
    try {
      await restorePmApplicationToWorkspace(item);
      router.push('/student/pm-creator');
    } catch (e: unknown) {
      alert((e as Error)?.message || tx('打开失败'));
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDelete(item: PmApplicationListItem) {
    const ok = window.confirm(
      tx(`确定删除「${item.title}」？\n\n只会从「我的 AI 应用」列表移除，不会删除素材库里的需求说明书、小应用和路演材料。`),
    );
    if (!ok) return;
    setDeletingId(item.assetId);
    try {
      await deletePmApplication(item.assetId);
      setRawItems((prev) => prev.filter((x) => x.assetId !== item.assetId));
    } catch (e: unknown) {
      alert((e as Error)?.message || tx('删除失败'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">{tx('💼 我的 AI 应用')}</h1>
          <p className="text-slate-600 mt-1 text-sm leading-relaxed max-w-2xl">
            {tx('这里保存了你完成的三步作品。可以「查看」完整展示，「编辑」继续修改，不需要的可以「删除」。')}
          </p>
        </div>
        <button type="button" onClick={handleNew} className="kid-button-primary shrink-0">
          {tx('+ 新建 AI 应用')}
        </button>
      </header>

      <div className="kid-card-purple !py-3 !px-4 text-sm text-ink-soft leading-relaxed space-y-1">
        <p>{tx('小贴士：走完「需求 → 小应用 → 路演」三步后，在路演页点击「保存完整 AI 应用」，作品就会出现在这里。')}</p>
        {hiddenDuplicateCount > 0 && !showAllDuplicates && (
          <p className="text-violet-700 font-semibold">
            {tx(`已自动隐藏 ${hiddenDuplicateCount} 条重复记录（多次保存同一应用）。`)}
            <button
              type="button"
              className="ml-1 underline hover:text-violet-900"
              onClick={() => setShowAllDuplicates(true)}
            >
              {tx('显示全部')}
            </button>
          </p>
        )}
        {showAllDuplicates && hiddenDuplicateCount > 0 && (
          <button
            type="button"
            className="text-violet-700 font-semibold underline hover:text-violet-900"
            onClick={() => setShowAllDuplicates(false)}
          >
            {tx('只显示每个应用的最新一条')}
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-ink-soft">{tx('加载中…')}</p>}

      {!loading && items.length === 0 && (
        <div className="kid-card text-center text-slate-500 space-y-3 py-10">
          <div className="text-4xl">💼</div>
          <p>{tx('还没有保存的 AI 应用。')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/student/course/g/pm-creator" className="kid-button-primary !py-2 !px-4 text-sm">
              {tx('从课程开始创作 →')}
            </Link>
            <button type="button" onClick={handleNew} className="kid-button-ghost !py-2 !px-4 text-sm">
              {tx('直接新建应用')}
            </button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.assetId}
            className="kid-card !p-4 flex flex-col gap-3 hover:-translate-y-0.5 transition-all relative group"
          >
            <button
              type="button"
              title={tx('删除')}
              disabled={deletingId === item.assetId}
              onClick={() => void handleDelete(item)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 text-xs font-bold opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-40"
              aria-label={tx('删除')}
            >
              {deletingId === item.assetId ? '…' : '✕'}
            </button>

            <div className="flex items-start justify-between gap-2 pr-6">
              <div className="min-w-0">
                <div className="font-extrabold text-lg truncate">{item.title}</div>
                {item.summary && <div className="text-xs text-ink-soft mt-1 line-clamp-2">{item.summary}</div>}
              </div>
              <span
                className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  item.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {item.completed ? tx('完整') : tx('进行中')}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
              <span
                className={`rounded-full px-2 py-0.5 ${item.prdAssetId || item.productName ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}
              >
                ① {tx('需求')}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${item.webAssetId || item.webProjectId ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}
              >
                ② {tx('小应用')}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${item.completed ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-slate-100 text-slate-500'}`}
              >
                ③ {tx('路演')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
              <span>{stepLabel(item.step, item.completed, tx)}</span>
              {item.updatedAt > 0 && (
                <>
                  <span>·</span>
                  <span>{tx('保存于')} {formatSavedAt(item.updatedAt)}</span>
                </>
              )}
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              <Link
                href={`/student/pm-applications/${item.assetId}`}
                className="kid-button-ghost !py-1.5 !px-3 text-xs font-bold"
              >
                👁 {tx('查看')}
              </Link>
              <button
                type="button"
                className="kid-button-primary !py-1.5 !px-3 text-xs font-bold"
                disabled={openingId === item.assetId || deletingId === item.assetId}
                onClick={() => void handleEdit(item)}
              >
                {openingId === item.assetId ? tx('打开中…') : `✏️ ${tx('编辑')}`}
              </button>
              <button
                type="button"
                className="text-xs font-bold text-rose-500 hover:text-rose-700 px-1"
                disabled={deletingId === item.assetId}
                onClick={() => void handleDelete(item)}
              >
                {deletingId === item.assetId ? tx('删除中…') : tx('删除')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
