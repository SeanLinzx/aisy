'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { connectConsoleStream } from '@/lib/course-stream';
import type { GameProgressSession } from '@/lib/course-game-progress';
import type { SummarySession } from '@/lib/detective-summary';
import type { VideoRecognitionSession } from '@/lib/video-recognition';
import type { TuringConsoleState } from '@/lib/turing-session';
import type { ClassroomShowcase } from '@/lib/classroom-showcase';
import type { CampSongState } from '@/lib/camp-song';

export interface ConsoleClassroomState {
  active: boolean;
  teacherId: string;
  mode: 'game' | 'slides' | 'showcase';
  currentGame: string | null;
  slides: { url: string; name: string; page: number; kind?: 'pdf' | 'deck'; syncToStudents?: boolean } | null;
  showcase: ClassroomShowcase | null;
  campSong: CampSongState | null;
  students: string[];
  startedAt: number;
  updatedAt: number;
}

export interface ConsoleState {
  classroom: ConsoleClassroomState | null;
  cancelSub: any | null;
  groupGrab: any | null;
  gameProgress: GameProgressSession | null;
  summary: SummarySession | null;
  videoRecognition: VideoRecognitionSession | null;
  turing: TuringConsoleState | null;
  now: number;
}

const OPEN_POLL_MS = 20_000;
const CLOSED_POLL_MS = 3_000;

function toConsoleState(raw: Record<string, unknown>): ConsoleState {
  return {
    classroom: (raw.classroom as ConsoleClassroomState) ?? null,
    cancelSub: raw.cancelSub ?? null,
    groupGrab: raw.groupGrab ?? null,
    gameProgress: (raw.gameProgress as GameProgressSession) ?? null,
    summary: (raw.summary as SummarySession) ?? null,
    videoRecognition: (raw.videoRecognition as VideoRecognitionSession) ?? null,
    turing: { active: raw.turing ?? null, responses: raw.turingResponses ?? null } as TuringConsoleState,
    now: Date.now(),
  };
}

/**
 * 教师中控台：一条 SSE 长连接（/course/console/stream）替代 classroom /
 * 游戏进度 / 抢组 / 取消续费 / 总结问答 / 视频识别 / 图灵测试等一整套 3s 轮询。
 * 轮询仅作断线兜底，SSE 连通时自动降频到 20s。
 */
export function useTeacherConsole(games: string[], intervalMs = 3000) {
  const [state, setState] = useState<ConsoleState | null>(null);
  const [connected, setConnected] = useState(true);
  const gamesKey = games.join(',');
  const inflight = useRef(false);
  const streamOpenRef = useRef(false);

  useEffect(() => {
    let alive = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (inflight.current || document.hidden) return;
      inflight.current = true;
      try {
        const r = await api.get('/course/console', {
          params: gamesKey ? { games: gamesKey } : undefined,
        });
        if (alive) {
          setState((r.data as ConsoleState) || null);
          setConnected(true);
        }
      } catch {
        if (alive) setConnected(false);
      } finally {
        inflight.current = false;
      }
    }

    function schedulePoll() {
      if (pollTimer) clearInterval(pollTimer);
      const ms = streamOpenRef.current ? OPEN_POLL_MS : CLOSED_POLL_MS;
      pollTimer = setInterval(poll, ms);
    }

    void poll();
    schedulePoll();

    const streamPath = `/course/console/stream${gamesKey ? `?games=${encodeURIComponent(gamesKey)}` : ''}`;
    const disconnect = connectConsoleStream(streamPath, {
      onSnapshot: (snapshot) => {
        if (!alive) return;
        setState(toConsoleState(snapshot));
        setConnected(true);
      },
      onUpdate: (channel, data) => {
        if (!alive) return;
        setState((prev): ConsoleState => {
          const base = prev ?? toConsoleState({});
          if (channel === 'turing') return { ...base, turing: { active: data as any, responses: base.turing?.responses ?? null } };
          if (channel === 'turingResponses') return { ...base, turing: { active: base.turing?.active ?? null, responses: data as any } };
          return { ...base, [channel]: data };
        });
      },
      onStatus: (status) => {
        if (!alive) return;
        const open = status === 'open';
        if (open === streamOpenRef.current) return;
        streamOpenRef.current = open;
        schedulePoll();
      },
    });

    function onVisibility() {
      if (!document.hidden) void poll();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      alive = false;
      disconnect();
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [gamesKey, intervalMs]);

  return {
    state,
    connected,
    refresh: async () => {
      try {
        const r = await api.get('/course/console', {
          params: gamesKey ? { games: gamesKey } : undefined,
        });
        setState((r.data as ConsoleState) || null);
      } catch {}
    },
  };
}
