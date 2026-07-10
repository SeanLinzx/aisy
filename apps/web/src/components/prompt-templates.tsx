'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Template {
  id: string;
  name: string;
  prompt: string;
  category: string;
  tags: string[];
}

const COLORS = [
  'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
  'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
  'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100',
  'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
  'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
];

export function PromptTemplates({ category, onPick }: { category: string; onPick: (t: Template) => void }) {
  const [items, setItems] = useState<Template[]>([]);
  useEffect(() => {
    api.get('/configs/templates', { params: { category } })
      .then((r) => setItems(r.data || []))
      .catch(() => setItems([]));
  }, [category]);
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-sm font-bold text-ink-soft mb-2 flex items-center gap-1.5">
        <span>💡</span> 推荐模板（点一下就能试）
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((t, i) => (
          <button
            key={t.id}
            onClick={() => onPick(t)}
            className={`text-xs font-bold px-3 py-2 rounded-2xl border-2 transition active:scale-95 hover:-translate-y-0.5 ${COLORS[i % COLORS.length]}`}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
