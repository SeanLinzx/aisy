import Link from 'next/link';
import { publishPath } from '@/lib/public-url';

interface PlazaItem {
  id: string;
  title: string;
  summary?: string;
  coverUrl?: string;
  targetType: string;
  targetId: string;
  studentId: string;
  featured: boolean;
}

async function fetchPlaza(): Promise<PlazaItem[]> {
  const apiOrigin = process.env.API_ORIGIN || 'http://localhost:3001';
  try {
    const res = await fetch(`${apiOrigin}/api/plaza`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
}

export default async function Plaza() {
  const items = await fetchPlaza();
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-dark">🌟 作品展示广场</h1>
            <p className="text-slate-600 text-sm mt-1">来看看小朋友们用 AI 创作的精彩作品吧。</p>
          </div>
          <Link href="/" className="kid-button-ghost">返回首页</Link>
        </div>
        {items.length === 0 ? (
          <div className="kid-card mt-8 text-center text-slate-500">暂时还没有作品被推荐到广场，老师正在挑选中…</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {items.map((it) => (
              <a key={it.id} href={it.targetType === 'web_project' ? publishPath(it.targetId) : '#'} className="kid-card hover:-translate-y-0.5 transition block">
                {it.coverUrl && <img src={it.coverUrl} alt="" className="w-full h-40 object-cover rounded-2xl mb-3" />}
                <div className="font-semibold text-slate-800">{it.title}</div>
                {it.summary && <div className="text-sm text-slate-500 mt-1">{it.summary}</div>}
                <div className="mt-3 flex gap-2">
                  <span className="tag">{it.targetType}</span>
                  {it.featured && <span className="tag !bg-pink-50 !text-pink-600 !border-pink-200">⭐ 精选</span>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
