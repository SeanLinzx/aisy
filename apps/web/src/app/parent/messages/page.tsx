'use client';
import { useEffect, useState } from 'react';
import { api, apiAuth, MeUser } from '@/lib/api';
import { ChatWindow } from '@/components/chat-window';
import { ConversationList } from '@/components/conversation-list';

export default function ParentMessagesPage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [active, setActive] = useState<string | undefined>();
  const [contacts, setContacts] = useState<Array<{ student: any; teachers: any[] }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiAuth.me().then(setMe);
    api.get('/messages/available-teachers').then((r) => setContacts(r.data || [])).catch(() => {});
  }, []);

  async function open(teacherId: string, studentId: string) {
    setError(null);
    try {
      const r = await api.post('/messages/conversations', { teacherId, studentId });
      setActive(r.data.id);
    } catch (e: any) { setError(e.message); }
  }

  if (!me) return <div className="text-slate-500">加载中…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">💬 与老师沟通</h1>
        <p className="text-sm text-slate-600 mt-1">和孩子的老师聊聊孩子最近的学习情况吧。</p>
      </div>
      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      <div className="grid lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-4 space-y-4">
          <ConversationList meId={me.id} meRole="parent" activeId={active} onPick={setActive} />

          <div className="kid-card !p-3">
            <div className="text-xs font-semibold text-slate-600 mb-2 px-1">联系孩子的老师</div>
            {contacts.length === 0 && <div className="text-xs text-slate-400 px-1">还没有绑定的孩子或可联系老师</div>}
            <div className="space-y-3">
              {contacts.map((c) => (
                <div key={c.student.id}>
                  <div className="text-xs text-slate-500 px-2 mb-1">关于 {c.student.displayName}</div>
                  <div className="space-y-1">
                    {c.teachers.length === 0 && <div className="text-xs text-slate-400 px-2">该班级暂未绑定老师</div>}
                    {c.teachers.map((t: any) => (
                      <button key={t.id + c.student.id} onClick={() => open(t.id, c.student.id)} className="w-full flex justify-between items-center text-left text-sm rounded-xl px-3 py-2 hover:bg-orange-50 border border-transparent hover:border-orange-100">
                        <span>👨‍🏫 {t.displayName} 老师</span>
                        <span className="text-xs text-slate-400">{t.className}</span>
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
            : <div className="kid-card text-center text-slate-500 py-20">⬅️ 在左边选择一个老师或会话开始聊天</div>}
        </section>
      </div>
    </div>
  );
}
