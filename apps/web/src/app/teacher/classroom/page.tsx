'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { COURSE_LESSONS, THEME_GRADIENT } from '@/lib/course-config';
import { DetectiveDeckFrame } from '@/components/course/detective-deck-frame';
import { LESSON1_DETECTIVE_DECK, deckUrl, isDeckSlides } from '@/lib/course-deck';
import { PdfSinglePage } from '@/components/course/pdf-single-page';
import { CancelSubTeacherStats, type CancelSubSessionFull } from '@/components/course/games/cancel-subscription';
import { GroupGrabTeacherPanel, type GroupGrabSession } from '@/components/course/games/group-grab';
import { StudentWorksHub } from '@/components/course/student-works-hub';
import { GroupScoreboardPanel } from '@/components/course/group-scoreboard-panel';
import {
  TRACKED_CREATION_GAMES,
  isTrackedCreationGame,
  isVideoCreationGame,
  VIDEO_CREATION_GAMES,
} from '@/lib/course-game-progress';
import { useTeacherConsole, type ConsoleClassroomState } from '@/hooks/use-teacher-console';
import { isPadMode } from '@/lib/pad-mode';
import { cn } from '@/lib/cn';
import {
  showcaseFromProgress,
  showcaseFromSummary,
  type ClassroomShowcase,
} from '@/lib/classroom-showcase';
import { ClassroomShowcaseView } from '@/components/course/classroom-showcase-view';
import type { GameProgressRecord } from '@/lib/course-game-progress';
import type { SummaryStudentRecord } from '@/lib/detective-summary';

interface Student { id: string; displayName: string; username: string }

/** 中控台聚合轮询覆盖的全部创作游戏 */
const CONSOLE_GAMES = [...TRACKED_CREATION_GAMES];

export default function TeacherClassroomPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [grabClassId, setGrabClassId] = useState('');
  const [draftGroups, setDraftGroups] = useState([
    { name: 'AI 小侦探队', capacity: 6, emoji: '🕵️' },
    { name: '创意之星组', capacity: 6, emoji: '🌟' },
    { name: '未来探索者', capacity: 6, emoji: '🚀' },
  ]);
  const [scoreClassId, setScoreClassId] = useState('');
  const [pushingStudentId, setPushingStudentId] = useState<string | null>(null);

  // 单一聚合轮询：课堂状态 / 取消续费 / 抢组 / 创作进度 / 总结问答
  const { state: console_, connected, refresh } = useTeacherConsole(CONSOLE_GAMES);
  const state: ConsoleClassroomState | null = console_?.classroom ?? null;
  const cancelSub = (console_?.cancelSub ?? null) as CancelSubSessionFull | null;
  const groupGrab = (console_?.groupGrab ?? null) as GroupGrabSession | null;
  const gameProgress = console_?.gameProgress ?? null;
  const summary = console_?.summary ?? null;

  // 学生名单 / 班级列表变化频率低，只在进入页面时加载一次
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/users', { params: { role: 'student' } });
        setStudents(r.data || []);
      } catch {}
      try {
        const r = await api.get('/classes');
        setClasses(r.data || []);
        if (r.data?.[0]?.id) {
          setGrabClassId((prev) => prev || r.data[0].id);
          setScoreClassId((prev) => prev || r.data[0].id);
        }
      } catch {}
    })();
  }, []);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const allSelected = students.length > 0 && selectedIds.length === students.length;

  function toggleAll() {
    if (allSelected) setSelected({});
    else setSelected(Object.fromEntries(students.map((s) => [s.id, true])));
  }

  // 参与名单：全选时传 [] 表示「所有学生」
  function resolveStudents(): string[] {
    if (selectedIds.length === 0 || allSelected) return [];
    return selectedIds;
  }

  /** 包装课堂操作：统一 busy / 错误提示 / 操作后立即刷新聚合状态 */
  async function run(action: () => Promise<unknown>, failMsg: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || failMsg);
    } finally {
      setBusy(false);
    }
  }

  const start = () =>
    run(() => api.put('/course/classroom', { active: true, students: resolveStudents(), currentGame: null }), '开始上课失败');

  const pushGame = (slug: string | null) =>
    run(async () => {
      if (slug && isVideoCreationGame(slug)) {
        await Promise.all(
          VIDEO_CREATION_GAMES.map((gameSlug) =>
            api.post('/course/game-progress/reset', { gameSlug }).catch(() => {}),
          ),
        );
      } else if (slug && isTrackedCreationGame(slug)) {
        await api.post('/course/game-progress/reset', { gameSlug: slug }).catch(() => {});
      }
      if (slug === 'detective-summary') {
        await api.post('/course/summary/reset').catch(() => {});
      }
      await api.put('/course/classroom', { currentGame: slug, mode: 'game' });
    }, '推送失败');

  const uploadSlides = (file: File) =>
    run(async () => {
      const form = new FormData();
      form.append('file', file);
      const up = await api.post('/storage/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = up.data?.url;
      if (!url) throw new Error('上传失败');
      await api.put('/course/classroom', {
        active: true,
        mode: 'slides',
        slides: { url, name: file.name, page: 1, kind: 'pdf' },
      });
    }, '上传课件失败');

  const playLesson1Deck = () =>
    run(
      () =>
        api.put('/course/classroom', {
          active: true,
          mode: 'slides',
          currentGame: null,
          slides: {
            url: deckUrl('follow'),
            name: LESSON1_DETECTIVE_DECK.title,
            page: 1,
            kind: 'deck',
          },
        }),
      '启动互动课件失败',
    );

  function syncDeckPageFromIframe(page: number) {
    if (!state?.slides || !isDeckSlides(state.slides)) return;
    const next = Math.max(1, page);
    if (next === state.slides.page) return;
    api.put('/course/classroom', { slides: { ...state.slides, page: next } }).catch(() => {});
  }

  const playSlides = () => {
    if (!state?.slides) return;
    return run(() => api.put('/course/classroom', { mode: 'slides' }), '切换课件失败');
  };

  const flipPage = (delta: number) => {
    if (!state?.slides) return;
    const page = Math.max(1, state.slides.page + delta);
    return run(() => api.put('/course/classroom', { slides: { ...state.slides, page } }), '翻页失败');
  };

  const updateRoster = () => run(() => api.put('/course/classroom', { students: resolveStudents() }), '更新失败');
  const endClass = () => run(() => api.delete('/course/classroom'), '下课失败');

  const pushShowcase = (showcase: ClassroomShowcase) => {
    setPushingStudentId(showcase.studentId);
    return run(async () => {
      await api.put('/course/classroom', { showcase });
    }, '推送作品展示失败').finally(() => setPushingStudentId(null));
  };

  const pushShowcaseFromProgress = (record: GameProgressRecord) => {
    const showcase = showcaseFromProgress(record);
    if (!showcase) return;
    return pushShowcase(showcase);
  };

  const pushShowcaseFromSummary = (record: SummaryStudentRecord) => {
    const showcase = showcaseFromSummary(record);
    if (!showcase) return;
    return pushShowcase(showcase);
  };

  const endShowcase = () => run(() => api.put('/course/classroom', { showcase: null }), '结束展示失败');

  const startCancelSubGame = () =>
    run(async () => {
      await api.put('/course/cancel-sub');
      await api.put('/course/classroom', { currentGame: 'cancel-subscription', mode: 'game' });
    }, '开启游戏失败');
  const endCancelSubGame = () => run(() => api.delete('/course/cancel-sub'), '结束游戏失败');

  const setupGroupGrab = () =>
    run(async () => {
      const groups = draftGroups.filter((g) => g.name.trim());
      if (groups.length < 2) throw new Error('请至少填写 2 个小组名称');
      await api.put('/course/group-grab', { classId: grabClassId || undefined, groups });
    }, '保存小组设置失败');

  const startGroupGrab = () =>
    run(async () => {
      await api.post('/course/group-grab/start');
      await api.put('/course/classroom', { currentGame: 'group-grab', mode: 'game' });
    }, '开启抢组失败');

  const reassignGroupGrab = () => run(() => api.post('/course/group-grab/reassign'), '调剂失败');
  const closeGroupGrab = () => run(() => api.post('/course/group-grab/close'), '结束抢组失败');
  const syncGroupGrab = () => run(() => api.post('/course/group-grab/sync'), '同步失败');
  const clearGroupGrab = () => run(() => api.delete('/course/group-grab'), '重置失败');

  const manualAssignGroup = (studentId: string, groupId: string) =>
    run(() => {
      const student = students.find((s) => s.id === studentId);
      return api.post('/course/group-grab/assign', {
        studentId,
        groupId,
        displayName: student?.displayName,
      });
    }, '分配失败');

  const active = !!state?.active;
  const studentCount = state ? (state.students.length === 0 ? students.length : state.students.length) : 0;
  const fileRef = useRef<HTMLInputElement>(null);
  const isSlides = state?.mode === 'slides' && !!state?.slides;
  const isShowcase = state?.mode === 'showcase' && !!state?.showcase;
  const isDeck = isSlides && isDeckSlides(state?.slides);
  const rosterStudentIds = state?.students?.length ? state.students : students.map((s) => s.id);
  const pad = isPadMode();

  const currentLabel = isShowcase
    ? `🌟 展示 ${state?.showcase?.displayName} 的作品`
    : isSlides
      ? isDeck
        ? `🕵️ 互动课件《${state?.slides?.name}》第 ${state?.slides?.page} 页`
        : `📑 课件《${state?.slides?.name}》第 ${state?.slides?.page} 页`
      : state?.currentGame
        ? `🎮 ${gameTitle(state.currentGame)}`
        : '🏠 课程大厅';

  return (
    <div className={cn('space-y-5', pad ? 'max-w-none course-touch' : 'max-w-5xl')}>
      {!pad && (
        <header>
          <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">🎓 课堂控制台</h1>
          <p className="text-slate-600 mt-1 text-sm">
            开始上课后，点击任意游戏即可把全班小朋友的屏幕一起带到那个页面。学生作品按<strong>课程与游戏分类</strong>查看，可全屏浏览并推送给全班展示。上课期间学生会<strong>锁定跟课</strong>。
          </p>
        </header>
      )}

      {/* 置顶状态控制条：随页面滚动始终可见 */}
      <div className={cn(
        'sticky z-30 rounded-2xl border-2 shadow-md backdrop-blur px-4 py-3',
        pad ? 'top-0 py-4' : 'top-0',
        active ? 'bg-emerald-50/95 border-emerald-200' : 'bg-white/95 border-orange-100',
      )}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          {active ? (
            <div className={cn('font-bold flex items-center gap-2 flex-wrap', pad ? 'text-base' : 'text-sm')}>
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 正在上课
              </span>
              <span className="text-ink-soft">· 参与 {studentCount} 人 ·</span>
              <span className="text-ink">{currentLabel}</span>
            </div>
          ) : (
            <div className="text-sm font-bold text-ink-soft">⏸️ 还没开始上课 · 先选参与学生，再点「开始上课」。</div>
          )}
          <div className="flex gap-2 items-center">
            {!connected && (
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
                ⚠️ 连接不稳定，正在重试…
              </span>
            )}
            {active ? (
              <>
                {isShowcase && (
                  <button onClick={endShowcase} disabled={busy} className={cn('kid-button-sm bg-white border-2 border-amber-200 text-amber-700', pad && 'min-h-[48px] px-4 text-sm')}>
                    ✋ 结束展示
                  </button>
                )}
                <button onClick={() => pushGame(null)} disabled={busy} className={cn('kid-button-sm bg-white border-2 border-orange-200 text-ink-soft', pad && 'min-h-[48px] px-4 text-sm')}>🏠 回到大厅</button>
                <button onClick={endClass} disabled={busy} className={cn('kid-button-sm bg-white border-2 border-rose-200 text-rose-600', pad && 'min-h-[48px] px-4 text-sm')}>⏹️ 下课</button>
              </>
            ) : (
              <button onClick={start} disabled={busy || students.length === 0} className={cn('kid-button-primary', pad ? '!py-3 !px-6 text-base' : '!py-2 !px-4 text-sm')}>🚀 开始上课</button>
            )}
          </div>
        </div>
        {error && <div className="text-sm text-rose-600 mt-2">{error}</div>}
      </div>

      {/* ===== 学生实时看板（上课时置顶展示） ===== */}
      {active && isShowcase && state?.showcase && (
        <div className="kid-card-yellow space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-bold">📺 正在全班展示 · 邀请 {state.showcase.displayName} 分享</div>
            <button onClick={endShowcase} disabled={busy} className="kid-button-sm bg-white border-2 border-amber-200 text-amber-700">
              ✋ 结束展示，回到课堂
            </button>
          </div>
          <ClassroomShowcaseView showcase={state.showcase} variant="teacher" />
        </div>
      )}

      <StudentWorksHub
        active={active}
        currentGame={state?.currentGame ?? null}
        students={students}
        rosterIds={rosterStudentIds}
        gameProgress={gameProgress}
        summary={summary}
        onPushShowcase={pushShowcaseFromProgress}
        onPushSummary={pushShowcaseFromSummary}
        pushingStudentId={pushingStudentId}
      />

      {active && (
        <div className="kid-card-yellow space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="text-sm font-bold">🏆 课堂小组积分</div>
            <select
              className="kid-input max-w-[200px] !py-1.5 text-sm"
              value={scoreClassId}
              onChange={(e) => setScoreClassId(e.target.value)}
            >
              <option value="">选择班级</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <GroupScoreboardPanel classId={scoreClassId} compact title="快速加分" />
        </div>
      )}

      {/* 选择学生 */}
      <div className="kid-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold">👧 选择参与的小朋友（不选 = 全班）</div>
          <button onClick={toggleAll} className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft">{allSelected ? '全不选' : '全选'}</button>
        </div>
        <div className={cn('grid gap-2', pad ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4')}>
          {students.map((s) => {
            const on = !!selected[s.id];
            return (
              <button
                key={s.id}
                onClick={() => setSelected((p) => ({ ...p, [s.id]: !p[s.id] }))}
                className={cn(
                  'text-left rounded-2xl border-2 transition pad-student-tile',
                  on ? 'border-emerald-400 bg-emerald-50' : 'border-orange-100 bg-white',
                )}
              >
                <div className={cn('font-bold truncate', pad ? 'text-base' : 'text-sm')}>{on ? '✅ ' : ''}{s.displayName}</div>
                <div className="text-[11px] text-ink-soft truncate">@{s.username}</div>
              </button>
            );
          })}
          {students.length === 0 && <div className="text-sm text-slate-400 col-span-full">还没有学生账号，请先到「学生账号」创建。</div>}
        </div>
        {!active ? (
          <button onClick={start} disabled={busy} className="kid-button-primary">🚀 开始上课</button>
        ) : (
          <button onClick={updateRoster} disabled={busy} className="kid-button-ghost">🔄 更新参与名单</button>
        )}
      </div>

      {/* 第一课 · 抢组分队 */}
      <div className={`kid-card-mint space-y-3 ${active ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-sm font-bold">👯 第 1 课 · 抢组分队</div>
            <div className="text-xs text-ink-soft mt-0.5">输入多个小组名称，学生在自己电脑上抢位；满员或未抢到的可一键调剂。</div>
          </div>
          {groupGrab?.active && (
            <button onClick={() => pushGame('group-grab')} disabled={busy} className="kid-button-sm bg-white border-2 border-emerald-200 text-emerald-700">
              📲 再次推送给学生
            </button>
          )}
        </div>
        <GroupGrabTeacherPanel
          session={groupGrab}
          students={students}
          classes={classes}
          draftGroups={draftGroups}
          classId={grabClassId}
          busy={busy}
          onDraftChange={setDraftGroups}
          onClassIdChange={setGrabClassId}
          onSetup={setupGroupGrab}
          onStart={startGroupGrab}
          onReassign={reassignGroupGrab}
          onClose={closeGroupGrab}
          onSync={syncGroupGrab}
          onClear={clearGroupGrab}
          onManualAssign={manualAssignGroup}
        />
      </div>

      {/* 第一课互动课件 */}
      <div className={`kid-card-orange space-y-3 ${active ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-sm font-bold">🕵️ 第 1 课 · AI 小侦探互动课件</div>
            <div className="text-xs text-ink-soft mt-0.5">内置线索、测验、碎片收集；翻页后学生屏幕自动同步。</div>
          </div>
          <button onClick={playLesson1Deck} disabled={busy} className="kid-button-primary !py-2 !px-4 text-sm">
            ▶️ 向全班播放
          </button>
        </div>
        {isDeck && state?.slides ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => flipPage(-1)} disabled={busy || state.slides.page <= 1} className="kid-button-sm bg-white border-2 border-orange-200 disabled:opacity-50">⬅️ 上一页</button>
              <span className="tag">第 {state.slides.page} 页 · 同步中</span>
              <button onClick={() => flipPage(1)} disabled={busy} className="kid-button-sm bg-white border-2 border-orange-200">下一页 ➡️</button>
            </div>
            <DetectiveDeckFrame
              mode="present"
              page={state.slides.page}
              onPageChange={syncDeckPageFromIframe}
            />
          </div>
        ) : (
          <p className="text-sm text-ink-soft">点击「向全班播放」后，在这里演示完整第一节课；也可让学生课后从第 1 课入口自行复习。</p>
        )}
      </div>

      {/* PDF 课件播放面板 */}
      <div className={`kid-card space-y-3 ${active ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-bold">📑 课件同步播放（PPT 请先导出为 PDF）</div>
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft">⬆️ 上传 PDF</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSlides(f); e.target.value = ''; }}
            />
          </div>
        </div>
        {state?.slides && !isDeck ? (
          <div className="space-y-3">
            <div className="text-sm">已上传：<b>{state.slides.name}</b></div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => flipPage(-1)} disabled={busy || state.slides.page <= 1} className="kid-button-sm bg-white border-2 border-orange-200 disabled:opacity-50">⬅️ 上一页</button>
              <span className="tag">第 {state.slides.page} 页</span>
              <button onClick={() => flipPage(1)} disabled={busy} className="kid-button-sm bg-white border-2 border-orange-200">下一页 ➡️</button>
              {!isSlides && <button onClick={playSlides} disabled={busy} className="kid-button-primary !py-2 !px-4 text-sm">▶️ 切换到课件播放</button>}
              {isSlides && <span className="text-xs font-bold text-emerald-600">● 正在向学生播放</span>}
            </div>
            <PdfSinglePage
              key={`${state.slides.url}-${state.slides.page}`}
              url={state.slides.url}
              page={state.slides.page}
              className="min-h-[50vh] rounded-2xl border-2 border-orange-100 bg-white px-2 py-4"
            />
          </div>
        ) : !isDeck ? (
          <div className="text-sm text-slate-400">还没上传课件。上传 PDF 后即可翻页，学生屏幕会同步显示当前页。</div>
        ) : null}
      </div>

      {/* 「来取消续费吧」课堂游戏 */}
      <div className={`kid-card-purple space-y-3 ${active ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-sm font-bold">💳 来取消续费吧 · 垃圾交互挑战</div>
            <div className="text-xs text-ink-soft mt-0.5">开启后推送给学生，可实时查看各界面误点次数与全程正确率。</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!cancelSub?.active ? (
              <button onClick={startCancelSubGame} disabled={busy} className="kid-button-primary !py-2 !px-4 text-sm">
                🚀 开启并推送
              </button>
            ) : (
              <>
                <button onClick={() => pushGame('cancel-subscription')} disabled={busy} className="kid-button-sm bg-white border-2 border-violet-200 text-ink-soft">
                  📲 再次推送
                </button>
                <button onClick={endCancelSubGame} disabled={busy} className="kid-button-sm bg-white border-2 border-rose-200 text-rose-600">
                  ⏹️ 结束游戏
                </button>
              </>
            )}
          </div>
        </div>
        {cancelSub?.active && (
          <div className="text-xs font-bold text-violet-700">● 游戏进行中 · 学生应看到黄金会员取消续费页面</div>
        )}
        <CancelSubTeacherStats session={cancelSub} />
      </div>

      {/* 游戏推送面板 */}
      <div className={`space-y-4 ${active ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="text-sm font-bold text-ink-soft">🎮 点击一个游戏，推送到学生屏幕（会切换到游戏模式）：</div>
        {COURSE_LESSONS.map((lesson) => (
          <div key={lesson.slug} className="kid-card">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-9 h-9 rounded-2xl flex items-center justify-center text-lg text-white bg-gradient-to-br ${THEME_GRADIENT[lesson.color]}`}>{lesson.emoji}</span>
              <span className="font-extrabold">第 {lesson.index} 课 · {lesson.title}</span>
            </div>
            <div className={cn('grid gap-3', pad ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}>
              {lesson.games.map((g) => {
                const current = state?.currentGame === g.slug;
                return (
                  <button
                    key={g.slug}
                    onClick={() => pushGame(g.slug)}
                    className={cn(
                      'text-left rounded-2xl border-2 transition pad-game-btn',
                      current ? 'border-brand bg-orange-50 ring-2 ring-brand/30' : 'border-orange-100 bg-white hover:border-brand',
                    )}
                  >
                    <div className={cn('font-bold', pad ? 'text-base' : 'text-sm')}>{g.emoji} {g.title}{current ? ' · 学生在这里' : ''}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-ink-soft">
        提示：图灵测试的题目仍在 <Link href="/teacher/turing" className="text-brand underline">图灵测试出题</Link> 里准备；这里负责把学生屏幕带到对应游戏。
      </div>
    </div>
  );
}

function gameTitle(slug: string): string {
  for (const l of COURSE_LESSONS) {
    const g = l.games.find((x) => x.slug === slug);
    if (g) return g.title;
  }
  return slug;
}
