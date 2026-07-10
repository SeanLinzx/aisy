'use client';
import { useEffect, useState } from 'react';
import { api, apiAuth, MeUser } from '@/lib/api';
import { ChatWindow } from '@/components/chat-window';
import { ConversationList } from '@/components/conversation-list';

export default function TeacherMessagesPage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [active, setActive] = useState<string | undefined>();
  const [contacts, setContacts] = useState<Array<{ student: any; parents: any[]; className: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiAuth.me().then(setMe);
    api.get('/messages/available-parents').then((r) => setContacts(r.data || [])).catch(() => {});
  }, []);

  async function open(parentId: string, studentId: string) {
    setError(null);
    try {
      const r = await api.post('/messages/conversations', { parentId, studentId });
      setActive(r.data.id);
    } catch (e: any) { setError(e.message); }
  }

  if (!me) return <div className="text-slate-500">加载中…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">💬 与家长沟通</h1>
        <p className="text-sm text-slate-600 mt-1">和孩子的家长保持联系，分享孩子的成长。</p>
      </div>
      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      <div className="grid lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-4 space-y-4">
          <ConversationList meId={me.id} meRole="teacher" activeId={active} onPick={setActive} />

          <div className="kid-card !p-3">
            <div className="text-xs font-semibold text-slate-600 mb-2 px-1">学生 / 家长</div>
            {contacts.length === 0 && <div className="text-xs text-slate-400 px-1">还没有学生</div>}
            <div className="space-y-3">
              {contacts.map((c) => (
                <div key={c.student.id}>
                  <div className="text-xs text-slate-500 px-2 mb-1">{c.className} · {c.student.displayName}</div>
                  <div className="space-y-1">
                    {c.parents.length === 0 && <div className="text-xs text-slate-400 px-2">该学生暂无绑定家长</div>}
                    {c.parents.map((p: any) => (
                      <button key={p.id + c.student.id} onClick={() => open(p.id, c.student.id)} className="w-full flex justify-between text-left text-sm rounded-xl px-3 py-2 hover:bg-orange-50 border border-transparent hover:border-orange-100">
                        <span>👤 {p.displayName}</span>
                        <span className="text-xs text-slate-400">家长</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
        <section className="lg:col-span-8">
          {active
            ? <ChatWindow conversationId={active} meId={me.id} />
            : <div className="kid-card text-center text-slate-500 py-20">⬅️ 在左边选择一位家长开始对话</div>}
        </section>
      </div>
    </div>
  );
}
