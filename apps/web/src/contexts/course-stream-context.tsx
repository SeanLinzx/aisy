'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { connectConsoleStream } from '@/lib/course-stream';

const OPEN_POLL_MS = 30_000;
const CLOSED_POLL_MS = 2_000;

export type StudentStreamChannel = 'classroom' | 'groupGrab' | 'videoRecognition' | 'turing' | 'cancelSub';

interface StudentSnapshot {
  classroom: unknown;
  groupGrab: unknown;
  videoRecognition: unknown;
  turing: unknown;
  cancelSub: unknown;
}

interface CourseStreamContextValue {
  channels: Partial<StudentSnapshot>;
  loaded: boolean;
  streamOpen: boolean;
}

const CourseStreamContext = createContext<CourseStreamContextValue | null>(null);

/**
 * 学生端全局唯一的实时状态订阅：一个 SSE 长连接（/course/stream）覆盖
 * classroom / 抢组 / 视频识别 / 图灵测试 / 取消续费五个通道，挂在学生 Shell
 * 最外层，全应用只开这一条连接。机房场景下浏览器对同源 HTTP/1.1 并发连接数
 * 有限（通常 6 条），避免每个小游戏各自开一条 SSE 抢占连接、拖慢图片/视频加载。
 */
export function CourseStreamProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<Partial<StudentSnapshot>>({});
  const [loaded, setLoaded] = useState(false);
  const [streamOpen, setStreamOpen] = useState(false);
  const streamOpenRef = useRef(false);

  useEffect(() => {
    let alive = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const r = await api.get('/course/stream/snapshot');
        if (alive) setChannels((r.data as Partial<StudentSnapshot>) || {});
      } catch {
        /* 兜底轮询失败不清空已有状态，避免闪烁 */
      } finally {
        if (alive) setLoaded(true);
      }
    }

    function schedulePoll() {
      if (pollTimer) clearInterval(pollTimer);
      const ms = streamOpenRef.current ? OPEN_POLL_MS : CLOSED_POLL_MS;
      pollTimer = setInterval(poll, ms);
    }

    void poll();
    schedulePoll();

    const disconnect = connectConsoleStream('/course/stream', {
      onSnapshot: (snapshot) => {
        if (!alive) return;
        setChannels(snapshot as Partial<StudentSnapshot>);
        setLoaded(true);
      },
      onUpdate: (channel, data) => {
        if (!alive) return;
        setChannels((prev) => ({ ...prev, [channel]: data }));
      },
      onStatus: (status) => {
        if (!alive) return;
        const open = status === 'open';
        if (open === streamOpenRef.current) return;
        streamOpenRef.current = open;
        setStreamOpen(open);
        schedulePoll();
      },
    });

    return () => {
      alive = false;
      disconnect();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const value = useMemo(() => ({ channels, loaded, streamOpen }), [channels, loaded, streamOpen]);

  return <CourseStreamContext.Provider value={value}>{children}</CourseStreamContext.Provider>;
}

/**
 * 读取某个学生实时通道的数据。若没有 Provider（例如老师端），
 * 自动降级为独立的 REST 轮询，保证组件在任何布局下都能工作。
 */
export function useCourseStreamChannel<T>(channel: StudentStreamChannel, restPath: string) {
  const ctx = useContext(CourseStreamContext);
  const [fallbackData, setFallbackData] = useState<T | null>(null);
  const [fallbackLoaded, setFallbackLoaded] = useState(false);

  useEffect(() => {
    if (ctx) return; // 有 Provider 时不需要独立轮询
    let alive = true;
    async function poll() {
      try {
        const r = await api.get(restPath);
        if (alive) setFallbackData((r.data as T) ?? null);
      } catch {
        if (alive) setFallbackData(null);
      } finally {
        if (alive) setFallbackLoaded(true);
      }
    }
    void poll();
    const t = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [ctx, restPath]);

  if (!ctx) {
    return { data: fallbackData, loaded: fallbackLoaded, streamOpen: false };
  }

  return {
    data: (ctx.channels[channel] as T | undefined) ?? null,
    loaded: ctx.loaded,
    streamOpen: ctx.streamOpen,
  };
}
