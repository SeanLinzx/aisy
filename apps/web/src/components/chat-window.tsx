'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface ChatPeer { id: string; displayName: string; username?: string; avatarUrl?: string }

export function ChatWindow({ conversationId, meId, peerLabel }: { conversationId: string; meId: string; peerLabel?: string }) {
  const [conv, setConv] = useState<any>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await api.get(`/messages/conversations/${conversationId}`);
      setConv(r.data);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    } catch (e: any) { setError(e.message); }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function send() {
    if (!text.trim()) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/messages/conversations/${conversationId}/messages`, { body: text });
      setText('');
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!conv) return <div className="kid-card text-ink-soft text-sm font-semibold">⏳ 加载会话中…</div>;

  const peer = peerLabel
    ? peerLabel
    : meId === conv.parentId
      ? `${conv.teacher.displayName} 老师`
      : `${conv.parent.displayName}（家长）`;

  return (
    <div className="kid-card !p-0 flex flex-col h-[70vh] overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-orange-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-pink-50">
        <div className="font-bold flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span>与 {peer} 的对话</span>
        </div>
        {conv.student && (
          <span className="tag-sky text-[11px]">关于 {conv.student.displayName}</span>
        )}
      </div>
      <div
        className="flex-1 overflow-auto px-4 py-4 space-y-3"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1.5px 1.5px, rgba(255,143,177,0.15) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          backgroundColor: 'rgba(255, 247, 237, 0.5)',
        }}
      >
        {conv.messages?.length === 0 && (
          <div className="text-center text-ink-soft text-sm font-semibold py-10">
            <div className="text-4xl mb-2">👋</div>
            还没有消息，开始聊聊吧～
          </div>
        )}
        {conv.messages?.map((m: any) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-pop`}>
              <div className={`max-w-[75%] rounded-3xl px-4 py-2.5 text-sm shadow-pop-sm ${
                mine
                  ? 'bg-gradient-to-br from-orange-400 to-brand text-white rounded-br-md'
                  : 'bg-white text-ink rounded-bl-md border-2 border-orange-100'
              }`}>
                <div className="whitespace-pre-wrap break-words leading-relaxed font-medium">{m.body}</div>
                <div className={`text-[10px] mt-1 font-semibold ${mine ? 'text-white/80' : 'text-ink-soft/70'}`}>
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t-2 border-orange-100 p-3 space-y-2 bg-white">
        {error && <div className="text-xs font-semibold text-rose-600">{error}</div>}
        <div className="flex items-end gap-2">
          <textarea
            className="kid-textarea !min-h-[48px] flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="说点什么吧…（Shift + Enter 换行）"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button onClick={send} disabled={busy || !text.trim()} className="kid-button-primary !py-3">
            {busy ? '发送中…' : '🚀 发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
