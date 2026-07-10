'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

export function ConversationList({
  meId, meRole, activeId, onPick,
}: {
  meId: string;
  meRole: 'parent' | 'teacher' | 'admin';
  activeId?: string;
  onPick: (id: string) => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  async function load() {
    try { setItems((await api.get('/messages/conversations')).data || []); } catch {}
  }
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  return (
    <div className="kid-card !p-2 space-y-1">
      <div className="px-3 py-2 text-xs font-bold text-ink-soft flex items-center gap-1.5">
        <span>💬</span> 最近会话
      </div>
      {items.length === 0 && (
        <div className="px-3 py-8 text-center text-xs text-ink-soft font-semibold">
          <div className="text-3xl mb-2">📭</div>
          暂无会话
        </div>
      )}
      {items.map((c) => {
        const isParent = meId === c.parentId;
        const peer = isParent ? c.teacher : c.parent;
        const peerLabel = isParent ? `${peer?.displayName} 老师` : `${peer?.displayName}（家长）`;
        const last = c.messages?.[0];
        const unread = isParent ? c.parentUnread : c.teacherUnread;
        const active = activeId === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className={cn(
              'w-full text-left rounded-2xl px-3 py-2.5 transition flex items-center gap-3 border-2',
              active
                ? 'bg-gradient-to-r from-orange-400 to-brand text-white border-transparent shadow-pop-sm'
                : 'bg-white border-orange-100 hover:bg-orange-50 hover:-translate-y-0.5',
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-2xl flex items-center justify-center text-base font-extrabold shadow-pop-sm',
              active ? 'bg-white/30 text-white' : 'bg-gradient-to-br from-amber-200 to-pink-300 text-brand-dark',
            )}>
              {peer?.displayName?.[0] || '·'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{peerLabel}</div>
              <div className={cn('text-xs truncate font-semibold', active ? 'text-white/85' : 'text-ink-soft')}>
                {last?.body || '点击开始聊天'}
              </div>
            </div>
            {unread > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.5 shadow-pop-sm">
                {unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
