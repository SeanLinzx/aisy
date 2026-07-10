'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { HtmlPreview } from '@/components/course/html-preview';

type CancelSubEvent = 'page1_wrong' | 'page1_correct' | 'page2_wrong' | 'page2_correct';

interface CancelSubSession {
  id: string;
  active: boolean;
  createdAt: number;
}

const FEEDBACK = `
<div id="__fb" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) scale(.9);opacity:0;transition:.2s;background:#fff;border-radius:16px;padding:20px 26px;box-shadow:0 16px 50px rgba(0,0,0,.22);text-align:center;z-index:9999;min-width:200px;pointer-events:none;font-family:system-ui"></div>
<script>
function __feedback(emoji,msg,color){var d=document.getElementById('__fb');d.innerHTML='<div style="font-size:44px">'+emoji+'</div><div style="margin-top:8px;font-weight:800;font-size:16px;color:'+color+'">'+msg+'</div>';d.style.opacity=1;d.style.transform='translate(-50%,-50%) scale(1)';clearTimeout(window.__ft);window.__ft=setTimeout(function(){d.style.opacity=0;d.style.transform='translate(-50%,-50%) scale(.9)';},1900);}
function __emit(ev){try{parent.postMessage({type:'cancel-sub-event',event:ev},'*');}catch(e){}}
</script>`;

const PAGE1_HTML = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui;background:linear-gradient(160deg,#1a1208,#3d2e0a);min-height:100vh;padding:20px;color:#fff}
.badge{display:inline-block;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#78350f;font-weight:900;font-size:13px;padding:6px 14px;border-radius:999px;margin-bottom:12px}
.card{max-width:440px;margin:0 auto;background:linear-gradient(145deg,#fef3c7,#fde68a);border-radius:20px;padding:28px 24px;color:#78350f;box-shadow:0 20px 60px rgba(0,0,0,.35);text-align:center}
.crown{font-size:56px;line-height:1;margin-bottom:8px}
h1{margin:0 0 6px;font-size:22px;color:#92400e}
.sub{font-size:13px;color:#b45309;margin-bottom:20px;line-height:1.5}
.perks{text-align:left;background:rgba(255,255,255,.55);border-radius:14px;padding:14px 16px;margin-bottom:22px;font-size:13px;line-height:1.8}
.renew{display:block;width:100%;padding:18px;font-size:20px;font-weight:900;color:#fff;background:linear-gradient(135deg,#ef4444,#f97316);border:none;border-radius:14px;cursor:pointer;box-shadow:0 8px 24px rgba(239,68,68,.45);margin-bottom:14px}
.cancel{font-size:11px;color:#d6d3d1;background:transparent;border:none;text-decoration:underline;cursor:pointer;padding:4px}
.hint{font-size:10px;color:#d97706;margin-top:16px;opacity:.7}
</style></head><body>
<div class="card">
  <div class="badge">👑 黄金会员</div>
  <div class="crown">👑</div>
  <h1>黄金会员 · 自动续费管理</h1>
  <p class="sub">您的黄金会员将于 3 天后自动续费 ¥198/年</p>
  <div class="perks">✨ 专属贴纸 · 🎮 无限关卡 · 🎁 每日礼包 · 📺 免广告</div>
  <button class="renew" onclick="__feedback('❌','点错啦！这是续费按钮，不是取消','#dc2626');__emit('page1_wrong')">🔥 立即续费 · 享 8 折特惠</button>
  <button class="cancel" onclick="__feedback('✅','找对啦！进入确认步骤…','#16a34a');__emit('page1_correct')">取消续费</button>
  <p class="hint">会员到期后将失去全部特权</p>
</div>
${FEEDBACK}</body></html>`;

const PAGE2_HTML = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui;background:rgba(0,0,0,.55);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.5)}
.dialog{position:relative;max-width:380px;width:100%;background:#fff;border-radius:20px;padding:28px 24px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.3)}
.icon{font-size:48px;margin-bottom:8px}
h2{margin:0 0 8px;font-size:20px;color:#1e293b}
p{color:#64748b;font-size:14px;line-height:1.6;margin-bottom:24px}
.keep{display:block;width:100%;padding:16px;font-size:18px;font-weight:900;color:#fff;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:14px;cursor:pointer;margin-bottom:12px;box-shadow:0 6px 20px rgba(34,197,94,.35)}
.confirm{font-size:12px;color:#cbd5e1;background:transparent;border:1px solid #f1f5f9;border-radius:10px;padding:10px 16px;cursor:pointer;width:100%}
</style></head><body>
<div class="dialog">
  <div class="icon">⚠️</div>
  <h2>确认取消自动续费？</h2>
  <p>取消后您将失去黄金会员全部特权，包括专属贴纸、无限关卡和每日礼包。</p>
  <button class="keep" onclick="__feedback('❌','点错啦！这是「继续会员」','#dc2626');__emit('page2_wrong')">💚 我再想想，继续会员</button>
  <button class="confirm" onclick="__feedback('🎉','太棒了！成功取消续费！','#16a34a');__emit('page2_correct')">确认取消</button>
</div>
${FEEDBACK}</body></html>`;

export function CancelSubscriptionGame() {
  const [session, setSession] = useState<CancelSubSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [stage, setStage] = useState<'page1' | 'page2' | 'done'>('page1');
  const [flash, setFlash] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  async function loadSession() {
    try {
      const r = await api.get('/course/cancel-sub');
      const next: CancelSubSession | null = r.data || null;
      setSession(next);
      if (next?.id !== sessionIdRef.current) {
        sessionIdRef.current = next?.id ?? null;
        setStage('page1');
        setFlash(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadSession();
    const t = setInterval(loadSession, 5000);
    return () => clearInterval(t);
  }, []);

  const reportEvent = useCallback(async (event: CancelSubEvent) => {
    try {
      await api.post('/course/cancel-sub/event', { event });
    } catch {}
  }, []);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e?.data?.type !== 'cancel-sub-event') return;
      const ev = e.data.event as CancelSubEvent;
      reportEvent(ev);
      if (ev === 'page1_correct') {
        setFlash('✅ 第一关找对啦！现在去点「确认取消」…');
        setTimeout(() => { setStage('page2'); setFlash(null); }, 1200);
      } else if (ev === 'page2_correct') {
        setFlash('🎉 全部完成！你成功取消了续费，没有被套路骗到！');
        setStage('done');
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [reportEvent]);

  if (!loaded) {
    return <div className="kid-card text-sm text-ink-soft">加载中…</div>;
  }

  if (!session?.active) {
    return (
      <div className="kid-card-orange text-center py-10">
        <div className="text-5xl mb-3">⏳</div>
        <div className="font-extrabold text-lg">老师还没开始「来取消续费吧」</div>
        <p className="text-sm text-ink-soft mt-1">请等老师在课堂控制台开启游戏并推送到你的屏幕。（会自动刷新）</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="kid-card-purple">
        <p className="text-sm font-semibold text-ink-soft leading-relaxed">
          💳 <b>来取消续费吧！</b>这是一个故意设计得很难用的「黄金会员」页面。你的任务是：<b>找到并点击「取消续费」</b>，然后在弹窗里点击<b>「确认取消」</b>。小心那些又大又显眼的按钮，它们都在骗你点错！
        </p>
      </div>

      {flash && (
        <div className="kid-card-mint text-center font-extrabold animate-pop">{flash}</div>
      )}

      <div className="flex gap-2">
        <span className={`kid-button-sm border-2 ${stage === 'page1' ? 'bg-brand text-white border-brand' : stage === 'done' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-ink-soft border-orange-200'}`}>
          ① 取消续费页
        </span>
        <span className={`kid-button-sm border-2 ${stage === 'page2' || stage === 'done' ? (stage === 'done' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-brand text-white border-brand') : 'bg-white text-ink-soft border-orange-200'}`}>
          ② 确认取消弹窗
        </span>
      </div>

      {stage === 'done' ? (
        <div className="kid-card-mint text-center py-8">
          <div className="text-5xl mb-3">🏆</div>
          <div className="font-extrabold text-xl text-emerald-800">挑战成功！</div>
          <p className="text-sm text-ink-soft mt-2">你从头到尾都选对了，没有被「垃圾交互」套路到！</p>
        </div>
      ) : (
        <div className="kid-card space-y-2">
          <div className="text-sm font-bold">
            {stage === 'page1' ? '👑 第 1 步：在黄金会员页面找到「取消续费」' : '⚠️ 第 2 步：在弹窗里点击「确认取消」'}
          </div>
          <HtmlPreview key={stage} html={stage === 'page1' ? PAGE1_HTML : PAGE2_HTML} height={520} />
        </div>
      )}
    </div>
  );
}

/** 教师端统计面板（嵌入课堂控制台） */
export interface CancelSubRecord {
  studentId: string;
  displayName: string;
  page1Errors: number;
  page2Errors: number;
  completed: boolean;
  stage: string;
}

export interface CancelSubSessionFull {
  id: string;
  active: boolean;
  createdAt: number;
  records: Record<string, CancelSubRecord>;
}

export function CancelSubTeacherStats({ session }: { session: CancelSubSessionFull | null }) {
  if (!session?.active) return null;

  const records = Object.values(session.records || {});
  const completed = records.filter((r) => r.completed);
  const perfect = completed.filter((r) => r.page1Errors === 0 && r.page2Errors === 0);
  const perfectRate = completed.length > 0 ? Math.round((perfect.length / completed.length) * 100) : 0;
  const totalP1 = records.reduce((s, r) => s + r.page1Errors, 0);
  const totalP2 = records.reduce((s, r) => s + r.page2Errors, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl bg-white border-2 border-orange-100 p-3 text-center">
          <div className="text-2xl font-extrabold text-brand">{records.length}</div>
          <div className="text-[11px] text-ink-soft font-bold">参与人数</div>
        </div>
        <div className="rounded-xl bg-white border-2 border-emerald-100 p-3 text-center">
          <div className="text-2xl font-extrabold text-emerald-600">{completed.length}</div>
          <div className="text-[11px] text-ink-soft font-bold">已完成</div>
        </div>
        <div className="rounded-xl bg-white border-2 border-violet-100 p-3 text-center">
          <div className="text-2xl font-extrabold text-violet-600">{perfectRate}%</div>
          <div className="text-[11px] text-ink-soft font-bold">全程正确率</div>
        </div>
        <div className="rounded-xl bg-white border-2 border-rose-100 p-3 text-center">
          <div className="text-2xl font-extrabold text-rose-500">{totalP1 + totalP2}</div>
          <div className="text-[11px] text-ink-soft font-bold">总误点次数</div>
        </div>
      </div>

      <div className="text-xs text-ink-soft">
        界面①误点 {totalP1} 次 · 界面②误点 {totalP2} 次 · 全程零失误 {perfect.length} 人
      </div>

      {records.length > 0 ? (
        <div className="overflow-auto max-h-64 rounded-xl border-2 border-orange-100">
          <table className="w-full text-sm">
            <thead className="bg-orange-50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-bold">小朋友</th>
                <th className="text-center px-2 py-2 font-bold">进度</th>
                <th className="text-center px-2 py-2 font-bold">①误点</th>
                <th className="text-center px-2 py-2 font-bold">②误点</th>
                <th className="text-center px-2 py-2 font-bold">结果</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const perfectRun = r.completed && r.page1Errors === 0 && r.page2Errors === 0;
                const stageLabel = r.stage === 'page1' ? '界面①' : r.stage === 'page2' ? '界面②' : '完成';
                return (
                  <tr key={r.studentId} className="border-t border-orange-50">
                    <td className="px-3 py-2 font-bold truncate max-w-[120px]">{r.displayName}</td>
                    <td className="text-center px-2 py-2 text-xs">{stageLabel}</td>
                    <td className="text-center px-2 py-2">{r.page1Errors}</td>
                    <td className="text-center px-2 py-2">{r.page2Errors}</td>
                    <td className="text-center px-2 py-2 text-xs font-bold">
                      {perfectRun ? '✅ 全程正确' : r.completed ? '⚠️ 有误点' : '…'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">还没有小朋友开始，推送游戏后数据会实时更新。</p>
      )}
    </div>
  );
}
