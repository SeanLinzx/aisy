'use client';

import { useLanguage } from '@/contexts/language-context';
import { useEffect, useRef, useState } from 'react';
import { reportGrowth } from '@/lib/growth-report';
import { useReportGameProgress } from '@/hooks/use-report-game-progress';

interface ErrorSpot {
  id: string;
  /** 课文里被 AI 篡改的错误说法 */
  wrong: string;
  /** 对照线索卡后的正确说法 */
  correct: string;
  /** 对应线索卡里的哪个字段 */
  field: string;
  reason: string;
}

type Segment = { type: 'text'; content: string } | { type: 'error'; id: string };

interface Case {
  id: string;
  caseNo: string;
  title: string;
  intro: string;
  clue: {
    timeline: { label: string; text: string }[];
    tags: { label: string; text: string }[];
    core: { label: string; text: string };
  };
  segments: Segment[];
  errors: ErrorSpot[];
}

const CASES: Case[] = [
  {
    id: 'libai-needle',
    caseNo: '001',
    title: '被篡改的历史',
    intro: 'AI 写故事的时候，偶尔也会「记错」细节！左边是真实线索卡，右边这篇课文被悄悄改错了 4 处，对照线索卡，点一下你觉得写错的地方吧～',
    clue: {
      timeline: [
        { label: '开始', text: '小李白逃学。' },
        { label: '发展', text: '他一边玩一边走，从城里走到城外。' },
        { label: '高潮', text: '他看到一位老妇人在河边正用铁棍在石头上要磨成针。' },
        { label: '结局', text: '李白明白了功夫深事必成的道理，从此认真学习。' },
      ],
      tags: [
        { label: '时间', text: '有一天白天' },
        { label: '地点', text: '破茅屋门口' },
        { label: '人物', text: '唐代诗人李白' },
      ],
      core: { label: '核心事件', text: '李白逃学看到一个老妇人用铁杵磨针，想到学习也要坚持。' },
    },
    segments: [
      { type: 'error', id: 'time' },
      { type: 'text', content: '，' },
      { type: 'error', id: 'person' },
      { type: 'text', content: '贪玩没有去上学，在街上闲逛着，走着走着来到城外。在一个' },
      { type: 'error', id: 'place' },
      { type: 'text', content: '看到一个老婆婆，正在磨一根' },
      { type: 'error', id: 'material' },
      {
        type: 'text',
        content:
          '。他过去询问，老婆婆在做什么？老婆婆说：“我要把这根根子磨成一个绣花针。”“绣花针？”他惊讶的说：“可是，这要什么时候能磨成细细的绣花针呢？”老婆婆反问道：“滴水可穿石，愚公能移山，为什么不能磨成绣花针？只要我下的功夫比别人深，没有做不到的事情。”老婆婆的一番话，令他很惭愧，于是回去之后，每天的学习都特别用功。',
      },
    ],
    errors: [
      { id: 'time', wrong: '昨天', correct: '有一天', field: '时间', reason: '线索卡「时间」写的是「有一天白天」，不是「昨天」。' },
      { id: 'person', wrong: '杜甫', correct: '李白', field: '人物', reason: '线索卡「人物」写的是「唐代诗人李白」，故事的主角不是杜甫哦。' },
      { id: 'place', wrong: '小河边', correct: '破茅屋门口', field: '地点', reason: '线索卡「地点」写的是「破茅屋门口」，老婆婆不是在小河边磨针。' },
      { id: 'material', wrong: '木棍子', correct: '铁棍子', field: '核心事件', reason: '线索卡说的是「铁杵磨针」，老婆婆磨的是铁棍子，不是木棍子。' },
    ],
  },
];

export function ClueCardDetectiveGame() {
  const { tx } = useLanguage();
  const report = useReportGameProgress('clue-card-detective');
  const [caseIdx, setCaseIdx] = useState(0);
  const [found, setFound] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<string[]>([]);
  const [missMsg, setMissMsg] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const missTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const kase = CASES[caseIdx];
  const total = kase.errors.length;
  const foundCount = Object.keys(found).length;
  const allFound = foundCount === total;

  useEffect(() => () => clearTimeout(missTimer.current), []);

  useEffect(() => {
    if (allFound) setShowSuccessModal(true);
  }, [allFound]);

  useEffect(() => {
    if (allFound) return;
    void report({
      status: 'generating',
      roundCount: foundCount,
      summary: `已找到 ${foundCount}/${total} 处错误`,
    });
  }, [allFound, foundCount, total, report]);

  function reset() {
    setFound({});
    setNotes([]);
    setMissMsg(null);
    setShowSuccessModal(false);
    void report({
      status: 'generating',
      roundCount: 0,
      summary: `已找到 0/${total} 处错误`,
    });
  }

  function clickError(err: ErrorSpot) {
    if (found[err.id]) return;
    const nextFound = { ...found, [err.id]: true };
    setFound(nextFound);
    setNotes((n) => [...n, err.id]);
    setMissMsg(null);
    if (Object.keys(nextFound).length === total) {
      const noteLines = kase.errors.map((e) => `「${e.wrong}」→ ${e.correct}（${e.field}）`);
      void report({
        status: 'done',
        roundCount: total,
        summary: '全部找齐 🎉',
        title: `《${kase.title}》· 破案完成`,
        text: noteLines.join('\n'),
      });
      reportGrowth({
        kind: 'game',
        gameSlug: 'clue-card-detective',
        title: 'AI 线索卡大侦探',
        summary: `对照线索卡，在《${kase.title}》里找出了全部 ${total} 处被篡改的地方`,
        detail: kase.errors.map((e) => ({ field: e.field, wrong: e.wrong, correct: e.correct })),
      });
    }
  }

  function clickPlain() {
    if (allFound) return;
    clearTimeout(missTimer.current);
    setMissMsg('🤔 这里好像没问题，再对照线索卡找找看～');
    missTimer.current = setTimeout(() => setMissMsg(null), 2600);
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-yellow">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">🕵️ {kase.intro}</p>
      </div>

      <div className="grid grid-cols-[minmax(200px,2fr)_minmax(0,3fr)] gap-3 items-start">
        {/* 线索卡：左侧常驻 */}
        <div className="sticky top-4 self-start">
          <div className="kid-card border-2 border-brand/30 bg-gradient-to-b from-orange-50 to-white space-y-2.5 h-full">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🗂️</span>
              <div>
                <div className="font-extrabold text-ink leading-tight">{tx('线索卡')}</div>
                <div className="text-[10px] text-ink-soft">案件编号 · {kase.caseNo}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-brand-dark mb-1.5">{tx('事件（开始 → 发展 → 高潮 → 结局）')}</div>
              <ol className="space-y-1.5">
                {kase.clue.timeline.map((t) => (
                  <li key={t.label} className="text-xs leading-relaxed bg-white/80 rounded-lg px-2 py-1.5 border border-orange-100">
                    <span className="font-bold text-orange-600">{t.label}：</span>
                    {t.text}
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {kase.clue.tags.map((f) => (
                <div key={f.label} className="text-xs bg-white/80 rounded-lg px-2 py-1.5 border border-orange-100 flex gap-1.5">
                  <span className="font-bold text-orange-600 shrink-0">{f.label}：</span>
                  <span className="leading-relaxed">{f.text}</span>
                </div>
              ))}
            </div>

            <div className="text-xs bg-emerald-50 rounded-lg px-2 py-1.5 border border-emerald-200">
              <div className="font-bold text-emerald-700">{kase.clue.core.label}</div>
              <div className="leading-relaxed mt-0.5">{kase.clue.core.text}</div>
            </div>
          </div>
        </div>

        {/* 待纠错课文：右侧 */}
        <div className="kid-card space-y-3 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-extrabold text-ink flex items-center gap-2">
              <span>📜</span>《{kase.title}》
            </h3>
            <span className={`tag ${allFound ? 'tag-mint' : ''}`}>找到 {foundCount}/{total} 处错误</span>
          </div>

          <p className="text-[15px] leading-[2.15] text-slate-800" onClick={clickPlain}>
            {kase.segments.map((seg, i) => {
              if (seg.type === 'text') return <span key={i}>{seg.content}</span>;
              const err = kase.errors.find((e) => e.id === seg.id)!;
              const isFound = !!found[err.id];
              if (isFound) {
                return (
                  <span key={i} className="inline-flex items-center gap-1 mx-0.5 align-middle">
                    <span className="line-through text-rose-400">{err.wrong}</span>
                    <span className="text-emerald-600 font-extrabold">{err.correct}</span>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5">
                      ✓ {err.field}
                    </span>
                  </span>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clickError(err);
                  }}
                  className="inline rounded px-0.5 font-semibold text-slate-800 hover:bg-amber-100 active:bg-amber-200 transition"
                >
                  {err.wrong}
                </button>
              );
            })}
          </p>

          {missMsg && (
            <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {missMsg}
            </div>
          )}
        </div>
      </div>

      {notes.length > 0 && (
        <div className="kid-card-sky space-y-2">
          <div className="font-extrabold text-sm text-ink flex items-center gap-1.5">{tx('🔍 侦探笔记')}</div>
          <div className="space-y-1.5">
            {notes.map((id) => {
              const err = kase.errors.find((e) => e.id === id)!;
              return (
                <div key={id} className="text-xs leading-relaxed bg-white/80 rounded-lg px-2.5 py-1.5 border border-sky-100">
                  <b className="text-sky-700">「{err.wrong}」是错的 →</b> {err.reason}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowSuccessModal(false)}
        >
          <div className="kid-card-mint max-w-md w-full space-y-3 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl">🎉</div>
            <div className="font-extrabold text-lg">结案啦！你把《{kase.title}》里被篡改的 {total} 处全部找出来了！</div>
            <p className="text-sm text-ink-soft leading-relaxed">
              连 AI 写的故事也可能记错时间、人物、地点这些细节——这也是为什么我们自己动手用 AI 写文字时，要记得核对关键信息哦！
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="kid-button-primary flex-1"
              >
                ✨ 太棒啦
              </button>
              <button type="button" onClick={reset} className="kid-button-ghost flex-1">
                🔄 重来一次
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
