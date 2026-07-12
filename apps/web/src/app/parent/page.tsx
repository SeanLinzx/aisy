'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { assetPath } from '@/lib/asset-path';
import { resolveUploadPath } from '@/lib/upload-url';

export default function ParentHome() {
  const [children, setChildren] = useState<any[]>([]);
  useEffect(() => { api.get('/parents/children').then(r => setChildren(r.data || [])); }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-dark">👨‍👩‍👧 我的孩子</h1>
      {children.length === 0 && <div className="kid-card text-center text-slate-500">暂时还没有绑定孩子，请联系老师协助绑定。</div>}
      <div className="grid md:grid-cols-2 gap-4">
        {children.map(c => (
          <div key={c.id} className="kid-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-xl">🧒</div>
              <div>
                <div className="font-semibold">{c.displayName}</div>
                <div className="text-xs text-slate-500">{c.username}</div>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-2">{c.studentProfile?.bio}</p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {c.assets?.slice(0, 6).map((a: any) => (
                <div key={a.id} className="aspect-square bg-orange-50 rounded-xl overflow-hidden flex items-center justify-center text-xs text-slate-500">
                  {a.url ? <img src={resolveUploadPath(a.url)} alt="" className="w-full h-full object-cover" /> : <span className="px-2 text-center">{a.title}</span>}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-3 text-xs flex-wrap">
              <Link href={`/parent/report/${c.id}`} className="text-brand">📈 成长报告</Link>
              {c.homepage?.slug && (
                <>
                  <a target="_blank" rel="noopener noreferrer" href={assetPath(`/s/${c.homepage.slug}`)} className="text-emerald-600">🌟 课程主页</a>
                  <a target="_blank" rel="noopener noreferrer" href={assetPath(`/g/${c.homepage.slug}`)} className="text-violet-600">📈 成长历程</a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
