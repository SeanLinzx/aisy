export type CourseStreamStatus = 'connecting' | 'open' | 'closed';

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE || '/api').replace(/\/$/, '');
}

function isPing(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && (raw as { type?: string }).type === 'ping';
}

/**
 * 订阅单通道课堂/游戏状态 SSE（如 /course/classroom/stream）。
 * 断线自动重连（指数退避，最长 15s）；返回取消订阅函数。
 */
export function connectCourseChannel<T>(
  streamPath: string,
  opts: {
    onData: (data: T | null) => void;
    onStatus?: (status: CourseStreamStatus) => void;
  },
): () => void {
  let es: EventSource | null = null;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryMs = 1000;

  function connect() {
    if (closed) return;
    opts.onStatus?.('connecting');
    es = new EventSource(`${apiBase()}${streamPath}`, { withCredentials: true });

    es.onopen = () => {
      opts.onStatus?.('open');
      retryMs = 1000;
    };

    es.onmessage = (ev) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (isPing(parsed)) return;
      opts.onData((parsed as T) ?? null);
    };

    es.onerror = () => {
      opts.onStatus?.('closed');
      es?.close();
      es = null;
      if (!closed) {
        retryTimer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 15_000);
      }
    };
  }

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    es?.close();
    es = null;
  };
}

interface ConsoleStreamMessage {
  type: 'snapshot' | 'update' | 'ping';
  channel?: string;
  data?: unknown;
}

/**
 * 订阅教师中控台聚合 SSE（/course/console/stream）：
 * 一个长连接推送 classroom / gameProgress / cancelSub / groupGrab /
 * summary / videoRecognition / turing / turingResponses 全部变更。
 */
export function connectConsoleStream(
  streamPath: string,
  opts: {
    onSnapshot: (data: Record<string, unknown>) => void;
    onUpdate: (channel: string, data: unknown) => void;
    onStatus?: (status: CourseStreamStatus) => void;
  },
): () => void {
  let es: EventSource | null = null;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryMs = 1000;

  function connect() {
    if (closed) return;
    opts.onStatus?.('connecting');
    es = new EventSource(`${apiBase()}${streamPath}`, { withCredentials: true });

    es.onopen = () => {
      opts.onStatus?.('open');
      retryMs = 1000;
    };

    es.onmessage = (ev) => {
      let msg: ConsoleStreamMessage;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === 'ping') return;
      if (msg.type === 'snapshot') {
        opts.onSnapshot((msg.data as Record<string, unknown>) || {});
      } else if (msg.type === 'update' && msg.channel) {
        opts.onUpdate(msg.channel, msg.data ?? null);
      }
    };

    es.onerror = () => {
      opts.onStatus?.('closed');
      es?.close();
      es = null;
      if (!closed) {
        retryTimer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 15_000);
      }
    };
  }

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    es?.close();
    es = null;
  };
}
