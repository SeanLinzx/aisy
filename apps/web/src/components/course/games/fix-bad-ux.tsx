'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { persistWebAsset } from '@/lib/persist-web-asset';
import { AiWarning } from '@/components/ai-warning';
import { VoiceInputButton } from '@/components/voice-input';
import { HtmlPreview } from '@/components/course/html-preview';
import { AiProgress } from '@/components/course/ai-progress';

interface BadCase {
  id: string;
  title: string;
  task: string;
  html: string;
}

// 页面内反馈 + 任务完成通知父页面的公共脚本（沙箱里 alert 会被拦截，所以用页面内提示）。
const FEEDBACK_SNIPPET = `
<div id="__fb" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.9);opacity:0;transition:.2s;background:#fff;border-radius:16px;padding:20px 26px;box-shadow:0 16px 50px rgba(0,0,0,.22);text-align:center;z-index:9999;min-width:200px;pointer-events:none;font-family:system-ui"></div>
<script>
function __feedback(emoji,msg,color){var d=document.getElementById('__fb');d.innerHTML='<div style="font-size:44px">'+emoji+'</div><div style="margin-top:8px;font-weight:800;font-size:16px;color:'+color+'">'+msg+'</div>';d.style.opacity=1;d.style.transform='translate(-50%,-50%) scale(1)';clearTimeout(window.__ft);window.__ft=setTimeout(function(){d.style.opacity=0;d.style.transform='translate(-50%,-50%) scale(.9)';},1900);}
function __taskDone(){try{parent.postMessage({type:'ux-task-done'},'*');}catch(e){}}
</script>`;

const CASES: BadCase[] = [
  {
    id: 'sticker',
    title: '领贴纸奖励',
    task: '今天表现很好，请试着「领取今日贴纸」。是不是很难找？',
    html: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;background:#fef9c3;padding:24px}.top{position:relative;height:36px}.claim{position:absolute;right:0;top:0;font-size:12px;color:#d1d5db;text-decoration:underline;cursor:pointer;padding:4px 8px;line-height:1.2}.card{max-width:480px;margin:20px auto;background:#fff;border-radius:16px;padding:24px;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,.06)}h1{color:#ca8a04}.big{display:block;width:100%;margin-top:16px;padding:18px;font-size:20px;font-weight:800;color:#fff;background:#f97316;border:none;border-radius:14px;cursor:pointer}</style></head><body><div class="top"><span class="claim" onclick="__feedback('✅','点对了！贴纸到手啦～这个按钮藏得太隐蔽了','#16a34a');__taskDone()">领取今日贴纸</span></div><div class="card"><h1>⭐ 今日奖励</h1><p>完成 3 项任务，可以领 1 张贴纸哦！</p><button class="big" onclick="__feedback('❌','点错啦！这个大按钮其实是「再买贴纸套装」','#dc2626')">再买一套贴纸</button></div>${FEEDBACK_SNIPPET}</body></html>`,
  },
  {
    id: 'game-level',
    title: '选游戏关卡',
    task: '你想「开始第 3 关」，能找到正确的按钮吗？',
    html: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;background:#eff6ff;padding:24px;display:flex;justify-content:center}.card{background:#fff;border-radius:16px;padding:24px;max-width:440px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,.1);text-align:center}h2{margin:0 0 8px;color:#2563eb}.sub{color:#64748b;margin-bottom:20px}.ad{display:block;width:100%;padding:18px;font-size:20px;font-weight:800;color:#fff;background:#f97316;border:none;border-radius:14px;cursor:pointer;margin-bottom:12px}.start{font-size:11px;color:#cbd5e1;background:transparent;border:none;text-decoration:underline;cursor:pointer}</style></head><body><div class="card"><h2>🎮 超级跑酷 · 第 3 关</h2><p class="sub">准备好挑战新关卡了吗？</p><button class="ad" onclick="__feedback('❌','点错啦！要先看 30 秒广告才能玩','#dc2626')">看 30 秒广告再玩</button><button class="start" onclick="__feedback('✅','点对了！第 3 关开始～','#16a34a');__taskDone()">开始第 3 关</button></div>${FEEDBACK_SNIPPET}</body></html>`,
  },
  {
    id: 'save-drawing',
    title: '保存画画',
    task: '你画了一幅画，请「保存作品」。小心别点错按钮！',
    html: `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>body{font-family:system-ui;margin:0;background:#fdf4ff;padding:24px;display:flex;justify-content:center}.dialog{background:#fff;border-radius:16px;padding:24px;max-width:420px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,.1)}h2{margin:0 0 8px;color:#9333ea}p{color:#64748b}.row{display:flex;gap:12px;margin-top:20px}.danger{flex:1;padding:14px;font-size:17px;font-weight:800;color:#fff;background:#dc2626;border:none;border-radius:12px;cursor:pointer}.ghost{flex:1;padding:14px;font-size:13px;color:#cbd5e1;background:#fff;border:1px solid #f1f5f9;border-radius:12px;cursor:pointer}</style></head><body><div class="dialog"><h2>🎨 要离开了吗？</h2><p>你的小恐龙还没保存呢。</p><div class="row"><button class="danger" onclick="__feedback('❌','点错啦！😭 你的画被删掉了','#dc2626')">不保存，全部删掉</button><button class="ghost" onclick="__feedback('✅','点对了！保存成功 🎉','#16a34a');__taskDone()">保存作品</button></div></div>${FEEDBACK_SNIPPET}</body></html>`,
  },
];

const STARS = [1, 2, 3, 4, 5];

export function FixBadUxGame() {
  const [idx, setIdx] = useState(0);
  const [rating, setRating] = useState(0);
  const [suggestion, setSuggestion] = useState('');
  const [improved, setImproved] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const cur = CASES[idx];

  const idxRef = useRef(0);
  const jumpingRef = useRef(false);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  function switchCase(i: number) {
    setIdx(i);
    setRating(0);
    setSuggestion('');
    setImproved('');
    setError(null);
    setSaved(false);
    setPageUrl(null);
  }

  // 监听坏页面 iframe 发来的「任务完成」消息 → 自动跳到下一题
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e?.data?.type !== 'ux-task-done') return;
      if (jumpingRef.current) return;
      jumpingRef.current = true;
      const i = idxRef.current;
      if (i < CASES.length - 1) {
        setFlash('🎉 这一关体验完成！正在进入下一题…');
        setTimeout(() => {
          switchCase(i + 1);
          setFlash(null);
          jumpingRef.current = false;
        }, 1400);
      } else {
        setFlash('🎉 全部体验完成！想一想：好的页面应该让正确的操作最容易找到。');
        setTimeout(() => { setFlash(null); jumpingRef.current = false; }, 2200);
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  async function improve() {
    if (!suggestion.trim()) {
      setError('先写下你的修改意见，AI 才知道怎么改。');
      return;
    }
    setBusy(true);
    setError(null);
    setImproved('');
    try {
      const prompt = `下面是一个网页的 HTML，它的交互体验设计得很糟糕（故意为难用户）。请根据一位小学生的修改意见，把它改成好用、清晰、对用户友好的版本，输出改进后的完整单文件 HTML（含内联 CSS/JS），不要使用外部资源，只输出 HTML 代码。

【任务场景】${cur.task}
【小学生的修改意见】${suggestion.trim()}

【原始 HTML】
${cur.html}`;
      const r = await api.post('/ai-generate/web', { prompt, interactive: true }, { timeout: 180_000 });
      let out = r.data.html || '';
      if (r.data.css) out = out.replace(/<\/head>/i, `<style>${r.data.css}</style></head>`);
      if (r.data.js) out = out.replace(/<\/body>/i, `<script>${r.data.js}<\/script></body>`);
      setImproved(out);
      try {
        const title = `交互优化：${cur.title}`;
        const result = await persistWebAsset({
          title,
          html: out,
          summary: suggestion.trim().slice(0, 80) || cur.task,
          prompt: suggestion.trim(),
          description: '课程 · 垃圾交互优化',
          projectId,
          assetId,
          meta: {
            kind: 'ux-improvement',
            caseId: cur.id,
            caseTitle: cur.title,
            rating,
            suggestion: suggestion.trim(),
            sourceGame: 'fix-bad-ux',
          },
        });
        setProjectId(result.projectId);
        setAssetId(result.assetId);
        setPageUrl(result.url);
        setSaved(true);
      } catch (saveErr: unknown) {
        setError((saveErr as Error)?.message || '页面已生成，但自动保存到素材库失败');
      }
    } catch (e: any) {
      setError(e?.message || '生成失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-purple">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          🛠️ 有些页面故意做得很难用！先自己试着完成任务（点点看会有反应），再给它打分、写下修改意见，让 AI 帮你把它改好。完成一关会自动进入下一关。输入框旁可点 🎤 语音输入。
        </p>
      </div>

      {flash && (
        <div className="kid-card-mint text-center font-extrabold animate-pop">{flash}</div>
      )}

      <div className="flex gap-2 flex-wrap">
        {CASES.map((c, i) => (
          <button key={c.id} onClick={() => switchCase(i)} className={`kid-button-sm border-2 ${i === idx ? 'bg-brand text-white border-brand' : 'bg-white text-ink-soft border-orange-200'}`}>
            第{i + 1}题 · {c.title}
          </button>
        ))}
      </div>

      <div className="kid-card space-y-2">
        <div className="text-sm font-bold">😖 任务：{cur.task}</div>
        <HtmlPreview key={cur.id} html={cur.html} height={500} />
      </div>

      <div className="kid-card space-y-3">
        <div>
          <div className="text-sm font-bold mb-1">⭐ 这个页面好用吗？给它打个分</div>
          <div className="flex gap-1">
            {STARS.map((s) => (
              <button key={s} onClick={() => setRating(s)} className={`text-2xl ${s <= rating ? '' : 'opacity-30'}`}>⭐</button>
            ))}
            {rating > 0 && <span className="text-sm text-ink-soft self-center ml-2">{rating <= 2 ? '太难用了！' : rating <= 3 ? '一般般' : '还不错'}</span>}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-bold">✏️ 你的修改意见</label>
            <VoiceInputButton onResult={(t) => setSuggestion((p) => (p ? p + ' ' : '') + t)} />
          </div>
          <textarea className="kid-textarea !min-h-[80px]" value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder="例如：把「领取贴纸」做成又大又清楚的按钮，放在中间；不要把「全部删掉」做成最显眼的红色。" />
        </div>
        <button onClick={improve} disabled={busy} className="kid-button-primary">{busy ? '🛠️ AI 正在改…' : '🪄 让 AI 帮我改好'}</button>
        {busy && <AiProgress label="AI 正在改进这个页面…" />}
        {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
      </div>

      {improved && (
        <div className="kid-card space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-bold">✨ AI 改进后的版本（点点看是不是好用多了）</div>
            {saved && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                ✅ 已自动保存到素材库 · 网页
              </span>
            )}
          </div>
          {saved && pageUrl && (
            <div className="flex flex-wrap gap-3 text-xs">
              <Link href={pageUrl} target="_blank" className="text-brand font-bold">
                🌐 打开网页
              </Link>
              <Link href="/student/assets" className="text-violet-600 font-bold">
                📦 素材库查看
              </Link>
            </div>
          )}
          <HtmlPreview html={improved} height={520} interactive />
          <AiWarning />
        </div>
      )}
    </div>
  );
}
