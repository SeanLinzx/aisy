'use client';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/language-context';

/**
 * 录音组件：MediaRecorder 录音 → 上传 /storage/upload → 回传公网 URL。
 * 不支持的浏览器会显示提示。
 */
export function AudioRecorder({
  onUploaded,
  label = '录一段声音',
}: {
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const { tx } = useLanguage();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setPreviewUrl(URL.createObjectURL(blob));
        await upload(blob);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch (e: any) {
      setError(e?.message || tx('无法访问麦克风'));
    }
  }

  function stop() {
    recRef.current?.stop();
    setRecording(false);
  }

  async function upload(blob: Blob) {
    setUploading(true);
    try {
      const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : 'ogg';
      const form = new FormData();
      form.append('file', blob, `recording.${ext}`);
      const r = await api.post('/storage/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (r.data?.url) onUploaded(r.data.url);
    } catch (e: any) {
      setError(e?.message || tx('上传失败'));
    } finally {
      setUploading(false);
    }
  }

  if (!supported) {
    return <div className="text-xs text-slate-400">{tx('当前浏览器不支持录音（请使用 Chrome / Edge）。')}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={recording ? stop : start}
          disabled={uploading}
          className={`kid-button-sm border-2 ${
            recording ? 'bg-rose-500 text-white border-rose-500 animate-pulse' : 'bg-white text-ink-soft border-orange-200 hover:bg-orange-50'
          }`}
        >
          {recording ? tx('⏹️ 停止录音') : uploading ? tx('⏳ 上传中…') : `🎙️ ${tx(label)}`}
        </button>
        {previewUrl && !recording && <audio src={previewUrl} controls className="h-8" />}
      </div>
      {error && <div className="text-xs text-rose-600">{error}</div>}
    </div>
  );
}
