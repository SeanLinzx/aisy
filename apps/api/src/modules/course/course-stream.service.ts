import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

const HEARTBEAT_MS = 25_000;

/**
 * 课堂 / 游戏所有可实时推送的状态通道。
 * 对应 course.service.ts 里各自的 SystemConfig key。
 */
export type CourseChannel =
  | 'classroom'
  | 'gameProgress'
  | 'cancelSub'
  | 'groupGrab'
  | 'summary'
  | 'videoRecognition'
  | 'turing'
  | 'turingResponses';

interface ChannelEvent {
  channel: CourseChannel;
  data: unknown;
}

/**
 * 通用课堂状态推送中心：CourseService 写入后调用 publish()，
 * Controller 通过 observe()/observeMany() 暴露成 SSE 端点。
 * 单实例进程内广播；多实例部署需换成 Redis pub/sub。
 */
@Injectable()
export class CourseStreamService {
  private readonly bus = new Subject<ChannelEvent>();
  private readonly latest = new Map<CourseChannel, unknown>();

  publish(channel: CourseChannel, data: unknown): void {
    this.latest.set(channel, data);
    this.bus.next({ channel, data });
  }

  /** 单通道 SSE：连接建立时先发当前值，之后只推送该通道的变更；含心跳保活 */
  observe(channel: CourseChannel, getInitial: () => Promise<unknown>): Observable<MessageEvent> {
    return new Observable((observer) => {
      let alive = true;
      const push = (data: unknown) => {
        if (alive) observer.next({ data: JSON.stringify(data) });
      };

      void getInitial().then((initial) => {
        if (!alive) return;
        push(this.latest.has(channel) ? this.latest.get(channel) : initial);
      });

      const sub = this.bus.subscribe((evt) => {
        if (evt.channel === channel) push(evt.data);
      });

      const heartbeat = setInterval(() => {
        if (alive) observer.next({ data: JSON.stringify({ type: 'ping' }) });
      }, HEARTBEAT_MS);

      return () => {
        alive = false;
        sub.unsubscribe();
        clearInterval(heartbeat);
      };
    });
  }

  /**
   * 多通道聚合 SSE（教师中控台）：连接建立时发一次全量快照
   * `{ type: 'snapshot', data: {...} }`，之后每次某通道变更推一条
   * `{ type: 'update', channel, data }`，一个长连接替代多个轮询接口。
   */
  observeMany(
    channels: CourseChannel[],
    getSnapshot: () => Promise<Partial<Record<CourseChannel, unknown>>>,
  ): Observable<MessageEvent> {
    return new Observable((observer) => {
      let alive = true;
      const wanted = new Set(channels);

      void getSnapshot().then((snapshot) => {
        if (!alive) return;
        const merged: Partial<Record<CourseChannel, unknown>> = { ...snapshot };
        for (const ch of channels) {
          if (this.latest.has(ch)) merged[ch] = this.latest.get(ch);
        }
        observer.next({ data: JSON.stringify({ type: 'snapshot', data: merged }) });
      });

      const sub = this.bus.subscribe((evt) => {
        if (!alive || !wanted.has(evt.channel)) return;
        observer.next({ data: JSON.stringify({ type: 'update', channel: evt.channel, data: evt.data }) });
      });

      const heartbeat = setInterval(() => {
        if (alive) observer.next({ data: JSON.stringify({ type: 'ping' }) });
      }, HEARTBEAT_MS);

      return () => {
        alive = false;
        sub.unsubscribe();
        clearInterval(heartbeat);
      };
    });
  }
}
