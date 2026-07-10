'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { AiProgress } from '@/components/course/ai-progress';
import { ExploreToolHeader } from '@/components/explore-tool-header';

const DEFAULT_LYRICS = `清晨阳光照进窗
书包装满小梦想
哼着歌儿走路上
今天也要元气满满
`;

const GENRE_OPTIONS = [
  { value: 'Pop', label: '流行 Pop' },
  { value: 'Folk', label: '民谣 Folk' },
  { value: 'Chinese Style', label: '国风 Chinese Style' },
  { value: 'Rock', label: '摇滚 Rock' },
  { value: 'Electronic', label: '电子 Electronic' },
  { value: 'Jazz', label: '爵士 Jazz' },
  { value: 'GuFeng Music', label: '古风 GuFeng' },
];

const MOOD_OPTIONS = [
  { value: 'Happy', label: '快乐 Happy' },
  { value: 'Dynamic/Energetic', label: '活力 Dynamic' },
  { value: 'Calm/Relaxing', label: '舒缓 Calm' },
  { value: 'Romantic', label: '浪漫 Romantic' },
  { value: 'Inspirational/Hopeful', label: '励志 Inspirational' },
  { value: 'Dreamy/Ethereal', label: '梦幻 Dreamy' },
  { value: 'Groovy/Funky', label: '律动 Groovy' },
];

const GENDER_OPTIONS = [
  { value: 'Female', label: '女声' },
  { value: 'Male', label: '男声' },
];

const TIMBRE_OPTIONS = [
  { value: 'Warm', label: '温暖 Warm' },
  { value: 'Bright', label: '明亮 Bright' },
  { value: 'Sweet_AUDIO_TIMBRE', label: '甜美 Sweet' },
  { value: 'Cute_AUDIO_TIMBRE', label: '可爱 Cute' },
  { value: 'Powerful', label: '有力 Powerful' },
  { value: 'Husky', label: '沙哑 Husky' },
];

interface Job {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  output?: { audioUrl?: string };
  error?: string;
  prompt: string;
}

export default function MusicPage() {
  const [lyrics, setLyrics] = useState(DEFAULT_LYRICS);
  const [genre, setGenre] = useState('Pop');
  const [mood, setMood] = useState('Dynamic/Energetic');
  const [gender, setGender] = useState('Female');
  const [timbre, setTimbre] = useState('Warm');
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  async function loadJobs() {
    try {
      const r = await api.get('/ai-generate/jobs', { params: { type: 'music' } });
      setJobs(r.data || []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadJobs();
    const t = setInterval(loadJobs, 4000);
    return () => clearInterval(t);
  }, []);

  async function submit() {
    if (!lyrics.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/ai-generate/music', {
        lyrics: lyrics.trim(),
        genre,
        mood,
        gender,
        timbre,
        duration,
      });
      await loadJobs();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <ExploreToolHeader
        title="🎵 AI 作曲"
        desc="输入歌词，调整曲风、情绪、演唱、音色和时长，让豆包为你生成一段专属音乐。"
      />

      <div className="kid-card space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold">歌词（必填）</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLyrics(DEFAULT_LYRICS)}
                className="text-xs font-bold text-brand-dark/70 hover:text-brand"
              >
                恢复案例模板
              </button>
              <VoiceInputButton onResult={(t) => setLyrics((p) => (p ? `${p}\n${t}` : t))} />
            </div>
          </div>
          <textarea
            className="kid-textarea min-h-[140px]"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="在这里写下你的歌词…"
          />
          <p className="text-xs text-slate-500 mt-1">中文 5～700 字，支持换行分段。</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <DimensionSelect label="🎼 曲风" value={genre} onChange={setGenre} options={GENRE_OPTIONS} />
          <DimensionSelect label="💫 情绪 / 强弱" value={mood} onChange={setMood} options={MOOD_OPTIONS} />
          <DimensionSelect label="🎤 演唱" value={gender} onChange={setGender} options={GENDER_OPTIONS} />
          <DimensionSelect label="🎙️ 音色" value={timbre} onChange={setTimbre} options={TIMBRE_OPTIONS} />
          <div>
            <label className="text-sm font-semibold">⏱️ 时长（秒）</label>
            <select className="kid-input mt-2" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={30}>30 秒 · 短片段</option>
              <option value={45}>45 秒</option>
              <option value={60}>60 秒 · 推荐</option>
              <option value={90}>90 秒</option>
              <option value={120}>120 秒 · 完整感</option>
            </select>
          </div>
        </div>

        <button onClick={submit} disabled={busy} className="kid-button-primary">
          {busy ? '提交中…' : '🎵 生成音乐'}
        </button>

        {error && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <div className="kid-card">
        <h3 className="font-semibold mb-3">我的音乐任务</h3>
        {(busy || jobs.some((j) => j.status === 'queued' || j.status === 'running')) && (
          <div className="mb-3">
            <AiProgress label="AI 正在作曲，可能要等一会儿…" />
          </div>
        )}
        {jobs.length === 0 && <div className="text-sm text-slate-500">暂时没有任务，快来创作第一首歌吧！</div>}
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="border border-orange-100 rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate flex-1">{j.prompt}</div>
                <StatusTag status={j.status} />
              </div>
              {j.status === 'succeeded' && j.output?.audioUrl && (
                <audio
                  src={resolveUploadPath(j.output.audioUrl)}
                  controls
                  className="mt-3 w-full"
                />
              )}
              {j.status === 'failed' && <div className="text-xs text-rose-600 mt-2">{j.error}</div>}
            </div>
          ))}
        </div>
        {jobs.length > 0 && (
          <div className="mt-4">
            <AiWarning />
          </div>
        )}
      </div>
    </div>
  );
}

function DimensionSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <select className="kid-input mt-2" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: 'bg-slate-100 text-slate-600',
    running: 'bg-amber-100 text-amber-700',
    succeeded: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-rose-100 text-rose-700',
  };
  const label: Record<string, string> = {
    queued: '排队中',
    running: '生成中',
    succeeded: '已完成',
    failed: '失败',
  };
  return <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${map[status] || ''}`}>{label[status] || status}</span>;
}
