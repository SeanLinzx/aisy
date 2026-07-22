'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';

export interface PmChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function PmChatPanel({
  messages,
  input,
  onInputChange,
  onSend,
  busy,
  placeholder = '输入你想说的话…',
  disabled,
  embedded = false,
  emptyHint = '还没有对话，在下方输入任务后点发送 👇',
}: {
  messages: PmChatMessage[];
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  busy?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** 嵌入卡片内时使用，避免双层 kid-card 且高度随父容器约束 */
  embedded?: boolean;
  emptyHint?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  return (
    <div
      className={cn(
        'flex flex-col h-full min-h-0 overflow-hidden',
        embedded ? 'rounded-xl border-2 border-orange-100 bg-white' : 'kid-card !p-0 h-full min-h-[320px]',
      )}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <p className="text-xs text-ink-soft text-center py-6 leading-relaxed">{emptyHint}</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-brand text-white font-semibold'
                  : 'bg-orange-50 border-2 border-orange-100 text-ink'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3 py-2 text-sm bg-orange-50 border-2 border-orange-100 text-ink-soft animate-pulse">
              AI 正在思考…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0 border-t-2 border-orange-100 p-2.5 flex gap-2 bg-white">
        <input
          className="kid-input flex-1 min-w-0 !py-2 text-sm"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || busy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button
          type="button"
          className="kid-button-primary !py-2 !px-3 text-sm shrink-0"
          onClick={onSend}
          disabled={disabled || busy || !input.trim()}
        >
          发送
        </button>
      </div>
    </div>
  );
}
