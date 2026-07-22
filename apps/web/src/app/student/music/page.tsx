'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { resolveUploadPath } from '@/lib/upload-url';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import { ExploreToolHeader } from '@/components/explore-tool-header';
import { useLanguage } from '@/contexts/language-context';

const THEME_PRESETS = [
  '开学第一天的书包',
  '和好朋友一起玩耍',
  '我的梦想是当宇航员',
  '校园里的魔法森林',
  '给爸爸妈妈的一首歌',
  '夏天去海边度假',
];

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
  assets?: Array<{ id: string }>;
}

export default function MusicPage() {
  const { tx } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [theme, setTheme] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState('Pop');
  const [mood, setMood] = useState('Dynamic/Energetic');
  const [gender, setGender] = useState('Female');
  const [timbre, setTimbre] = useState('Warm');
  const [duration, setDuration] = useState(60);
  const [lyricsBusy, setLyricsBusy] = useState(false);
  const [musicBusy, setMusicBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  const stepLabels = [tx('① 输入主题'), tx('② 生成歌曲')];

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

  async function generateLyrics() {
    if (!theme.trim()) return;
    setLyricsBusy(true);
    setError(null);
    try {
      const r = await api.post('/ai-generate/music/lyrics', {
        theme: theme.trim(),
        genre,
        mood,
      });
      setLyrics(r.data.lyrics || '');
      setStep(2);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLyricsBusy(false);
    }
  }

  async function submitMusic() {
    if (!lyrics.trim()) return;
    setMusicBusy(true);
    setError(null);
    try {
      await api.post('/ai-generate/music', {
        lyrics: lyrics.trim(),
        genre,
        mood,
        gender,
        timbre,
        duration,
        title: theme.trim() || undefined,
      });
      await loadJobs();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setMusicBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ExploreToolHeader
        title={tx('🎵 AI 作曲')}
        desc={tx('先输入主题让 AI 写歌词，再调整曲风与演唱设置，生成你的专属歌曲。完成后会自动保存到素材库。')}
      />

      <div className="flex flex-wrap gap-2">
        {stepLabels.map((label, i) => {
          const n = (i + 1) as 1 | 2;
          const active = step === n;
          const done = step > n;
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (n === 1 || lyrics.trim()) setStep(n);
              }}
              className={`rounded-full px-4 py-2 text-sm font-bold border-2 transition ${
                active
                  ? 'bg-brand text-white border-brand'
                  : done
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-ink-soft border-orange-100'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {step === 1 ? (
        <div className="kid-card space-y-4">
          <div>
            <label className="text-sm font-semibold">{tx('创作主题（必填）')}</label>
            <input
              className="kid-input mt-2"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={tx('例如：开学第一天的书包、和好朋友一起玩耍…')}
            />
            <p className="text-xs text-slate-500 mt-1">{tx('用一句话说出你想写歌的主题，AI 会帮你创作歌词。')}</p>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">{tx('🎯 主题灵感（点一下试试）')}</div>
            <div className="flex flex-wrap gap-2">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTheme(preset)}
                  className={`tag ${theme === preset ? 'tag-yellow' : ''}`}
                >
                  {tx(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <DimensionSelect label={tx('🎼 曲风（可选，影响歌词风格）')} value={genre} onChange={setGenre} options={GENRE_OPTIONS} />
            <DimensionSelect label={tx('💫 情绪（可选，影响歌词风格）')} value={mood} onChange={setMood} options={MOOD_OPTIONS} />
          </div>

          <button onClick={generateLyrics} disabled={lyricsBusy || !theme.trim()} className="kid-button-primary">
            {lyricsBusy ? tx('AI 正在写歌词…') : tx('✨ 第一步：AI 写歌词')}
          </button>

          {lyricsBusy && <AiProgress label={tx('AI 正在根据主题创作歌词…')} />}

          {lyrics.trim() ? (
            <button type="button" onClick={() => setStep(2)} className="kid-button-ghost text-sm">
              {tx('已有歌词，直接进入第二步 →')}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="kid-card space-y-4">
          {theme.trim() ? (
            <div className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm">
              <span className="font-semibold text-sky-800">{tx('创作主题')}：</span>
              <span className="text-sky-900">{theme}</span>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">{tx('歌词（可修改）')}</label>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-brand-dark/70 hover:text-brand"
              >
                {tx('← 返回改主题')}
              </button>
            </div>
            <textarea
              className="kid-textarea min-h-[180px]"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder={tx('在这里写下或修改歌词…')}
            />
            <p className="text-xs text-slate-500 mt-1">{tx('中文 5～3500 字，支持换行分段。')}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <DimensionSelect label={tx('🎼 曲风')} value={genre} onChange={setGenre} options={GENRE_OPTIONS} />
            <DimensionSelect label={tx('💫 情绪 / 强弱')} value={mood} onChange={setMood} options={MOOD_OPTIONS} />
            <DimensionSelect label={tx('🎤 演唱')} value={gender} onChange={setGender} options={GENDER_OPTIONS} />
            <DimensionSelect label={tx('🎙️ 音色')} value={timbre} onChange={setTimbre} options={TIMBRE_OPTIONS} />
            <div>
              <label className="text-sm font-semibold">{tx('⏱️ 时长（秒）')}</label>
              <select className="kid-input mt-2" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value={30}>{tx('30 秒 · 短片段')}</option>
                <option value={45}>{tx('45 秒')}</option>
                <option value={60}>{tx('60 秒 · 推荐')}</option>
                <option value={90}>{tx('90 秒')}</option>
                <option value={120}>{tx('120 秒 · 完整感')}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={submitMusic} disabled={musicBusy || !lyrics.trim()} className="kid-button-primary">
              {musicBusy ? tx('提交中…') : tx('🎵 第二步：生成音乐')}
            </button>
            <button type="button" onClick={generateLyrics} disabled={lyricsBusy || !theme.trim()} className="kid-button-ghost">
              {lyricsBusy ? tx('重写中…') : tx('🔄 重新写歌词')}
            </button>
          </div>

          {(musicBusy || jobs.some((j) => j.status === 'queued' || j.status === 'running')) && (
            <AiProgress label={tx('AI 正在作曲，可能要等一会儿…')} />
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <div className="kid-card">
        <h3 className="font-semibold mb-3">{tx('我的音乐任务')}</h3>
        {jobs.length === 0 && <div className="text-sm text-slate-500">{tx('暂时没有任务，快来创作第一首歌吧！')}</div>}
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="border border-orange-100 rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate flex-1">{j.prompt}</div>
                <StatusTag status={j.status} />
              </div>
              {j.status === 'succeeded' && j.output?.audioUrl && (
                <>
                  <audio src={resolveUploadPath(j.output.audioUrl)} controls className="mt-3 w-full" />
                  {j.assets && j.assets.length > 0 && (
                    <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                      <span>{tx('✅ 已存入素材库')}</span>
                      <Link href="/student/assets" className="font-bold text-brand shrink-0">
                        {tx('去素材库查看 →')}
                      </Link>
                    </div>
                  )}
                </>
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
  const { tx } = useLanguage();
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <select className="kid-input mt-2" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {tx(o.label)}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusTag({ status }: { status: string }) {
  const { tx } = useLanguage();
  const map: Record<string, string> = {
    queued: 'bg-slate-100 text-slate-600',
    running: 'bg-amber-100 text-amber-700',
    succeeded: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-rose-100 text-rose-700',
  };
  const label: Record<string, string> = {
    queued: tx('排队中'),
    running: tx('生成中'),
    succeeded: tx('已完成'),
    failed: tx('失败'),
  };
  return <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${map[status] || ''}`}>{label[status] || status}</span>;
}
