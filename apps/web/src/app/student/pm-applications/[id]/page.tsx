'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HtmlPreview } from '@/components/course/html-preview';
import { useLanguage } from '@/contexts/language-context';
import { PublishedPageLink } from '@/components/published-page-link';
import {
  loadPmApplicationDetail,
  restorePmApplicationToWorkspace,
  type PmApplicationDetail,
} from '@/lib/pm-applications';
import { PITCH_SECTION_LABELS, type PitchSectionKey } from '@/lib/pm-pipeline';
import { resolvePublishHref } from '@/lib/public-url';

const PITCH_EMOJI: Record<PitchSectionKey, string> = {
  background: '🌍',
  goal: '🎯',
  method: '🛠️',
  effect: '✨',
  outlook: '🚀',
};

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-orange-100 bg-orange-50/50 px-4 py-8 text-center text-sm text-ink-soft">
      {text}
    </div>
  );
}

export default function PmApplicationViewPage() {
  const { tx } = useLanguage();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<PmApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await loadPmApplicationDetail(params.id);
        if (!cancelled) setDetail(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleEdit() {
    if (!detail) return;
    setEditing(true);
    try {
      await restorePmApplicationToWorkspace(detail.bundle);
      router.push('/student/pm-creator');
    } catch (e: unknown) {
      alert((e as Error)?.message || tx('打开失败'));
    } finally {
      setEditing(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-soft">{tx('加载中…')}</p>;
  }

  if (!detail) {
    return (
      <div className="kid-card text-center space-y-3 py-10">
        <p className="text-ink-soft">{tx('找不到这个 AI 应用。')}</p>
        <Link href="/student/pm-applications" className="kid-button-primary !py-2 !px-4 text-sm inline-block">
          {tx('← 返回我的 AI 应用')}
        </Link>
      </div>
    );
  }

  const { bundle, prd, app, pitch } = detail;
  const playHref = app?.playHref ?? resolvePublishHref(app?.slug);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/student/pm-applications" className="text-xs font-bold text-ink-soft hover:text-violet-600">
          ← {tx('返回我的 AI 应用')}
        </Link>
        <button
          type="button"
          className="kid-button-primary !py-2 !px-5 text-sm"
          disabled={editing}
          onClick={() => void handleEdit()}
        >
          {editing ? tx('打开中…') : tx('✏️ 进入编辑')}
        </button>
      </div>

      <header className="kid-card-purple !p-5 md:!p-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-violet-600/80">{tx('AI 应用作品 · 查看模式')}</div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold mt-1">{bundle.title}</h1>
            {bundle.summary && <p className="text-sm text-ink-soft mt-2 leading-relaxed">{bundle.summary}</p>}
          </div>
          <span
            className={`shrink-0 text-xs px-3 py-1 rounded-full font-bold ${
              bundle.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {bundle.completed ? tx('完整') : tx('进行中')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className={`rounded-full px-2.5 py-1 ${prd ? 'bg-violet-200 text-violet-800' : 'bg-white/60 text-ink-soft'}`}>
            ① {tx('需求说明书')}
          </span>
          <span className={`rounded-full px-2.5 py-1 ${app?.html ? 'bg-sky-200 text-sky-800' : 'bg-white/60 text-ink-soft'}`}>
            ② {tx('AI 小应用')}
          </span>
          <span className={`rounded-full px-2.5 py-1 ${pitch ? 'bg-fuchsia-200 text-fuchsia-800' : 'bg-white/60 text-ink-soft'}`}>
            ③ {tx('路演材料')}
          </span>
        </div>
      </header>

      <section className="kid-card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📝</span>
          <h2 className="font-extrabold text-lg">{tx('第 1 步 · 需求说明书')}</h2>
        </div>
        {prd?.markdown ? (
          <div className="rounded-2xl bg-orange-50/60 border border-orange-100 p-4 md:p-5">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-ink">{prd.markdown}</pre>
          </div>
        ) : (
          <EmptyBlock text={tx('还没有需求说明书内容。')} />
        )}
      </section>

      <section className="kid-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪄</span>
            <h2 className="font-extrabold text-lg">{tx('第 2 步 · AI 小应用')}</h2>
          </div>
          {playHref && (
            <PublishedPageLink href={playHref} className="text-xs font-bold text-emerald-600 hover:underline">
              {tx('全屏玩小应用 ↗')}
            </PublishedPageLink>
          )}
        </div>
        {app?.topic && <p className="text-sm text-ink-soft">{tx('主题')}：{app.topic}</p>}
        {app?.html ? (
          <div className="rounded-2xl overflow-hidden border-2 border-sky-100 bg-white">
            <HtmlPreview html={app.html} height={420} interactive />
          </div>
        ) : (
          <EmptyBlock text={tx('还没有生成小应用。')} />
        )}
      </section>

      <section className="kid-card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎤</span>
          <h2 className="font-extrabold text-lg">{tx('第 3 步 · 路演材料')}</h2>
        </div>
        {pitch ? (
          <div className="space-y-3">
            {PITCH_SECTION_LABELS.map(({ key, title }) => (
              <div key={key} className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/40 p-4 space-y-2">
                <div className="font-extrabold text-sm">
                  {PITCH_EMOJI[key]} {title}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">
                  {pitch.sections[key]?.trim() || tx('（待补充）')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyBlock text={tx('还没有路演材料。')} />
        )}
      </section>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-orange-100">
        <button
          type="button"
          className="kid-button-primary !py-2.5 !px-6"
          disabled={editing}
          onClick={() => void handleEdit()}
        >
          {editing ? tx('打开中…') : tx('✏️ 进入编辑，继续修改')}
        </button>
        <Link href="/student/pm-applications" className="kid-button-ghost !py-2.5 !px-5">
          {tx('返回列表')}
        </Link>
      </div>
    </div>
  );
}
