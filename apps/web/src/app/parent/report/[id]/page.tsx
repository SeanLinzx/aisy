'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';

const KIND_META: Record<string, { emoji: string; label: string; badge: string }> = {
  quiz: { emoji: '📝', label: '课堂问答', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  game: { emoji: '🎮', label: '游戏记录', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  debate: { emoji: '⚖️', label: '思辨观点', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  share: { emoji: '🎤', label: '我的分享', badge: 'bg-pink-50 text-pink-700 border-pink-200' },
  creation: { emoji: '🎨', label: '课堂创作', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

interface GrowthRecord {
  id: string;
  kind: string;
  gameSlug: string;
  title: string;
  summary: string | null;
  mediaUrl: string | null;
  createdAt: string;
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  useEffect(() => {
    api.get(`/parents/children/${id}/report`).then((r) => setData(r.data));
    api.get(`/growth/student/${id}`).then((r) => setRecords(r.data || [])).catch(() => setRecords([]));
  }, [id]);
  if (!data) return <div className="text-slate-500">加载中…</div>;

  return (
    <div className="space-y-5 max-w-4xl">
      <h1 className="text-2xl font-bold text-brand-dark">📈 成长报告</h1>
      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="作品总数" value={data.assets} emoji="🖼️" />
        <Stat label="AI 调用次数" value={data.jobs} emoji="🤖" />
        <Stat label="课堂记录" value={records.length} emoji="📖" />
      </div>

      <section className="kid-card">
        <h3 className="font-semibold mb-3">📖 课堂足迹（问答 · 游戏 · 分享）</h3>
        {records.length === 0 ? (
          <p className="text-sm text-slate-400">还没有课堂记录，上课后老师推送游戏时会自动生成。</p>
        ) : (
          <div className="space-y-3">
            {records.map((r) => {
              const meta = KIND_META[r.kind] || { emoji: '⭐', label: '记录', badge: 'bg-slate-50 text-slate-600 border-slate-200' };
              return (
                <div key={r.id} className="rounded-2xl border border-orange-100 p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                      {meta.emoji} {meta.label}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <div className="font-bold mt-2 text-sm">{r.title}</div>
                  {r.summary && (
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{r.summary}</p>
                  )}
                  {r.mediaUrl && (
                    /\.(mp4|webm|mov)(\?|$)/i.test(r.mediaUrl) ? (
                      <video src={resolveUploadPath(r.mediaUrl)} controls className="mt-2 w-full max-h-56 rounded-xl bg-black" />
                    ) : (
                      <img src={resolveUploadPath(r.mediaUrl)} alt="" className="mt-2 w-full max-h-56 object-cover rounded-xl" />
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="kid-card">
        <h3 className="font-semibold mb-3">最近的作品</h3>
        <div className="grid grid-cols-3 gap-2">
          {data.recent?.map((a: any) => (
            <div key={a.id} className="aspect-square bg-orange-50 rounded-xl overflow-hidden flex items-center justify-center text-xs text-slate-500">
              {a.url ? <img src={resolveUploadPath(a.url)} alt="" className="w-full h-full object-cover" /> : <span className="px-2 text-center">{a.title}</span>}
            </div>
          ))}
        </div>
      </section>
      <section className="kid-card">
        <h3 className="font-semibold mb-3">任务提交记录</h3>
        <ul className="text-sm space-y-1">
          {data.submissions?.map((s: any) => (
            <li key={s.id} className="flex justify-between border-b border-orange-50 py-1">
              <span>{s.task?.title}</span>
              <span className="text-xs text-slate-400">{s.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
function Stat({ label, value, emoji }: any) {
  return <div className="kid-card !p-4"><div className="text-2xl">{emoji}</div><div className="text-2xl font-bold text-brand-dark mt-1">{value}</div><div className="text-xs text-slate-500">{label}</div></div>;
}
