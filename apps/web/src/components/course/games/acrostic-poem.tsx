'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { AiProgress } from '@/components/course/ai-progress';
import {
  buildAcrosticPrompt,
  parseAcrosticHeads,
  parseAcrosticResponse,
} from '@/lib/story-course';
import { reportGrowth } from '@/lib/growth-report';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';

const EXAMPLE_HEADS = ['人工智能', '春眠不觉', '好好学习'];
const EXAMPLE_THEMES = [
  '赞美 AI 帮助学习，充满好奇与梦想',
  '描写春天醒来时的美好与生机',
  '鼓励自己认真读书、天天向上',
];

export function AcrosticPoemGame() {
  const [heads, setHeads] = useState('人工智能');
  const [theme, setTheme] = useState('赞美 AI 帮助学习，充满好奇与梦想');
  const [poemTitle, setPoemTitle] = useState('');
  const [poem, setPoem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const report = useReportGameProgress('acrostic-poem');

  const headChars = useMemo(() => parseAcrosticHeads(heads), [heads]);

  async function generatePoem() {
    if (headChars.length < 2) {
      setError('请至少输入 2 个藏头字（每个字对应一句诗的首字）。');
      return;
    }
    if (headChars.length > 8) {
      setError('藏头字最多 8 个，不然诗会太长啦！');
      return;
    }
    if (!theme.trim()) {
      setError('请说明一下这首诗想表达什么。');
      return;
    }

    setLoading(true);
    setError(null);
    setPoem('');
    setPoemTitle('');
    setSaved(false);
    await report({
      status: 'generating',
      prompt: `藏头：${headChars.join('')} · ${theme.trim()}`,
    });

    try {
      const prompt = buildAcrosticPrompt(heads, theme);
      const r = await api.post('/ai-generate/text', {
        prompt,
        title: `藏头诗·${heads.replace(/\s/g, '')}`,
        saveAsAsset: true,
      });
      const raw = (r.data?.text || '').trim();
      const parsed = parseAcrosticResponse(raw, headChars);
      const displayTitle = parsed.title.startsWith('《') ? parsed.title : `《${parsed.title}》`;

      setPoemTitle(displayTitle);
      setPoem(parsed.poem);
      setSaved(!!r.data?.asset);

      await report({
        status: 'done',
        title: displayTitle,
        text: parsed.poem,
        prompt: `藏头：${headChars.join('')} · ${theme.trim()}`,
        summary: displayTitle,
      });

      reportGrowth({
        kind: 'creation',
        gameSlug: 'acrostic-poem',
        title: `🎋 ${displayTitle}`,
        summary: `藏头：${headChars.join('')}\n意向：${theme.trim()}\n\n${parsed.poem}`,
      });
    } catch (e: any) {
      const msg = e?.message || '生成藏头诗失败';
      setError(msg);
      await report({ status: 'failed', error: msg });
    } finally {
      setLoading(false);
    }
  }

  function applyExample(i: number) {
    setHeads(EXAMPLE_HEADS[i] ?? EXAMPLE_HEADS[0]);
    setTheme(EXAMPLE_THEMES[i] ?? EXAMPLE_THEMES[0]);
    setPoem('');
    setPoemTitle('');
    setError(null);
  }

  return (
    <div className="space-y-5">
      <div className="kid-card-yellow">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🎋 输入一串<strong>藏头字</strong>（每个字会成为一句诗的开头），再告诉 AI 你想表达什么，它就会帮你写一首带诗题的藏头诗！
        </p>
      </div>

      <div className="kid-card space-y-4">
        <div>
          <label className="text-sm font-bold">藏头字</label>
          <p className="text-xs text-ink-soft mt-1">连续输入即可，例如「新年快乐」= 四句诗分别以新、年、快、乐开头</p>
          <input
            className="kid-input mt-2 text-lg tracking-widest"
            value={heads}
            onChange={(e) => setHeads(e.target.value)}
            placeholder="例如：人工智能"
            maxLength={16}
          />
          {headChars.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {headChars.map((c, i) => (
                <span
                  key={`${c}-${i}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-50 border-2 border-amber-200 px-3 py-1.5 text-sm font-extrabold"
                >
                  <span className="text-ink-soft text-xs font-bold">第 {i + 1} 句</span>
                  <span className="text-xl text-brand">{c}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-sm font-bold">创作意向</label>
            <VoiceInputButton onResult={(t) => setTheme((prev) => (prev ? `${prev} ${t}` : t))} />
          </div>
          <p className="text-xs text-ink-soft mt-1">这首诗想表达什么？可以是祝福、写景、励志……</p>
          <textarea
            className="kid-textarea !min-h-[88px] mt-2 text-sm"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="例如：祝福老师和同学在新的一年里学习进步、天天开心"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-ink-soft self-center">试试例子：</span>
          {EXAMPLE_HEADS.map((_, i) => (
            <button key={i} type="button" onClick={() => applyExample(i)} className="kid-button-sm bg-white border-amber-200 text-xs">
              {EXAMPLE_HEADS[i]}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => void generatePoem()} disabled={loading} className="kid-button-primary">
        {loading ? 'AI 正在写诗…' : '🎋 生成藏头诗'}
      </button>

      {loading && <AiProgress label="AI 正在按藏头字创作诗歌…" />}
      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
      )}

      {poem && (
        <div className="kid-card-mint space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-lg text-center md:text-left">
                {poemTitle || '📜 你的藏头诗'}
              </h3>
              {poemTitle && <p className="text-xs text-ink-soft font-semibold mt-0.5">AI 为你起的诗题</p>}
            </div>
            <div className="flex flex-wrap gap-1">
              {headChars.map((c, i) => (
                <span key={`${c}-tag-${i}`} className="text-xs font-bold bg-white/80 border border-emerald-200 rounded-lg px-2 py-0.5">
                  {c}…
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 border-2 border-emerald-100 px-5 py-6">
            <p className="text-center text-lg md:text-xl font-bold leading-loose tracking-wide whitespace-pre-wrap text-ink">
              {poem}
            </p>
          </div>
          {saved && <p className="text-xs font-bold text-emerald-700">✅ 已保存到素材库</p>}
          <AiWarning />
        </div>
      )}
    </div>
  );
}
