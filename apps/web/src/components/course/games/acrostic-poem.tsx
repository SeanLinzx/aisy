'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { AiWarning } from '@/components/ai-warning';
import { AiProgress } from '@/components/course/ai-progress';
import {
  buildAcrosticPrompt,
  parseAcrosticHeads,
  parseAcrosticResponse,
} from '@/lib/story-course';
import { reportGrowth } from '@/lib/growth-report';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';
import { useLanguage } from '@/contexts/language-context';

const EXAMPLE_HEADS = ['人工智能', '春眠不觉', '好好学习'];
const EXAMPLE_THEMES = [
  '赞美 AI 帮助学习，充满好奇与梦想',
  '描写春天醒来时的美好与生机',
  '鼓励自己认真读书、天天向上',
];

export function AcrosticPoemGame() {
  const { tx } = useLanguage();
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
      setError(tx('请至少输入 2 个藏头字（每个字对应一句诗的首字）。'));
      return;
    }
    if (headChars.length > 8) {
      setError(tx('藏头字最多 8 个，不然诗会太长啦！'));
      return;
    }
    if (!theme.trim()) {
      setError(tx('请说明一下这首诗想表达什么。'));
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
      const msg = e?.message || tx('生成藏头诗失败');
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
    <div className="space-y-3">
      <div className="kid-card-yellow">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🎋 {tx('输入一串')}<strong>{tx('藏头字')}</strong>
          {tx('（每个字会成为一句诗的开头），再告诉 AI 你想表达什么，它就会帮你写一首带诗题的藏头诗！')}
        </p>
      </div>

      <div className="grid grid-cols-[minmax(240px,2fr)_minmax(0,3fr)] gap-3 items-start">
        <div className="sticky top-4 self-start space-y-3">
          <div className="kid-card space-y-3">
            <div>
              <label className="text-sm font-bold">{tx('藏头字')}</label>
              <p className="text-xs text-ink-soft mt-0.5">{tx('连续输入，如「新年快乐」= 四句分别以新、年、快、乐开头')}</p>
              <input
                className="kid-input mt-1.5 text-lg tracking-widest"
                value={heads}
                onChange={(e) => setHeads(e.target.value)}
                placeholder="例如：人工智能"
                maxLength={16}
              />
              {headChars.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {headChars.map((c, i) => (
                    <span
                      key={`${c}-${i}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-xs font-extrabold"
                    >
                      <span className="text-ink-soft font-bold">{tx('第句')}{i + 1}</span>
                      <span className="text-lg text-brand">{c}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-bold">{tx('创作意向')}</label>
              <p className="text-xs text-ink-soft mt-0.5">{tx('祝福、写景、励志……')}</p>
              <textarea
                className="kid-textarea !min-h-[72px] mt-1.5 text-sm"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="例如：赞美老师，好玩又有趣"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs font-bold text-ink-soft self-center">{tx('例子：')}</span>
              {EXAMPLE_HEADS.map((_, i) => (
                <button key={i} type="button" onClick={() => applyExample(i)} className="kid-button-sm bg-white border-amber-200 text-xs">
                  {tx(EXAMPLE_HEADS[i])}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => void generatePoem()} disabled={loading} className="kid-button-primary w-full">
            {loading ? tx('AI 正在写诗…') : tx('🎋 生成藏头诗')}
          </button>
        </div>

        <div className="min-w-0 space-y-3">
          {loading && <AiProgress label={tx('AI 正在按藏头字创作诗歌…')} />}
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>
          )}

          {poem ? (
            <div className="kid-card-mint space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-lg">{poemTitle || tx('📜 你的藏头诗')}</h3>
                  {poemTitle && <p className="text-xs text-ink-soft font-semibold mt-0.5">{tx('AI 为你起的诗题')}</p>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {headChars.map((c, i) => (
                    <span key={`${c}-tag-${i}`} className="text-xs font-bold bg-white/80 border border-emerald-200 rounded-lg px-2 py-0.5">
                      {c}…
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-white/70 border-2 border-emerald-100 px-4 py-4">
                <p className="text-base font-bold leading-loose tracking-wide whitespace-pre-wrap text-ink">
                  {poem}
                </p>
              </div>
              {saved && <p className="text-xs font-bold text-emerald-700">{tx('✅ 已保存到素材库')}</p>}
              <AiWarning />
            </div>
          ) : !loading && !error ? (
            <div className="kid-card border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center min-h-[200px] px-4 py-8">
              <span className="text-4xl mb-2">🎋</span>
              <p className="text-sm font-bold text-ink-soft">{tx('在左侧填好藏头字和创作意向')}</p>
              <p className="text-xs text-ink-soft mt-1">{tx('点击「生成藏头诗」，诗歌会出现在这里')}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
