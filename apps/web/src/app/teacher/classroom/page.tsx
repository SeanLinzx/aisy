'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { api } from '@/lib/api';
import { COURSE_LESSONS, findGame, THEME_GRADIENT, THEME_CARD, type CourseGame } from '@/lib/course-config';
import { DetectiveDeckFrame } from '@/components/course/detective-deck-frame';
import { LESSON1_DETECTIVE_DECK, deckUrl, isDeckSlides } from '@/lib/course-deck';
import { PdfSinglePage } from '@/components/course/pdf-single-page';
import { CancelSubTeacherStats, type CancelSubSessionFull } from '@/components/course/games/cancel-subscription';
import { GroupGrabTeacherPanel, type GroupGrabSession } from '@/components/course/games/group-grab';
import { GroupScoreboardPanel } from '@/components/course/group-scoreboard-panel';
import { GameProgressTeacherPanel } from '@/components/course/game-progress-teacher-panel';
import { SummaryTeacherPanel } from '@/components/course/summary-teacher-panel';
import { VideoRecognitionTeacherPanel } from '@/components/course/video-recognition-teacher-panel';
import { TuringTeacherPanel } from '@/components/course/turing-teacher-panel';
import { TuringQuestionBank } from '@/components/course/turing-question-bank';
import { GameConsoleCard } from '@/components/course/game-console-card';
import { TeacherCourseOutlineBar } from '@/components/course/teacher-course-outline-bar';
import {
  TRACKED_CREATION_GAMES,
  isTrackedCreationGame,
  isVideoCreationGame,
  VIDEO_CREATION_GAMES,
  type TrackedCreationGame,
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
import { ReturnToStandbyFab } from '@/components/course/return-to-standby-fab';
import { CampSongFab } from '@/components/course/camp-song-fab';
import { SlidesSyncToggle } from '@/components/course/slides-sync-toggle';
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
  const [rosterClassId, setRosterClassId] = useState('');
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [grabClassId, setGrabClassId] = useState('');
  const [draftGroups, setDraftGroups] = useState([
    { name: 'AI 小侦探队', capacity: 6, emoji: '🕵️' },
    { name: '创意之星组', capacity: 6, emoji: '🌟' },
    { name: '未来探索者', capacity: 6, emoji: '🚀' },
  ]);
  const [scoreClassId, setScoreClassId] = useState('');
  const [turingPrepOpen, setTuringPrepOpen] = useState(false);
  const [pushingStudentId, setPushingStudentId] = useState<string | null>(null);
  /** 老师正在查看的课/任务（可与学生当前环节不同，推送后才同步） */
  const [viewLessonSlug, setViewLessonSlug] = useState(COURSE_LESSONS[0].slug);
  const [viewGameSlug, setViewGameSlug] = useState<string | null>(null);
  const lastPushedGameRef = useRef<string | null>(null);

  // 单一聚合轮询：课堂状态 / 取消续费 / 抢组 / 创作进度 / 总结问答
  const { state: console_, connected, refresh } = useTeacherConsole(CONSOLE_GAMES);
  const state: ConsoleClassroomState | null = console_?.classroom ?? null;
  const cancelSub = (console_?.cancelSub ?? null) as CancelSubSessionFull | null;
  const groupGrab = (console_?.groupGrab ?? null) as GroupGrabSession | null;
  const gameProgress = console_?.gameProgress ?? null;
  const summary = console_?.summary ?? null;
  const videoRecognition = console_?.videoRecognition ?? null;
  const turing = console_?.turing ?? null;

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

  useEffect(() => {
    if (!rosterClassId) {
      setClassStudents([]);
      return;
    }
    let alive = true;
    api
      .get(`/classes/${rosterClassId}`)
      .then((r) => {
        if (!alive) return;
        const members = (r.data?.members || [])
          .filter((m: { user: { role: string } }) => m.user.role === 'student')
          .map((m: { user: Student }) => m.user);
        setClassStudents(members);
      })
      .catch(() => {
        if (alive) setClassStudents([]);
      });
    return () => {
      alive = false;
    };
  }, [rosterClassId]);

  useEffect(() => {
    setSelected({});
  }, [rosterClassId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#turing-prep') {
      setTuringPrepOpen(true);
      requestAnimationFrame(() => {
        document.getElementById('turing-prep')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  useEffect(() => {
    const g = state?.currentGame ?? null;
    if (g && g !== lastPushedGameRef.current) {
      lastPushedGameRef.current = g;
      const found = findGame(g);
      if (found) {
        setViewLessonSlug(found.lesson.slug);
        setViewGameSlug(g);
      }
    }
    if (!g) lastPushedGameRef.current = null;
  }, [state?.currentGame]);

  useEffect(() => {
    const el = stickyNavRef.current;
    if (!el) return;
    const sync = () => setStickyNavHeight(el.offsetHeight);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rosterStudents = rosterClassId ? classStudents : students;
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const allSelected = rosterStudents.length > 0 && selectedIds.length === rosterStudents.length;

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = { ...prev };
        for (const s of rosterStudents) delete next[s.id];
        return next;
      });
    } else {
      setSelected((prev) => ({
        ...prev,
        ...Object.fromEntries(rosterStudents.map((s) => [s.id, true])),
      }));
    }
  }

  // 参与名单：[] = 全校学生（仅「全部学生」视图下）；选班级时必须传具体 ID
  function resolveStudents(): string[] {
    const rosterIds = rosterStudents.map((s) => s.id);
    if (rosterIds.length === 0) return [];

    const picked = selectedIds.filter((id) => rosterIds.includes(id));
    if (picked.length > 0 && picked.length < rosterIds.length) return picked;

    if (rosterClassId) return rosterIds;
    return [];
  }

  const resolvedRosterIds = useMemo(() => resolveStudents(), [rosterStudents, rosterClassId, selectedIds]);
  const resolvedRosterCount =
    resolvedRosterIds.length === 0 && !rosterClassId ? students.length : resolvedRosterIds.length;

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
      if (slug === 'video-detective') {
        await api.post('/course/video-recognition/reset').catch(() => {});
      }
      if (slug === 'turing-test') {
        await api.post('/course/turing/responses/reset').catch(() => {});
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
        slides: { url, name: file.name, page: 1, kind: 'pdf', syncToStudents: false },
        students: resolveStudents(),
      });
    }, '上传课件失败');

  const playLesson1Deck = () =>
    run(
      () =>
        api.put('/course/classroom', {
          active: true,
          mode: 'slides',
          currentGame: null,
          students: resolveStudents(),
          slides: {
            url: deckUrl('follow'),
            name: LESSON1_DETECTIVE_DECK.title,
            page: 1,
            kind: 'deck',
            syncToStudents: false,
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
    return run(
      () => api.put('/course/classroom', { mode: 'slides', slides: { ...state.slides!, syncToStudents: true } }),
      '切换课件失败',
    );
  };

  const setSlidesSync = (syncToStudents: boolean) => {
    if (!state?.slides) return;
    return run(
      () => api.put('/course/classroom', { slides: { ...state.slides!, syncToStudents } }),
      '更新同步设置失败',
    );
  };

  /** 结束游戏/作品展示，让学生回到黑板（课件同步页） */
  const returnToStandby = () =>
    run(async () => {
      await api.put('/course/classroom', {
        currentGame: null,
        showcase: null,
        mode: state?.slides?.url ? 'slides' : 'game',
      });
    }, '回到待机状态失败');

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

  const startCampSong = () =>
    run(
      () =>
        api.put('/course/classroom', {
          campSong: { active: true, startedAt: Date.now(), syncStudents: false },
        }),
      '播放营歌失败',
    );

  const setCampSongSync = (syncStudents: boolean) => {
    if (!state?.campSong?.active) return;
    return run(
      () =>
        api.put('/course/classroom', {
          campSong: { ...state.campSong!, syncStudents },
        }),
      '更新营歌同步失败',
    );
  };

  const stopCampSong = () => run(() => api.put('/course/classroom', { campSong: null }), '停止营歌失败');

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
  const studentCount = state
    ? state.students.length === 0
      ? students.length
      : state.students.length
    : resolvedRosterCount;
  const fileRef = useRef<HTMLInputElement>(null);
  const stickyNavRef = useRef<HTMLDivElement>(null);
  const [stickyNavHeight, setStickyNavHeight] = useState(152);
  const isSlides = state?.mode === 'slides' && !!state?.slides;
  const isShowcase = !!state?.showcase;
  const activeShowcaseStudentId = state?.showcase?.studentId ?? null;
  const isStandby = isSlides && !state?.currentGame && !isShowcase;
  const isDeck = isSlides && isDeckSlides(state?.slides);
  const rosterStudentIds = state?.students?.length ? state.students : students.map((s) => s.id);
  const pad = isPadMode();

  function focusGame(gameSlug: string, lessonSlug: string) {
    setViewLessonSlug(lessonSlug);
    setViewGameSlug(gameSlug);
  }

  function selectLesson(lessonSlug: string) {
    setViewLessonSlug(lessonSlug);
    const lesson = COURSE_LESSONS.find((l) => l.slug === lessonSlug);
    if (!lesson) return;
    setViewGameSlug((prev) => {
      if (prev && lesson.games.some((g) => g.slug === prev)) return prev;
      return lesson.games[0]?.slug ?? null;
    });
  }

  useEffect(() => {
    if (!active || viewGameSlug) return;
    const lesson = COURSE_LESSONS.find((l) => l.slug === viewLessonSlug);
    if (lesson?.games[0]) setViewGameSlug(lesson.games[0].slug);
  }, [active, viewLessonSlug, viewGameSlug]);

  const currentLabel = isShowcase
    ? `🌟 展示 ${state?.showcase?.displayName} 的作品`
    : isStandby
      ? isDeck
        ? `📺 待机 · 互动课件《${state?.slides?.name}》第 ${state?.slides?.page} 页`
        : `📺 待机 · 课件《${state?.slides?.name}》第 ${state?.slides?.page} 页`
      : state?.currentGame
        ? `🎮 ${gameTitle(state.currentGame)}`
        : state?.slides?.url
          ? '📺 待机（课件已就绪，学生暂未同步）'
          : '⏳ 等待推送';

  /** 游戏推送区：按 viewGameSlug 展开详情，可与学生当前环节不同。 */
  function renderGameCard(game: CourseGame, lessonSlug: string, opts?: { forceCompact?: boolean }) {
    const current = state?.currentGame === game.slug;
    const focused = viewGameSlug === game.slug;
    const compact = opts?.forceCompact || (active && !focused);
    const expand = () => focusGame(game.slug, lessonSlug);

    if (game.slug === 'group-grab') {
      if (compact) {
        return (
          <GameConsoleCard key={game.slug} game={game} current={current} isStandby={isStandby} busy={busy} onPush={() => pushGame(game.slug)} onExpand={expand} compact />
        );
      }
      return (
        <div
          key={game.slug}
          id="game-group-grab"
          className={cn(
            'rounded-2xl border-2 p-4 space-y-3',
            current ? 'border-brand bg-orange-50/50 ring-2 ring-brand/20' : 'border-emerald-100 bg-white',
          )}
          style={{ scrollMarginTop: 'var(--teacher-sticky-top, 9.5rem)' }}
        >
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold flex items-center gap-1.5 flex-wrap">
                <span>👯 {game.title}</span>
                {current && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">● 学生在这里</span>}
              </div>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed max-w-xl">{game.desc}</p>
            </div>
            {groupGrab?.active && (
              <button onClick={() => pushGame('group-grab')} disabled={busy} className="kid-button-sm bg-white border-2 border-emerald-200 text-emerald-700 shrink-0">
                📲 再次推送
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
      );
    }

    if (game.slug === 'cancel-subscription') {
      if (compact) {
        return (
          <GameConsoleCard key={game.slug} game={game} current={current} isStandby={isStandby} busy={busy} onPush={() => pushGame(game.slug)} onExpand={expand} compact />
        );
      }
      return (
        <div
          key={game.slug}
          id="game-cancel-subscription"
          className={cn(
            'rounded-2xl border-2 p-4 space-y-3',
            current ? 'border-brand bg-orange-50/50 ring-2 ring-brand/20' : 'border-violet-100 bg-white',
          )}
          style={{ scrollMarginTop: 'var(--teacher-sticky-top, 9.5rem)' }}
        >
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold flex items-center gap-1.5 flex-wrap">
                <span>💳 {game.title}</span>
                {current && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">● 学生在这里</span>}
              </div>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed max-w-xl">{game.desc}</p>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
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
      );
    }

    if (game.slug === 'detective-summary') {
      return (
        <GameConsoleCard
          key={game.slug}
          game={game}
          current={current}
          isStandby={isStandby}
          busy={busy}
          compact={compact}
          onPush={() => pushGame(game.slug)}
          onExpand={expand}
        >
          {focused && (
            <SummaryTeacherPanel
              students={students}
              rosterIds={rosterStudentIds}
              session={summary}
              onPushShowcase={pushShowcaseFromSummary}
              onEndShowcase={endShowcase}
              pushingStudentId={pushingStudentId}
              activeShowcaseStudentId={activeShowcaseStudentId}
            />
          )}
        </GameConsoleCard>
      );
    }

    if (game.slug === 'video-detective') {
      return (
        <GameConsoleCard
          key={game.slug}
          game={game}
          current={current}
          isStandby={isStandby}
          busy={busy}
          compact={compact}
          onPush={() => pushGame(game.slug)}
          onExpand={expand}
        >
          {focused && (
            <VideoRecognitionTeacherPanel
              students={students}
              rosterIds={rosterStudentIds}
              session={videoRecognition}
            />
          )}
        </GameConsoleCard>
      );
    }

    if (game.slug === 'turing-test') {
      return (
        <GameConsoleCard
          key={game.slug}
          game={game}
          current={current}
          isStandby={isStandby}
          busy={busy}
          compact={compact}
          onPush={() => pushGame(game.slug)}
          onExpand={expand}
        >
          {focused && (
            <TuringTeacherPanel
              students={students}
              rosterIds={rosterStudentIds}
              turing={turing}
              busy={busy}
              onRefresh={refresh}
              showQuestionBank={false}
            />
          )}
        </GameConsoleCard>
      );
    }

    const trackedSlug = isTrackedCreationGame(game.slug) ? (game.slug as TrackedCreationGame) : undefined;
    return (
      <GameConsoleCard
        key={game.slug}
        game={game}
        current={current}
        isStandby={isStandby}
        busy={busy}
        compact={compact}
        onPush={() => pushGame(game.slug)}
        onExpand={expand}
        disabled={game.status === 'placeholder'}
        footnote={
          !trackedSlug && game.status !== 'placeholder'
            ? '该游戏暂无实时统计面板，可推送后让学生完成。'
            : undefined
        }
      >
        {focused && trackedSlug && (
          <GameProgressTeacherPanel
            gameSlug={trackedSlug}
            students={students}
            rosterIds={rosterStudentIds}
            session={gameProgress}
            onPushShowcase={pushShowcaseFromProgress}
            onEndShowcase={endShowcase}
            pushingStudentId={pushingStudentId}
            activeShowcaseStudentId={activeShowcaseStudentId}
            wrapCard={false}
            maxGridHeight="max-h-[50vh]"
          />
        )}
      </GameConsoleCard>
    );
  }

  return (
    <div
      className={cn('space-y-5 w-full min-w-0', pad && 'course-touch')}
      style={{ '--teacher-sticky-top': `${stickyNavHeight}px` } as CSSProperties}
    >
      {!pad && (
        <header>
          <h1 className="font-display text-2xl font-extrabold flex items-center gap-2">🎓 课堂控制台</h1>
          <p className="text-slate-600 mt-1 text-sm">
            开始上课后，在上方大纲切换课/任务查看控制台，推送后学生才同步。待机时点击 <strong>▶️ 启动环节</strong> 把学生带到该活动。
          </p>
        </header>
      )}

      {/* 选择参与学生（置顶，可按班级筛选） */}
      <div className="kid-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold">
            👧 选择参与的小朋友
            <span className="text-ink-soft font-semibold ml-1">
              （{rosterClassId ? '不选 = 本班全员' : '不选 = 全校'} · 将参与 {resolvedRosterCount} 人）
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="kid-input max-w-[220px] !py-1.5 text-sm"
              value={rosterClassId}
              onChange={(e) => setRosterClassId(e.target.value)}
            >
              <option value="">全部学生</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button onClick={toggleAll} className="kid-button-sm bg-white border-2 border-orange-200 text-ink-soft">
              {allSelected ? '全不选' : '全选'}
            </button>
          </div>
        </div>
        {rosterClassId && classStudents.length === 0 && (
          <p className="text-xs text-amber-700 font-semibold">该班级还没有学生成员，请先到「班级管理」添加，或切换「全部学生」。</p>
        )}
        <div className={cn('grid gap-2', pad ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4')}>
          {rosterStudents.map((s) => {
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
                <div className={cn('font-bold truncate', pad ? 'text-base' : 'text-sm')}>
                  {on ? '✅ ' : ''}
                  {s.displayName}
                </div>
                <div className="text-[11px] text-ink-soft truncate">@{s.username}</div>
              </button>
            );
          })}
          {rosterStudents.length === 0 && (
            <div className="text-sm text-slate-400 col-span-full">还没有可选学生，请先到「学生账号」或「班级管理」添加。</div>
          )}
        </div>
        {!active ? (
          <button onClick={start} disabled={busy || rosterStudents.length === 0} className="kid-button-primary">
            🚀 开始上课
          </button>
        ) : (
          <button onClick={updateRoster} disabled={busy} className="kid-button-ghost">
            🔄 更新参与名单
          </button>
        )}
      </div>

      {/* 置顶：状态控制条 + 课程大纲导航，一起随页面滚动始终可见 */}
      <div ref={stickyNavRef} id="teacher-sticky-nav" className="sticky top-0 z-30 space-y-2">
        <div className={cn(
          'rounded-2xl border-2 shadow-md backdrop-blur px-4 py-3',
          pad ? 'py-4' : '',
          active && isStandby
            ? 'bg-violet-50/95 border-violet-200'
            : active
              ? 'bg-emerald-50/95 border-emerald-200'
              : 'bg-white/95 border-orange-100',
        )}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            {active ? (
              <div className={cn('font-bold flex items-center gap-2 flex-wrap', pad ? 'text-base' : 'text-sm')}>
                {isStandby ? (
                  <span className="inline-flex items-center gap-1.5 text-violet-700">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" /> 待机中
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 正在上课
                  </span>
                )}
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
                  {state?.currentGame && !isShowcase && !isStandby && (
                    <button
                      onClick={() => pushGame(state.currentGame)}
                      disabled={busy}
                      className={cn('kid-button-sm bg-white border-2 border-emerald-200 text-emerald-700', pad && 'min-h-[48px] px-4 text-sm')}
                    >
                      📲 再次推送
                    </button>
                  )}
                  {isShowcase && (
                    <button onClick={endShowcase} disabled={busy} className={cn('kid-button-sm bg-white border-2 border-amber-200 text-amber-700', pad && 'min-h-[48px] px-4 text-sm')}>
                      ✋ 结束展示
                    </button>
                  )}
                  <button onClick={endClass} disabled={busy} className={cn('kid-button-sm bg-white border-2 border-rose-200 text-rose-600', pad && 'min-h-[48px] px-4 text-sm')}>⏹️ 下课</button>
                </>
              ) : (
                <button
                  onClick={start}
                  disabled={busy || rosterStudents.length === 0}
                  className={cn('kid-button-primary', pad ? '!py-3 !px-6 text-base' : '!py-2 !px-4 text-sm')}
                >
                  🚀 开始上课
                </button>
              )}
            </div>
          </div>
          {error && <div className="text-sm text-rose-600 mt-2">{error}</div>}
        </div>

        <div className="rounded-2xl border-2 border-orange-100 bg-white/95 backdrop-blur shadow-sm px-3 py-2.5">
          <TeacherCourseOutlineBar
            currentGameSlug={state?.currentGame ?? null}
            viewLessonSlug={viewLessonSlug}
            viewGameSlug={viewGameSlug}
            onLessonSelect={selectLesson}
            onGameSelect={focusGame}
            pad={pad}
          />
        </div>
      </div>

      <section id="turing-prep" className="kid-card-purple space-y-3 scroll-mt-28" style={{ scrollMarginTop: 'var(--teacher-sticky-top, 9.5rem)' }}>
        <button
          type="button"
          onClick={() => setTuringPrepOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div>
            <div className="text-sm font-bold">🤖 图灵测试 · 课前准备</div>
            <div className="text-xs text-ink-soft mt-0.5">提前编辑待定题、生成 AI 回答；上课时可在下方「图灵测试小游戏」发布并查看作答。</div>
          </div>
          <span className="text-xs font-bold text-violet-700 shrink-0">{turingPrepOpen ? '收起 ▲' : '展开 ▼'}</span>
        </button>
        {turingPrepOpen && (
          <TuringQuestionBank
            activeSlotId={turing?.active?.slotId}
            activeQuestion={turing?.active?.question}
            onPublished={refresh}
          />
        )}
      </section>

      {/* ===== 学生实时看板（上课时置顶展示） ===== */}
      {active && isShowcase && state?.showcase && (
        <div className="kid-card-yellow space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-bold">📺 正在全班展示 · 邀请 {state.showcase.displayName} 分享（学生右侧浮窗，可继续自己的任务）</div>
            <button onClick={endShowcase} disabled={busy} className="kid-button-sm bg-white border-2 border-amber-200 text-amber-700">
              ✋ 结束展示，回到课堂
            </button>
          </div>
          <ClassroomShowcaseView showcase={state.showcase} variant="teacher" />
        </div>
      )}

      {active && isStandby && (
        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/80 px-4 py-3 text-sm font-semibold text-violet-800">
          📺 全班正在待机看课件。在下方选择环节并点击 <strong>▶️ 启动环节</strong>，即可把学生带到对应活动。
        </div>
      )}

      {/* ===== 当前课 · 环节推送与学生作品（嵌入当前场景） ===== */}
      {active && (
        <div className="space-y-4">
          {COURSE_LESSONS.map((lesson) => {
            const isExpandedLesson = lesson.slug === viewLessonSlug;
            if (!isExpandedLesson) {
              const hasLive = state?.currentGame ? lesson.games.some((g) => g.slug === state.currentGame) : false;
              return (
                <button
                  key={lesson.slug}
                  type="button"
                  id={`lesson-${lesson.slug}`}
                  onClick={() => selectLesson(lesson.slug)}
                  className={cn(THEME_CARD[lesson.color], 'w-full px-4 py-3 flex items-center justify-between gap-2 opacity-75 hover:opacity-100 transition text-left')}
                  style={{ scrollMarginTop: 'var(--teacher-sticky-top, 9.5rem)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base text-white bg-gradient-to-br ${THEME_GRADIENT[lesson.color]} shrink-0`}>{lesson.emoji}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">第 {lesson.index} 课 · {lesson.title}</div>
                      <div className="text-[11px] text-ink-soft">点击展开 · 共 {lesson.games.length} 个任务</div>
                    </div>
                  </div>
                  {hasLive && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0">● live</span>}
                </button>
              );
            }

            return (
              <div key={lesson.slug} id={`lesson-${lesson.slug}`} className={cn(THEME_CARD[lesson.color], 'space-y-3')} style={{ scrollMarginTop: 'var(--teacher-sticky-top, 9.5rem)' }}>
                <div className="flex items-center gap-2">
                  <span className={`w-9 h-9 rounded-2xl flex items-center justify-center text-lg text-white bg-gradient-to-br ${THEME_GRADIENT[lesson.color]} shrink-0`}>{lesson.emoji}</span>
                  <div>
                    <div className="font-extrabold">第 {lesson.index} 课 · {lesson.title}</div>
                    <div className="text-xs text-ink-soft mt-0.5">{lesson.goal}</div>
                  </div>
                </div>

                {lesson.slug === 'lesson1' && (
                  <div className="rounded-2xl border-2 border-orange-100 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-sm font-bold">🕵️ 第 1 课 · AI 小侦探互动课件</div>
                        <div className="text-xs text-ink-soft mt-0.5">内置线索、测验、碎片收集；老师先播放，打开「学生同步」后学生屏幕才跟随。</div>
                      </div>
                      <button onClick={playLesson1Deck} disabled={busy} className="kid-button-primary !py-2 !px-4 text-sm">
                        ▶️ 播放课件
                      </button>
                      {isDeck && state?.slides && (
                        <SlidesSyncToggle
                          syncToStudents={state.slides.syncToStudents !== false}
                          busy={busy}
                          onChange={setSlidesSync}
                        />
                      )}
                    </div>
                    {isDeck && state?.slides ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => flipPage(-1)} disabled={busy || state.slides.page <= 1} className="kid-button-sm bg-white border-2 border-orange-200 disabled:opacity-50">⬅️ 上一页</button>
                          <span className="tag">
                            第 {state.slides.page} 页
                            {state.slides.syncToStudents !== false ? ' · 学生同步中' : ' · 仅老师播放'}
                          </span>
                          <button onClick={() => flipPage(1)} disabled={busy} className="kid-button-sm bg-white border-2 border-orange-200">下一页 ➡️</button>
                        </div>
                        <DetectiveDeckFrame mode="present" page={state.slides.page} onPageChange={syncDeckPageFromIframe} />
                      </div>
                    ) : (
                      <p className="text-sm text-ink-soft">点击「播放课件」后，在这里演示；准备好再打开「学生同步」。</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {lesson.games.map((g) => renderGameCard(g, lesson.slug))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 未上课时预览全部环节 */}
      {!active && (
        <div className="space-y-4 opacity-50 pointer-events-none">
          {COURSE_LESSONS.map((lesson) => (
            <div key={lesson.slug} id={`lesson-${lesson.slug}`} className={cn(THEME_CARD[lesson.color], 'space-y-3')}>
              <div className="flex items-center gap-2">
                <span className={`w-9 h-9 rounded-2xl flex items-center justify-center text-lg text-white bg-gradient-to-br ${THEME_GRADIENT[lesson.color]} shrink-0`}>{lesson.emoji}</span>
                <div>
                  <div className="font-extrabold">第 {lesson.index} 课 · {lesson.title}</div>
                  <div className="text-xs text-ink-soft mt-0.5">{lesson.goal}</div>
                </div>
              </div>
              <div className="space-y-2">
                {lesson.games.map((g) => renderGameCard(g, lesson.slug))}
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* PDF 课件播放面板（通用工具，不挂在具体某节课下） */}
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
              <SlidesSyncToggle
                syncToStudents={state.slides.syncToStudents !== false}
                busy={busy}
                onChange={setSlidesSync}
              />
              {!isSlides && (
                <button onClick={playSlides} disabled={busy} className="kid-button-primary !py-2 !px-4 text-sm">
                  ▶️ 播放课件
                </button>
              )}
              {isSlides && state.slides.syncToStudents !== false && (
                <span className="text-xs font-bold text-emerald-600">● 学生同步中</span>
              )}
              {isSlides && state.slides.syncToStudents === false && (
                <span className="text-xs font-bold text-orange-600">● 仅老师播放</span>
              )}
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

      <div className="text-xs text-ink-soft">
        提示：图灵测试可在上方「课前准备」编辑待定题，在「图灵测试小游戏」卡片内发布并查看现场作答。
      </div>

      <ReturnToStandbyFab
        active={active}
        isStandby={isStandby}
        busy={busy}
        hasSlides={!!state?.slides?.url}
        onReturn={returnToStandby}
        pad={pad}
      />

      <CampSongFab
        active={active}
        campSong={state?.campSong ?? null}
        busy={busy}
        pad={pad}
        onStart={startCampSong}
        onStop={stopCampSong}
        onSetSyncStudents={setCampSongSync}
      />
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
