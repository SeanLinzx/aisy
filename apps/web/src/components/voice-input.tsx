'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Browser-only voice prompt input. Uses webkitSpeechRecognition where available.
 * On unsupported browsers it just hides itself.
 */
export function VoiceInputButton({ onResult }: { onResult: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = 'zh-CN';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (ev: any) => {
        const text = ev.results?.[0]?.[0]?.transcript || '';
        if (text) onResult(text);
      };
      rec.onend = () => setRecording(false);
      rec.onerror = () => setRecording(false);
      recRef.current = rec;
      setSupported(true);
    }
  }, [onResult]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (!recRef.current) return;
        if (recording) recRef.current.stop();
        else { recRef.current.start(); setRecording(true); }
      }}
      className={`kid-button-sm border-2 transition-all ${
        recording
          ? 'bg-rose-500 text-white border-rose-500 shadow-pop-pink animate-pulse'
          : 'bg-white text-ink-soft border-orange-200 hover:bg-orange-50 hover:-translate-y-0.5'
      }`}
    >
      {recording ? <>🎤 正在听…（点击停止）</> : <>🎤 语音输入</>}
    </button>
  );
}
